import React from 'react'
import api from '../../services/api'
import rankColors from '../../utils/rankColors'
import { stripHtml } from '../../utils/stripHtml'
import ReplyEditor from './ReplyEditor'
import CVSection from './CVSection'
import StructuredDescription from './StructuredDescription'
import { beautifyLead, parseBeautifiedData } from '../../services/aiBeautifier'

const APP_STATUS_COLORS = {
  not_attempted: { bg: 'bg-gray-100', text: 'text-gray-600' },
  draft_ready: { bg: 'bg-amber-100', text: 'text-amber-700' },
  applied: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  contacted: { bg: 'bg-blue-100', text: 'text-blue-700' },
  contact_unavailable: { bg: 'bg-slate-100', text: 'text-slate-600' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
  submitted: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  review: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

export default function LeadDetail({ lead, onClose, onUpdate }) {
  const [reply, setReply] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [beautifying, setBeautifying] = React.useState(false)
  const [beautified, setBeautified] = React.useState(null)
  const [configs, setConfigs] = React.useState([])

  const [extracting, setExtracting] = React.useState(false)
  const [osintResult, setOsintResult] = React.useState(null)
  const [drafting, setDrafting] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [emailDraft, setEmailDraft] = React.useState(null)
  const [contactInfo, setContactInfo] = React.useState({
    email: lead.contact_email || null,
    phone: lead.contact_phone || null,
    source: lead.contact_source || null,
  })
  const [sendResult, setSendResult] = React.useState(null)

  const [dmFinding, setDmFinding] = React.useState(false)
  const [dmCandidates, setDmCandidates] = React.useState([])
  const [selectedCandidate, setSelectedCandidate] = React.useState(null)
  const [dmDraft, setDmDraft] = React.useState(lead.linkedin_connection_note || null)
  const [dmDrafting, setDmDrafting] = React.useState(false)
  const [dmSending, setDmSending] = React.useState(false)
  const [dmSearched, setDmSearched] = React.useState(false)
  const [manualContact, setManualContact] = React.useState({ name: lead.linkedin_contact_name || '', title: lead.linkedin_contact_title || '', url: lead.linkedin_contact_url || '' })
  const [dmNote, setDmNote] = React.useState(null)
  const [savingManual, setSavingManual] = React.useState(false)
  const [dmSpares, setDmSpares] = React.useState([])
  const [sparesLoading, setSparesLoading] = React.useState(false)
  const [autoApplying, setAutoApplying] = React.useState(false)
  const [autoApplyResult, setAutoApplyResult] = React.useState(null)
  const [applySeconds, setApplySeconds] = React.useState(0)

  React.useEffect(() => {
    setAutoApplyResult(null)
    setAutoApplying(false)
  }, [lead.id])

  React.useEffect(() => {
    let timer
    if (autoApplying) {
      setApplySeconds(0)
      timer = setInterval(() => {
        setApplySeconds((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(timer)
    }
    return () => clearInterval(timer)
  }, [autoApplying])

  const formatTime = (secs) => {
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  const [rankMenuOpen, setRankMenuOpen] = React.useState(false)
  const [localRank, setLocalRank] = React.useState(lead.rank)
  const rankRef = React.useRef(null)
  React.useEffect(() => { setLocalRank(lead.rank) }, [lead.id, lead.rank])
  const colors = rankColors[localRank] || rankColors.Unknown
  const appColors = APP_STATUS_COLORS[lead.application_status] || APP_STATUS_COLORS.not_attempted
  const cleanTitle = stripHtml(lead.title)
  const cleanDescription = stripHtml(lead.description)
  const isLinkedInJob = lead.url && lead.url.includes('linkedin.com/jobs/view/')

  const [originalDescription, setOriginalDescription] = React.useState(null)
  const [descExpanded, setDescExpanded] = React.useState(false)

  const [contactLocked, setContactLocked] = React.useState(!!lead.linkedin_contact_url)
  const [connectSending, setConnectSending] = React.useState(false)
  const [connectResult, setConnectResult] = React.useState(null)

  React.useEffect(() => {
    if (!rankMenuOpen) return
    const handler = (e) => { if (rankRef.current && !rankRef.current.contains(e.target)) setRankMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [rankMenuOpen])

  const parseRawStructuredText = (text) => {
    if (!text || !text.includes(':')) return null
    const keys = ['Title', 'Company', 'Skills', 'Contact', 'Budget', 'Requirements', 'Benefits', 'Location']
    const data = {}
    let foundKeys = 0
    keys.forEach((key, index) => {
      const nextKeys = keys.slice(index + 1).join('|')
      const regex = new RegExp(`${key}:\\s*(.*?)(?=\\s*(?:${nextKeys}):|$)`, 's')
      const match = text.match(regex)
      if (match && match[1]) {
        data[key] = match[1].trim()
        foundKeys++
      }
    })
    return foundKeys > 2 ? data : null
  }

  React.useEffect(() => {
    api.get('/ai/config').then(res => setConfigs(res.data)).catch(console.error)
    const autoParsed = parseRawStructuredText(lead.description)
    if (autoParsed) setBeautified(autoParsed)
    api.get('/replies/', { params: { lead_id: lead.id } })
      .then(r => { if (r.data.length) setReply(r.data[0]) })
      .catch(() => {})
  }, [lead.id])

  const handleBeautify = async () => {
    setBeautifying(true)
    setOriginalDescription(cleanDescription)
    try {
      const raw = await beautifyLead(cleanDescription, configs)
      const parsed = parseBeautifiedData(raw)
      setBeautified(parsed)
      await autoSaveBeautified(parsed)
    } catch (e) {
      setOriginalDescription(null)
      alert(e.message)
    } finally {
      setBeautifying(false)
    }
  }

  const autoSaveBeautified = async (data) => {
    if (!data) return
    const formatted = Object.entries(data).map(([k,v]) => `${k}: ${v}`).join('\n')
    try {
      await api.patch(`/leads/${lead.id}`, { description: formatted })
      onUpdate()
    } catch (e) {
      console.error('Auto-save failed:', e)
    }
  }

  const generateDraft = async () => {
    setLoading(true)
    try {
      const res = await api.post('/replies/generate', { lead_id: lead.id })
      setReply(res.data)
    } catch (e) {
      alert('Failed to generate draft: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleExtractContact = async () => {
    setExtracting(true)
    setSendResult(null)
    setOsintResult(null)
    try {
      const res = await api.post(`/automation/${lead.id}/extract-contact`)
      const data = res.data
      setContactInfo({
        email: data.email,
        phone: data.phone,
        source: data.source,
      })
      setOsintResult(data)
      if (!data.email && !data.phone && lead.application_status !== 'contact_unavailable') {
        await api.patch(`/leads/${lead.id}`, { application_status: 'contact_unavailable' })
      }
      if (data.email || data.phone) {
        onUpdate()
      }
    } catch (e) {
      alert('Contact extraction failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setExtracting(false)
    }
  }

  const handleDraftEmail = async () => {
    setDrafting(true)
    setSendResult(null)
    try {
      const res = await api.post(`/automation/${lead.id}/draft-email`)
      setEmailDraft(res.data)
    } catch (e) {
      alert('Draft failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setDrafting(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailDraft) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await api.post(`/automation/${lead.id}/send-email`, {
        lead_id: lead.id,
        subject: emailDraft.subject,
        body: emailDraft.body,
      })
      setSendResult(res.data)
      if (res.data.status === 'sent') {
        onUpdate()
      }
    } catch (e) {
      setSendResult({ status: 'failed', message: e.response?.data?.detail || e.message })
    } finally {
      setSending(false)
    }
  }

  const handleAutoApply = async () => {
    setAutoApplying(true)
    setAutoApplyResult(null)
    try {
      const res = await api.post('/automation/auto-apply', { lead_id: lead.id })
      const data = res.data
      setAutoApplyResult(data)
      if (data.status === 'success') {
        alert('Auto-apply completed successfully!')
      } else if (data.status === 'review') {
        alert('Application filled out. Review it in the browser window and submit manually.')
      } else {
        alert('Auto-apply failed: ' + (data.message || data.error || 'Unknown error'))
      }
      onUpdate()
    } catch (e) {
      const msg = e.response?.data?.detail || e.message
      alert('Auto-apply failed: ' + msg)
      setAutoApplyResult({ status: 'failed', message: msg })
    } finally {
      setAutoApplying(false)
    }
  }

  const handleLinkedInAutoFill = async () => {
    setLoading(true)
    try {
      const res = await api.post(`/automation/${lead.id}/auto-fill-linkedin`)
      alert(res.data.message)
      onUpdate()
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleMarkApplied = async () => {
    try {
      await api.post(`/automation/${lead.id}/mark-applied`)
      setSendResult({ status: 'confirmed' })
      onUpdate()
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || e.message))
    }
  }

  const handleFindHiringManager = async () => {
    setDmFinding(true)
    setDmCandidates([])
    setSelectedCandidate(null)
    setDmDraft(null)
    setDmSearched(false)
    setDmNote(null)
    try {
      const res = await api.post(`/automation/${lead.id}/find-hiring-manager`)
      const data = res.data
      const list = Array.isArray(data) ? data : (data.candidates || [])
      setDmCandidates(list)
      if (!Array.isArray(data) && data.note) {
        setDmNote(data.note)
      }
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setDmFinding(false)
      setDmSearched(true)
    }
  }

  const handleSelectCandidate = (c) => {
    setSelectedCandidate(c)
    setDmDraft(null)
  }

  const handleSaveCandidate = async (candidate) => {
    const c = candidate || selectedCandidate
    if (!c?.name || !c?.profile_url) return
    try {
      const spareCandidates = dmCandidates.filter(
        cand => cand.profile_url !== c.profile_url
      )
      await api.post(`/automation/${lead.id}/save-linkedin-contact`, {
        ...c,
        spare_candidates: spareCandidates,
      })
      setSelectedCandidate(c)
      setContactLocked(true)
    } catch (e) {
      console.error('Failed to save contact', e)
    }
  }

  const handleDraftLinkedInDm = async () => {
    if (!selectedCandidate && !lead.linkedin_contact_url) return
    setDmDrafting(true)
    try {
      const res = await api.post(`/automation/${lead.id}/draft-linkedin-dm`)
      setDmDraft(res.data.body)
      setConnectResult(null)
    } catch (e) {
      alert('Failed to draft DM: ' + (e.response?.data?.detail || e.message))
    } finally {
      setDmDrafting(false)
    }
  }

  const handleSaveManualContact = async () => {
    if (!manualContact.name.trim() || !manualContact.url.trim()) return
    setSavingManual(true)
    try {
      await api.post(`/automation/${lead.id}/save-linkedin-contact`, {
        name: manualContact.name,
        title: manualContact.title,
        profile_url: manualContact.url,
        source: 'manual',
      })
      setSelectedCandidate({ name: manualContact.name, title: manualContact.title, profile_url: manualContact.url, source: 'manual' })
      setContactLocked(true)
      onUpdate()
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSavingManual(false)
    }
  }

  const handleChangeContact = async () => {
    setContactLocked(false)
    setDmCandidates([])
    setSelectedCandidate(null)
    setDmDraft(null)
    setDmSearched(false)
    setSparesLoading(true)
    try {
      const res = await api.get(`/automation/${lead.id}/spare-candidates`)
      setDmSpares(res.data || [])
    } catch (e) {
      console.error('Failed to load spare candidates', e)
      setDmSpares([])
    } finally {
      setSparesLoading(false)
    }
  }

  const handleUseSpare = async (spare) => {
    try {
      await api.post(`/automation/${lead.id}/save-linkedin-contact`, {
        name: spare.name,
        title: spare.title || '',
        profile_url: spare.profile_url,
        source: spare.source || 'spare',
      })
      setSelectedCandidate({ name: spare.name, title: spare.title, profile_url: spare.profile_url, source: spare.source || 'spare' })
      setContactLocked(true)
    } catch (e) {
      console.error('Failed to use spare', e)
    }
  }

  const handleSendLinkedInDm = async () => {
    setDmSending(true)
    try {
      const res = await api.post(`/automation/${lead.id}/send-linkedin-dm`, { message: dmDraft })
      alert(res.data.message)
      onUpdate()
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setDmSending(false)
    }
  }

  // const handleSendConnect = async () => {
  //   if (!dmDraft) return
  //   setConnectSending(true)
  //   setConnectResult(null)
  //   try {
  //     const res = await api.post(`/automation/${lead.id}/send-linkedin-connect`, { message: dmDraft })
  //     setConnectResult({ status: 'sent', message: 'Connection request sent' })
  //     onUpdate()
  //   } catch (e) {
  //     setConnectResult({ status: 'failed', message: e.response?.data?.detail || e.message })
  //   } finally {
  //     setConnectSending(false)
  //   }
  // }

  const handleCopyLinkedInDm = () => {
    if (dmDraft) navigator.clipboard.writeText(dmDraft)
  }

  return (
    <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between p-4 border-b-[3px] border-black bg-[#f5f0eb]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rotate-45" />
          <h2 className="text-xs font-black uppercase tracking-widest">Prospect Intelligence</h2>
        </div>
        <button onClick={onClose} className="w-7 h-7 bg-white border-[2px] border-black flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-500 hover:text-orange-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-2xl font-black text-gray-900 leading-tight">{cleanTitle}</h3>
            <button
              onClick={handleBeautify}
              disabled={beautifying}
              className="flex-shrink-0 bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              {beautifying ? (
                <div className="w-4 h-4 border-[2px] border-white/30 border-t-white animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              {beautifying ? 'Thinking...' : 'Beautify AI'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <div className="relative" ref={rankRef}>
              <button onClick={() => setRankMenuOpen(v => !v)}
                className={`px-3 py-1 border-[2px] border-black text-xs font-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${colors.bg} ${colors.text} flex items-center gap-1 cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all`}>
                {localRank}
                <svg className={`w-3 h-3 transition-transform ${rankMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {rankMenuOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 min-w-[130px]">
                  {Object.entries(rankColors).map(([rank, c]) => (
                    <button key={rank} onClick={async () => {
                      setRankMenuOpen(false)
                      if (rank === localRank) return
                      setLocalRank(rank)
                      try {
                        await api.patch(`/leads/${lead.id}`, { rank })
                        onUpdate()
                      } catch (e) {
                        setLocalRank(localRank)
                        alert('Failed to update rank: ' + (e.response?.data?.detail || e.message))
                      }
                    }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${rank === localRank ? `${c.bg} ${c.text}` : 'text-gray-600 hover:bg-gray-50'}`}>
                      {rank === localRank && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      {rank !== localRank && <span className="w-3"></span>}
                      {rank}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="bg-white border-[2px] border-black text-gray-600 px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{lead.platform}</span>
            {lead.budget_raw && <span className="bg-emerald-500 text-white border-[2px] border-black px-3 py-1 text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{lead.budget_raw}</span>}
            <span className={`px-3 py-1 border-[2px] border-black text-xs font-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${appColors.bg} ${appColors.text}`}>
              {lead.application_status?.replace(/_/g, ' ') || 'not attempted'}
            </span>
          </div>

          {beautified ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(beautified).map(([key, value]) => (
                  <div key={key} className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all group">
                    <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">{key}</h4>
                    <p className="text-sm text-gray-700 font-bold leading-snug">
                      {key === 'Skills' ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {value.split(',').map(s => <span key={s} className="bg-orange-500 text-white border-[2px] border-black px-2 py-0.5 text-[10px] font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{s.trim()}</span>)}
                        </div>
                      ) : value}
                    </p>
                  </div>
                ))}
              </div>
              {originalDescription && (
                <div className="border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <button onClick={() => setDescExpanded(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-black text-gray-600 uppercase tracking-wider">
                    <span>Original Description</span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${descExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {descExpanded && (
                    <div className="px-4 py-3 text-sm text-gray-600 font-bold leading-relaxed whitespace-pre-wrap border-t-[3px] border-black">
                      {originalDescription}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border-[3px] border-black p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <StructuredDescription text={cleanDescription} />
            </div>
          )}
        </div>

        <div className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xs font-bold text-gray-500 space-y-2">
          <div className="flex justify-between items-center">
            <span className="uppercase tracking-wider text-[10px] text-gray-400">Prospect Identity</span>
            <span className="text-gray-900 font-black">@{lead.author || 'Anonymous'}</span>
          </div>
          <div className="flex justify-between items-center border-t-[2px] border-black pt-2">
            <span className="uppercase tracking-wider text-[10px] text-gray-400">Timeline</span>
            <span className="text-gray-900 font-black">{lead.timestamp ? new Date(lead.timestamp).toLocaleString() : 'Recently'}</span>
          </div>
          <div className="flex justify-between items-center border-t-[2px] border-black pt-2">
            <span className="uppercase tracking-wider text-[10px] text-gray-400">Direct Access</span>
            <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-black hover:underline">Original Source &rarr;</a>
          </div>
        </div>

        {/* CV & Cover Letter Section */}
        <CVSection lead={lead} />

        {/* Outreach Section */}
        <div className="bg-[#222222] border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-[3px] border-black">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rotate-45" />
              <div>
                <h4 className="text-base font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Bebas Neue', cursive" }}>Outreach</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {isLinkedInJob ? 'LinkedIn Easy Apply assistant' : 'AI-powered email outreach'}
                </p>
              </div>
            </div>
          </div>

          {isLinkedInJob && (
            <div className="border-t-[3px] border-black pt-4 mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span className="text-sm font-black text-orange-400 uppercase tracking-wider">LinkedIn DM</span>
                </div>
              </div>

              {dmNote && (
                <div className="p-3 bg-amber-900/40 border-[3px] border-black text-xs text-amber-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  {dmNote}
                </div>
              )}

              {contactLocked ? (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-800 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-white">{selectedCandidate?.name || lead.linkedin_contact_name || 'Hiring Manager'}</p>
                        <p className="text-xs text-gray-400">{selectedCandidate?.title || lead.linkedin_contact_title || ''}</p>
                        <p className="text-xs text-gray-500 truncate">{selectedCandidate?.profile_url || lead.linkedin_contact_url || ''}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 font-black border-[2px] border-black">Saved</span>
                    </div>
                  </div>
                  <button onClick={handleChangeContact}
                    className="text-xs text-orange-400 font-black hover:text-orange-300 transition-all uppercase tracking-wider">
                    Change contact
                  </button>
                </div>
              ) : (
                <>
                  {dmCandidates.length > 0 && (
                    <div className="space-y-2">
                      {dmCandidates.map((c, i) => (
                        <label key={i} className={`flex items-start gap-3 p-3 cursor-pointer transition-all ${selectedCandidate?.profile_url === c.profile_url ? 'bg-orange-900/40 border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-800 border-[3px] border-black hover:bg-gray-700'}`}>
                          <input type="radio" name="dmCandidate" checked={selectedCandidate?.profile_url === c.profile_url} onChange={() => handleSelectCandidate(c)} className="mt-0.5 accent-orange-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.title}</p>
                            <p className="text-xs text-gray-500 truncate">{c.profile_url}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {dmCandidates.length === 0 && dmSpares.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-black uppercase tracking-wider">Saved alternatives</p>
                      {dmSpares.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-800 border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.title}</p>
                            <p className="text-xs text-gray-500 truncate">{s.profile_url}</p>
                          </div>
                          <button onClick={() => handleUseSpare(s)}
                            className="shrink-0 text-xs bg-orange-500 border-[2px] border-black text-white px-3 py-1.5 font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider">
                            Use this contact
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={handleFindHiringManager} disabled={dmFinding || sparesLoading}
                      className="flex-1 bg-gray-700 border-[3px] border-black text-white px-3 py-2 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-1 uppercase tracking-wider">
                      {dmFinding ? <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin"></div> : null}
                      {dmFinding ? 'Searching...' : dmCandidates.length ? 'Search Again' : dmSpares.length ? 'Find Updates' : 'Find Hiring Manager'}
                    </button>
                    {selectedCandidate && (
                      <button onClick={() => handleSaveCandidate()}
                        className="bg-gray-700 border-[3px] border-black text-white px-3 py-2 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider">
                        Save
                      </button>
                    )}
                  </div>

                  {((dmSearched && !dmFinding && dmCandidates.length === 0) || dmSpares.length > 0) && (
                    <div className="p-4 bg-gray-800 border-[3px] border-black space-y-3">
                      <p className="text-xs text-gray-400 font-black uppercase tracking-wider">Enter contact manually</p>
                      <input className="w-full bg-gray-700 border-[3px] border-black px-3 py-2 text-xs text-white placeholder-gray-500 font-medium"
                        placeholder="Full name *" value={manualContact.name}
                        onChange={e => setManualContact({...manualContact, name: e.target.value})} />
                      <input className="w-full bg-gray-700 border-[3px] border-black px-3 py-2 text-xs text-white placeholder-gray-500 font-medium"
                        placeholder="Job title" value={manualContact.title}
                        onChange={e => setManualContact({...manualContact, title: e.target.value})} />
                      <input className="w-full bg-gray-700 border-[3px] border-black px-3 py-2 text-xs text-white placeholder-gray-500 font-medium"
                        placeholder="LinkedIn profile URL * (e.g. https://linkedin.com/in/name)" value={manualContact.url}
                        onChange={e => setManualContact({...manualContact, url: e.target.value})} />
                      <button onClick={handleSaveManualContact} disabled={savingManual || !manualContact.name.trim() || !manualContact.url.trim()}
                        className="w-full bg-orange-500 border-[3px] border-black text-white px-3 py-2 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 uppercase tracking-wider">
                        {savingManual ? 'Saving...' : 'Save Contact'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {contactLocked && (
                <div className="space-y-3">
                  {!dmDraft ? (
                    <button onClick={handleDraftLinkedInDm} disabled={dmDrafting}
                      className="w-full bg-orange-500 border-[3px] border-black text-white px-3 py-2 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-1 uppercase tracking-wider">
                      {dmDrafting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin"></div> : null}
                      {dmDrafting ? 'Drafting...' : 'Draft Connection Note'}
                    </button>
                  ) : (
                    <>
                      <textarea className="w-full bg-gray-800 border-[3px] border-black px-3 py-2 text-sm text-white min-h-[80px]"
                        value={dmDraft} readOnly />
                      <div className="flex gap-2">
                        <button onClick={handleDraftLinkedInDm} disabled={dmDrafting}
                          className="flex-1 bg-orange-500/80 border-[3px] border-black text-white px-3 py-2 text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-1 uppercase tracking-wider">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          {dmDrafting ? 'Generating...' : 'Generate Different Message'}
                        </button>
                        <a href={selectedCandidate?.profile_url || lead.linkedin_contact_url} target="_blank" rel="noopener" onClick={handleCopyLinkedInDm}
                          className="flex-1 bg-emerald-600 border-[3px] border-black text-white px-3 py-2 text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1 uppercase tracking-wider">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                          Copy &amp; Send to Profile
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {isLinkedInJob ? (
            <div className="space-y-3">
              {lead.application_status === 'applied' || lead.application_status === 'submitted' ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-900/40 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-emerald-300 font-black">Application submitted</span>
                </div>
              ) : lead.application_status === 'draft_ready' || lead.application_status === 'review' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-amber-900/40 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <div>
                      <p className="font-black text-amber-300">Browser window opened</p>
                      <p className="text-xs text-gray-400">Review the pre-filled form and click Submit on LinkedIn</p>
                    </div>
                  </div>
                  <button onClick={handleMarkApplied}
                    className="w-full bg-emerald-600 border-[3px] border-black text-white px-4 py-2.5 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider">
                    I submitted it — Mark as Applied
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button onClick={handleAutoApply} disabled={autoApplying}
                    className="w-full bg-purple-600 border-[3px] border-black text-white px-4 py-3 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider">
                    {autoApplying ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                    {autoApplying ? `AI is applying... (${formatTime(applySeconds)})` : 'Auto-Apply with AI'}
                  </button>
                  {autoApplying && configs && (configs.find(c => c.is_primary) || configs[0]) && (
                    <div className="text-[10px] text-purple-400 font-black text-center uppercase tracking-wider animate-pulse">
                      Using: {(configs.find(c => c.is_primary) || configs[0]).provider}/{(configs.find(c => c.is_primary) || configs[0]).model}
                    </div>
                  )}
                  {autoApplyResult && (
                    <div className={`text-xs px-3 py-2 border-[2px] border-black ${
                      autoApplyResult.status === 'success' ? 'bg-emerald-900/40 text-emerald-300' :
                      autoApplyResult.status === 'review' ? 'bg-amber-900/40 text-amber-300' :
                      'bg-red-900/40 text-red-300'
                    }`}>
                      <p className="font-black mb-1">{autoApplyResult.message || autoApplyResult.error}</p>
                      {autoApplyResult.model_used && (
                        <p className="opacity-70">Model: {autoApplyResult.model_used}</p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                  <button onClick={handleLinkedInAutoFill} disabled={loading}
                    className="w-full bg-gray-700 border-[3px] border-black text-white px-4 py-2.5 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider">
                    {loading ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin"></div>
                    ) : null}
                    {loading ? 'Opening browser...' : 'Manual Auto-Fill (no AI)'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {contactInfo.email ? (
                <div className="p-4 bg-gray-800 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <span className="text-sm font-black text-white">{contactInfo.email}</span>
                    </div>
                    {contactInfo.source && (
                      <span className="text-[10px] text-gray-400 bg-gray-700 px-2 py-0.5 border-[2px] border-black font-bold">{contactInfo.source}</span>
                    )}
                  </div>
                  {contactInfo.phone && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <span className="font-black">{contactInfo.phone}</span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/${contactInfo.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-500 border-[3px] border-black text-white px-3 py-2 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                          WhatsApp
                        </a>
                        <a
                          href={`tel:${contactInfo.phone}`}
                          className="flex-1 bg-blue-500 border-[3px] border-black text-white px-3 py-2 text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          Call
                        </a>
                      </div>
                    </div>
                  )}

                  {emailDraft ? (
                    <div className="space-y-3 mt-3 pt-3 border-t-[3px] border-black">
                      <input
                        className="w-full bg-gray-700 border-[3px] border-black px-3 py-2 text-sm text-white placeholder-gray-500 font-medium"
                        value={emailDraft.subject}
                        onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                      />
                      <textarea
                        className="w-full bg-gray-700 border-[3px] border-black px-3 py-2 text-sm text-white placeholder-gray-500 font-medium min-h-[160px]"
                        value={emailDraft.body}
                        onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSendEmail} disabled={sending}
                          className="flex-1 bg-emerald-600 border-[3px] border-black text-white px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider">
                          {sending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                          )}
                          {sending ? 'Sending...' : 'Send Email'}
                        </button>
                        <button onClick={handleDraftEmail} disabled={drafting}
                          className="px-4 py-2 bg-gray-700 border-[3px] border-black text-white text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 uppercase tracking-wider">
                          Re-draft
                        </button>
                      </div>
                      {sendResult && (
                        <div className={`text-xs px-3 py-2 border-[2px] border-black ${
                          sendResult.status === 'sent' ? 'bg-emerald-900/40 text-emerald-300' :
                          sendResult.status === 'preview_only' ? 'bg-amber-900/40 text-amber-300' :
                          'bg-red-900/40 text-red-300'
                        }`}>
                          {sendResult.message || sendResult.status}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={handleDraftEmail} disabled={drafting}
                      className="w-full bg-orange-500 border-[3px] border-black text-white px-4 py-2.5 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 uppercase tracking-wider">
                      {drafting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      )}
                      {drafting ? 'AI drafting...' : 'Draft Email'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <button onClick={handleExtractContact} disabled={extracting}
                    className="w-full border-[3px] border-black text-white px-4 py-4 text-base font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-wider relative overflow-hidden cursor-pointer"
                    style={{ background: 'transparent' }}>
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <filter id="tigerNoise" x="0%" y="0%" width="100%" height="100%">
                          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.08" numOctaves="4" seed="3" result="noise"/>
                          <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G"/>
                        </filter>
                        <filter id="tigerWarp">
                          <feTurbulence type="turbulence" baseFrequency="0.02 0.06" numOctaves="3" seed="7" result="warp"/>
                          <feDisplacementMap in="SourceGraphic" in2="warp" scale="12" xChannelSelector="R" yChannelSelector="B"/>
                        </filter>
                        <pattern id="tigerStripes" patternUnits="userSpaceOnUse" width="120" height="100" patternTransform="rotate(-8)">
                          <rect width="120" height="100" fill="#ea580c"/>
                          <path d="M0,10 Q15,5 20,25 Q25,50 15,70 Q10,85 20,100" stroke="#1a1a1a" strokeWidth="9" fill="none" strokeLinecap="round" filter="url(#tigerNoise)"/>
                          <path d="M30,0 Q40,20 35,40 Q30,60 40,80 Q45,95 35,100" stroke="#111111" strokeWidth="7" fill="none" strokeLinecap="round" filter="url(#tigerNoise)"/>
                          <path d="M55,10 Q65,30 58,50 Q52,70 62,90 Q65,100 58,100" stroke="#1a1a1a" strokeWidth="10" fill="none" strokeLinecap="round" filter="url(#tigerNoise)"/>
                          <path d="M80,0 Q88,15 82,35 Q78,55 88,75 Q92,90 85,100" stroke="#0d0d0d" strokeWidth="6" fill="none" strokeLinecap="round" filter="url(#tigerNoise)"/>
                          <path d="M100,5 Q108,25 102,45 Q98,65 108,85 Q112,95 105,100" stroke="#1a1a1a" strokeWidth="8" fill="none" strokeLinecap="round" filter="url(#tigerNoise)"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#tigerStripes)" filter="url(#tigerWarp)"/>
                    </svg>
                    <span className="relative z-10 flex items-center gap-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}>
                      {extracting ? (
                        <div className="w-6 h-6 border-[3px] border-white/30 border-t-white animate-spin"></div>
                      ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                      {extracting ? 'Hunting contacts...' : 'OSINT Contact Hunter'}
                    </span>
                  </button>

                  <div className="bg-gray-800/50 border-[2px] border-gray-700 px-4 py-3 space-y-2">
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      <span className="text-orange-400 font-black">What it does:</span> Searches for email addresses and phone numbers across multiple sources — scrapes websites, runs Google dorks, checks social profiles (GitHub, Keybase), generates common email patterns, and verifies them via SMTP.
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      <span className="text-gray-400 font-black">Reliability varies by platform.</span> Public platforms with exposed contact info (Reddit, Mastodon, Craigslist) tend to work well. LinkedIn, Upwork, and job boards often hide emails behind authentication, making extraction harder. Results are not guaranteed.
                    </p>
                  </div>

                  {osintResult && (
                    <div className="bg-gray-800 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">OSINT Results</span>
                        <span className="text-[10px] text-gray-500">{osintResult.elapsed_seconds}s</span>
                      </div>

                      {osintResult.email && (
                        <div className="p-3 bg-emerald-900/30 border-[2px] border-emerald-500/50">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="text-sm font-black text-white">{osintResult.email}</span>
                            {osintResult.verified && <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 font-black border border-black">Verified</span>}
                          </div>
                        </div>
                      )}

                      {osintResult.phone && (
                        <div className="p-3 bg-blue-900/30 border-[2px] border-blue-500/50 space-y-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span className="text-base font-black text-white">{osintResult.phone}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`https://wa.me/${osintResult.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-emerald-500 border-[3px] border-black text-white px-4 py-2.5 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                              WhatsApp
                            </a>
                            <a
                              href={`tel:${osintResult.phone}`}
                              className="flex-1 bg-blue-500 border-[3px] border-black text-white px-4 py-2.5 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              Call
                            </a>
                          </div>
                        </div>
                      )}

                      {!osintResult.email && !osintResult.phone && (
                        <div className="p-3 bg-gray-700/50 border-[2px] border-gray-600">
                          <span className="text-xs text-gray-400">No contact info found</span>
                        </div>
                      )}

                      {osintResult.all_findings && osintResult.all_findings.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">All findings ({osintResult.all_findings.length})</span>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {osintResult.all_findings.slice(0, 10).map((f, i) => (
                              <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-700/30 border border-gray-600">
                                <span className="text-gray-300 font-mono truncate">{f.value}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500">{f.source}</span>
                                  <span className={`text-[10px] font-black ${f.confidence >= 0.7 ? 'text-emerald-400' : f.confidence >= 0.4 ? 'text-amber-400' : 'text-gray-500'}`}>
                                    {Math.round(f.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {osintResult.method_breakdown && Object.keys(osintResult.method_breakdown).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                          {Object.entries(osintResult.method_breakdown).map(([method, count]) => (
                            <span key={method} className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 border border-gray-600">
                              {method}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-orange-500 border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-[3px] border-black">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rotate-45" />
              <div>
                <h4 className="text-base font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Bebas Neue', cursive" }}>Strategic Response</h4>
                <p className="text-[10px] font-bold text-orange-200 uppercase tracking-wider">AI-powered outreach generation</p>
              </div>
            </div>
            {!reply && (
              <button onClick={generateDraft} disabled={loading}
                className="bg-white text-orange-600 border-[3px] border-black font-black text-xs uppercase tracking-wider px-5 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0">
                {loading ? 'Consulting AI...' : 'Draft Response'}
              </button>
            )}
          </div>
          {reply && <ReplyEditor reply={reply} lead={lead} onUpdate={setReply} />}
        </div>
      </div>
    </div>
  )
}
