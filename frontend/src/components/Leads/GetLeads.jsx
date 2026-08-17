import React from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import api from '../../services/api'

const PLATFORMS = [
  { id: 'Reddit', name: 'Reddit', icon: 'fa-reddit', style: 'fab', desc: 'Find clients in webdev subreddits' },
  { id: 'Craigslist', name: 'Craigslist', icon: 'fa-list', style: 'fas', desc: 'Local web development gigs' },
  { id: 'Upwork', name: 'Upwork', icon: 'fa-briefcase', style: 'fas', desc: 'Freelance job postings' },
  { id: 'Mastodon', name: 'Mastodon', icon: 'fa-mastodon', style: 'fab', desc: 'Decentralized social network posts' },
  { id: 'Indeed', name: 'Indeed', icon: 'fa-building', style: 'fas', desc: 'Job listings for web developers' },
  { id: 'HackerNews', name: 'Hacker News', icon: 'fa-newspaper', style: 'fas', desc: 'Tech community freelance posts' },
  { id: 'Google Alerts', name: 'Google Alerts', icon: 'fa-bell', style: 'fas', desc: 'Email alerts for web dev keywords' },
  { id: 'LinkedIn', name: 'LinkedIn', icon: 'fa-linkedin', style: 'fab', desc: 'Find high-value professional job postings' },
  { id: 'Lionbridge', name: 'Lionbridge', icon: 'fa-crown', style: 'fas', desc: 'Lionbridge freelance & remote job postings' },
]

const MODE_CONFIG = {
  job_hunter: { label: 'Job Hunter', icon: 'fa-briefcase' },
  internship_scout: { label: 'Internship Scout', icon: 'fa-graduation-cap' },
  clients_excavator: { label: 'Clients Excavator', icon: 'fa-users' },
}

const BUILT_IN_PRESETS = {
  websites: 'Website Development',
  network_telecom_jobs: 'Network & Telecom - Jobs',
  network_telecom_internship: 'Network & Telecom - Internships',
  cybersecurity_jobs: 'Cybersecurity - Jobs',
  cybersecurity_internship: 'Cybersecurity - Internships',
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch {}
}

function playNoLeadsTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(330, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

function flashTab(totalNew) {
  try {
    if (!document.hidden) return
    const orig = document.title
    const msg = `[${totalNew} new] ${orig}`
    document.title = msg
    const interval = setInterval(() => {
      document.title = document.title === msg ? orig : msg
    }, 1000)
    setTimeout(() => {
      clearInterval(interval)
      document.title = orig
    }, 6000)
  } catch {}
}

export default function GetLeads() {
  const [selected, setSelected] = React.useState([])
  const [activePreset, setActivePreset] = React.useState('websites')
  const [customPresets, setCustomPresets] = React.useState([])
  const [activeKeywords, setActiveKeywords] = React.useState('')
  const [activeMode, setActiveMode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [scrapeProgress, setScrapeProgress] = React.useState([])
  const [currentPlatformIdx, setCurrentPlatformIdx] = React.useState(-1)
  const stopRef = React.useRef(false)
  const abortRef = React.useRef(null)

  React.useEffect(() => {
    api.get('/settings/').then(r => {
      const settings = {}
      r.data.forEach(s => { settings[s.key] = s.value })
      const preset = settings.search_preset_active || 'websites'
      setActivePreset(preset)
      setActiveMode(settings.search_mode || '')
      if (settings.search_presets_list) {
        try { setCustomPresets(JSON.parse(settings.search_presets_list)) } catch (e) {}
      }
      const platforms = settings.search_platforms || 'Reddit,Craigslist,Upwork'
      setSelected(platforms.split(',').map(p => p.trim()).filter(Boolean))
      setActiveKeywords(settings.search_keywords || '')
    }).catch(() => {
      setSelected(PLATFORMS.map(p => p.id))
    })
  }, [])

  const toggleAll = () => {
    setSelected(prev => prev.length === PLATFORMS.length ? [] : PLATFORMS.map(p => p.id))
  }

  const togglePlatform = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleScrape = async () => {
    if (selected.length === 0) { setError('Please select at least one platform'); return }
    setLoading(true); setError(null); setResults(null)
    stopRef.current = false
    abortRef.current = null
    const initialProgress = selected.map(p => ({ platform: p, status: 'pending', leads_found: 0, new_leads: 0, error: null }))
    setScrapeProgress(initialProgress)
    setCurrentPlatformIdx(0)
    const finalResults = { results: [], total_new: 0 }
    for (let i = 0; i < selected.length; i++) {
      if (stopRef.current) break
      const platform = selected[i]
      setCurrentPlatformIdx(i)
      setScrapeProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'loading' } : item))
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await api.post('/leads/scrape', { platforms: [platform] }, { signal: controller.signal })
        const result = res.data.results[0]
        finalResults.results.push(result)
        finalResults.total_new += result.new_leads
        setScrapeProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done', leads_found: result.leads_found, new_leads: result.new_leads } : item))
      } catch (err) {
        if (axios.isCancel(err)) {
          setScrapeProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'cancelled' } : item))
          break
        }
        const errorMsg = err.response?.data?.detail || 'Failed to fetch'
        setScrapeProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', error: errorMsg } : item))
        finalResults.results.push({ platform, leads_found: 0, new_leads: 0, error: errorMsg })
      }
      await new Promise(r => setTimeout(r, 500))
    }
    setScrapeProgress(prev => prev.map(item => item.status === 'pending' ? { ...item, status: 'cancelled' } : item))
    setResults(finalResults)
    if (finalResults.total_new > 0) {
      try { playChime() } catch {}
      try { flashTab(finalResults.total_new) } catch {}
    } else {
      try { playNoLeadsTone() } catch {}
      try { flashTab('0 leads') } catch {}
    }
    setLoading(false)
    setCurrentPlatformIdx(-1)
    abortRef.current = null
  }

  const handleStop = () => {
    stopRef.current = true
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }

  const handleSearchAgain = () => {
    setLoading(false)
    setResults(null)
    setScrapeProgress([])
    setCurrentPlatformIdx(-1)
    setError(null)
    stopRef.current = false
    abortRef.current = null
  }

  const totalFound = results?.results?.reduce((acc, r) => acc + r.leads_found, 0) || 0
  const totalNew = results?.total_new || 0
  const getPresetName = () => {
    if (BUILT_IN_PRESETS[activePreset]) return BUILT_IN_PRESETS[activePreset]
    const c = customPresets.find(p => p.id === activePreset)
    return c ? c.name : 'Custom Search'
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* Header */}
      <div className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
              <i className="fa-solid fa-magnifying-glass text-white text-sm"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black leading-none tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                <span className="text-orange-500">GET</span> LEADS
              </h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Select platforms then launch a search</p>
            </div>
          </div>
          <Link to="/settings"
            className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-3.5 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-2 shrink-0">
            <i className="fa-solid fa-sliders text-xs"></i>
            Adjust Config
          </Link>
        </div>
        <div className="absolute -bottom-0 left-0 right-0 h-[3px] bg-black mt-4" />
      </div>

      {/* Active Context Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-white border-[3px] border-black px-3.5 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-500 rotate-45 shrink-0" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Preset</span>
          <span className="text-xs font-bold text-gray-800">{getPresetName()}</span>
        </div>
        {activeMode && MODE_CONFIG[activeMode] && (
          <div className="bg-white border-[3px] border-black px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
            <i className={`fa-solid ${MODE_CONFIG[activeMode].icon} text-xs text-orange-500`}></i>
            <span className="text-xs font-bold text-gray-700">{MODE_CONFIG[activeMode].label}</span>
          </div>
        )}
        {activeKeywords && (
          <div className="bg-white border-[3px] border-black px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 text-xs">
            <i className="fa-solid fa-tag text-[10px] text-orange-400"></i>
            <span className="font-black text-gray-500 uppercase tracking-wider text-[10px]">Keywords:</span>
            <span className="font-bold text-gray-700">{activeKeywords.split(',').slice(0, 2).join(', ')}{activeKeywords.split(',').length > 2 ? '…' : ''}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Platform Selection */}
          <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-tour="get-leads-platforms">
            <div className="px-6 py-4 border-b-[3px] border-black flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rotate-45" />
                <h2 className="text-sm font-black uppercase tracking-wider">Platforms</h2>
              </div>
              <button onClick={toggleAll} disabled={loading}
                className="text-[10px] font-black uppercase tracking-wider bg-white border-[3px] border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                <i className="fa-solid fa-layer-group text-[10px] mr-1.5"></i>
                {selected.length === PLATFORMS.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {PLATFORMS.map(p => {
                const active = selected.includes(p.id)
                return (
                  <button key={p.id} onClick={() => togglePlatform(p.id)} disabled={loading}
                    className={`relative flex flex-col items-center text-center p-5 border-[3px] border-black transition-all duration-200 ${
                      active
                        ? 'bg-orange-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-gray-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                    } ${loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className={`w-14 h-14 border-[3px] border-black flex items-center justify-center text-xl mb-3 transition-all duration-200 ${
                      active
                        ? 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}>
                      <i className={`${p.style} ${p.icon} ${active ? 'text-orange-500' : 'text-gray-400'}`}></i>
                    </div>
                    <span className={`text-sm font-black uppercase tracking-wider ${active ? 'text-white' : 'text-gray-800'}`}>
                      {p.name}
                    </span>
                    <span className="text-[10px] font-bold mt-1.5 leading-tight opacity-70">{p.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Launch Section */}
          {!loading && !results && (
            <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative" data-tour="get-leads-launch">
              <div className="px-8 py-10 text-center">
                <div className="w-14 h-14 bg-orange-500 border-[3px] border-black flex items-center justify-center mx-auto mb-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <i className="fa-solid fa-rocket text-xl text-white"></i>
                </div>
                <h3 className="text-xl font-black tracking-tight mb-1.5" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                  READY TO <span className="text-orange-500">SCAN</span>?
                </h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-8 max-w-md mx-auto">
                  Your agents will scan <strong className="text-gray-800">{selected.length}</strong> platform{selected.length !== 1 ? 's' : ''} using your active configuration.
                </p>
                <button onClick={handleScrape} disabled={selected.length === 0}
                  className={`inline-flex items-center gap-3 px-8 py-3.5 font-black text-sm uppercase tracking-wider transition-all duration-200 ${
                    selected.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-[3px] border-gray-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                      : 'bg-orange-500 text-white border-[3px] border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>Launch Search</span>
                  <i className="fa-solid fa-arrow-right text-sm"></i>
                </button>
                {selected.length === 0 && (
                  <p className="mt-4 text-xs font-bold text-gray-400">Select at least one platform to begin</p>
                )}
              </div>
            </div>
          )}

          {/* Progress Console */}
          {(loading || results) && (
            <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="px-6 py-3.5 border-b-[3px] border-black flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 bg-red-500 border-[1.5px] border-black" />
                    <div className="w-2.5 h-2.5 bg-amber-400 border-[1.5px] border-black" />
                    <div className="w-2.5 h-2.5 bg-emerald-400 border-[1.5px] border-black" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest" style={{ fontFamily: "'Bebas Neue', cursive" }}>Console</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 uppercase tracking-wider border-[2px] border-black ${
                    loading ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                    scrapeProgress.some(i => i.status === 'cancelled') ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                    'bg-emerald-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}>
                    <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-check-circle'}`}></i>
                    {loading ? 'Scanning…' : scrapeProgress.some(i => i.status === 'cancelled') ? 'Stopped' : 'Complete'}
                  </span>
                  {loading && (
                    <button onClick={handleStop}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 uppercase tracking-wider border-[2px] border-black bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                    >
                      <i className="fa-solid fa-stop-circle"></i>
                      Stop
                    </button>
                  )}
                  {results && !loading && (
                    <button onClick={handleSearchAgain}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 uppercase tracking-wider border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                    >
                      <i className="fa-solid fa-arrow-rotate-right"></i>
                      Search Again
                    </button>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-2">
                {scrapeProgress.map((item, idx) => {
                  const pf = PLATFORMS.find(x => x.id === item.platform)
                  const isActive = item.status === 'loading'
                  return (
                    <div key={idx} className={`border-[3px] border-black transition-all duration-300 ${
                      isActive ? 'bg-orange-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' :
                      item.status === 'done' ? 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' :
                      item.status === 'error' ? 'bg-red-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' :
                      item.status === 'cancelled' ? 'bg-gray-50 opacity-60 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]' :
                      'bg-gray-50 opacity-35 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'
                    }`}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {pf && (
                            <div className={`w-8 h-8 border-[2px] border-black flex items-center justify-center ${
                              isActive ? 'bg-orange-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'
                            }`}>
                              <i className={`${pf.style} ${pf.icon} text-xs ${isActive ? 'text-white' : 'text-orange-500'}`}></i>
                            </div>
                          )}
                          <div>
                            <span className={`text-sm font-black uppercase tracking-wider ${item.status === 'error' ? 'text-red-700' : 'text-gray-800'}`}>
                              {pf?.name || item.platform}
                            </span>
                            {isActive && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1 h-1 bg-orange-500 animate-pulse" />
                                <span className="text-[11px] font-bold text-orange-500">Scanning…</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                          {item.status === 'done' && (
                            <>
                              <span className="text-gray-500">{item.leads_found} found</span>
                              <span className="bg-emerald-500 text-white border-[2px] border-black px-2 py-0.5 text-[10px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">+{item.new_leads}</span>
                              <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                            </>
                          )}
                          {item.status === 'error' && (
                            <span className="text-red-500 text-[11px] flex items-center gap-1.5 font-black">
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              {item.error}
                            </span>
                          )}
                          {item.status === 'cancelled' && (
                            <span className="text-gray-400 text-[11px] flex items-center gap-1.5 font-bold">
                              <i className="fa-solid fa-ban"></i>
                              Cancelled
                            </span>
                          )}
                          {isActive && (
                            <div className="w-5 h-5 border-[3px] border-orange-300 border-t-orange-600 animate-spin" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b-[3px] border-black">
              <div className="w-2 h-2 bg-orange-500 rotate-45" />
              <h3 className="text-xs font-black uppercase tracking-widest">Summary</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-black tracking-tight tabular-nums" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {results ? totalFound : loading ? '—' : '0'}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Total Found</div>
                </div>
                <div className="w-11 h-11 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <i className="fa-solid fa-chart-simple text-base text-white"></i>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-black tracking-tight tabular-nums ${totalNew > 0 ? 'text-emerald-500' : ''}`} style={{ fontFamily: "'Bebas Neue', cursive" }}>
                    {results ? totalNew : loading ? '—' : '0'}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">New Added</div>
                </div>
                <div className={`w-11 h-11 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${totalNew > 0 ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                  <i className={`fa-solid fa-plus text-base ${totalNew > 0 ? 'text-white' : 'text-gray-300'}`}></i>
                </div>
              </div>
              <div className="pt-5 border-t-[3px] border-black">
                <div className="flex justify-between text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2.5">
                  <span>Progress</span>
                  <span className="tabular-nums">{loading ? Math.round(((currentPlatformIdx + 1) / selected.length) * 100) : results ? 100 : 0}%</span>
                </div>
                <div className="w-full h-3 border-[2px] border-black bg-white">
                  <div className="h-full bg-orange-500 transition-all duration-500 ease-out"
                    style={{ width: `${loading ? ((currentPlatformIdx + 1) / selected.length) * 100 : results ? 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Callout */}
          {results && totalNew > 0 && (
            <div className="bg-orange-500 border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-10 h-10 bg-white border-[3px] border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <i className="fa-solid fa-check text-black text-lg"></i>
              </div>
              <h4 className="font-black text-lg mb-1 text-white" style={{ fontFamily: "'Bebas Neue', cursive" }}>ALL DONE</h4>
              <p className="text-orange-100 text-sm font-bold mb-6 leading-relaxed">
                {totalNew} new lead{totalNew !== 1 ? 's' : ''} added to your pipeline.
              </p>
              <Link to="/leads"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white text-gray-900 border-[3px] border-black font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                View Pipeline
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </Link>
            </div>
          )}

          {/* Tip */}
          <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b-[3px] border-black">
              <div className="w-2 h-2 bg-orange-500 rotate-45" />
              <h3 className="text-xs font-black uppercase tracking-widest">Tip</h3>
            </div>
            <p className="text-xs font-bold text-gray-600 leading-relaxed">
              Sequential scraping respects rate limits and improves success rates across all platforms.
            </p>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 right-8 bg-red-500 border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center gap-3 text-white text-sm font-bold animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-sm z-50">
          <i className="fa-solid fa-circle-exclamation text-white"></i>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-200 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
      )}
    </div>
  )
}
