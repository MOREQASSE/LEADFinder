import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import ModeSelector from './ModeSelector'
import SystemPromptEditor from './SystemPromptEditor'

const MODE_LABELS = {
  job_hunter: { label: 'Job Hunter', color: 'text-blue-600 bg-blue-50' },
  internship_scout: { label: 'Internship Scout', color: 'text-green-600 bg-green-50' },
  clients_excavator: { label: 'Clients Excavator', color: 'text-amber-600 bg-amber-50' },
}

const BUILT_IN_PRESETS = {
  websites: {
    name: 'Website Development',
    icon: "\uD83C\uDF10",
    description: 'Find clients looking for website development services',
    mode: 'clients_excavator',
    keywords: {
      search_terms: 'need a website, looking for web developer, website design, build a website, web development, hire web developer, need web designer, ecommerce website, wordpress developer, shopify developer',
      platforms: 'Reddit,Craigslist,Upwork,Mastodon,Indeed,HackerNews',
      exclude_terms: 'free,cheap,budget,beginner,student project'
    }
  },
  network_telecom_jobs: {
    name: 'Network & Telecom - Jobs',
    icon: "\uD83D\uDCE1",
    description: 'Network and telecommunications engineering positions',
    mode: 'job_hunter',
    keywords: {
      search_terms: 'network engineer,telecom engineer,network administrator,CCNA,CCNP,network security,VoIP,telecommunications,networking jobs,cisco engineer',
      platforms: 'Indeed,HackerNews,Upwork,Reddit',
      exclude_terms: 'intern,internship,student,junior,entry level'
    }
  },
  network_telecom_internship: {
    name: 'Network & Telecom - Internships',
    icon: "\uD83D\uDCE1",
    description: 'Network and telecommunications internships',
    mode: 'internship_scout',
    keywords: {
      search_terms: 'network engineer internship,telecom internship,network admin intern,CCNA intern,telecommunications internship,networking intern',
      platforms: 'Indeed,Upwork,Reddit',
      exclude_terms: 'senior,lead,manager,principal,5+ years,10 years'
    }
  },
  cybersecurity_jobs: {
    name: 'Cybersecurity - Jobs',
    icon: "\uD83D\uDD12",
    description: 'Cybersecurity engineering positions',
    mode: 'job_hunter',
    keywords: {
      search_terms: 'cybersecurity engineer,security engineer,penetration tester,ethical hacker,security analyst,infosec engineer,CISO,security architect,blue team,red team,SIEM,soc analyst',
      platforms: 'Indeed,HackerNews,Upwork,Reddit',
      exclude_terms: 'intern,internship,student,junior,entry level'
    }
  },
  cybersecurity_internship: {
    name: 'Cybersecurity - Internships',
    icon: "\uD83D\uDD12",
    description: 'Cybersecurity engineering internships',
    mode: 'internship_scout',
    keywords: {
      search_terms: 'cybersecurity internship,security engineer intern,penetration testing intern,security analyst intern,ethical hacker intern,infosec internship',
      platforms: 'Indeed,Upwork,Reddit',
      exclude_terms: 'senior,lead,manager,principal,5+ years,CISSP required'
    }
  },
  high_ticket_agency: {
    name: 'High-Ticket Tech Agency',
    icon: "\uD83D\uDC8E",
    description: 'Target high-value, specialized agency contracts',
    mode: 'clients_excavator',
    keywords: {
      search_terms: 'custom software,headless cms,nextjs,react native,mobile app development,automation,cloud architecture,aws consultant,Fractional CTO,devops engineer',
      platforms: 'Reddit,Craigslist,Upwork,HackerNews',
      exclude_terms: 'free,cheap,intern,student,beginner,$15/hr'
    }
  },
  broad_freelance: {
    name: 'Broad Freelance Discovery',
    icon: "\uD83D\uDE80",
    description: 'Cast a massive net for any tech-related needs',
    keywords: {
      search_terms: 'need help,hire,looking for,developer,designer,programmer,coder,website,app,tech,support',
      platforms: 'Reddit,Craigslist,Upwork,Indeed,HackerNews',
      exclude_terms: 'free,scam,spam'
    }
  }
}

const MODE_SHORT = {
  job_hunter: { icon: 'fa-briefcase', color: 'text-blue-600' },
  internship_scout: { icon: 'fa-graduation-cap', color: 'text-green-600' },
  clients_excavator: { icon: 'fa-users', color: 'text-amber-600' },
}

export default function SearchPresets() {
  const { getValue, setValue, saveAll, saving, loading } = useSettings()
  const [activePreset, setActivePreset] = React.useState('websites')
  const [customPresets, setCustomPresets] = React.useState([])

  const [isEditorOpen, setIsEditorOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState(null)
  const [presetName, setPresetName] = React.useState('')
  const [customKeywords, setCustomKeywords] = React.useState('')
  const [customPlatforms, setCustomPlatforms] = React.useState('')
  const [customExclude, setCustomExclude] = React.useState('')
  const [customMode, setCustomMode] = React.useState('')

  React.useEffect(() => {
    if (loading) return
    const active = getValue('search_preset_active') || 'websites'
    setActivePreset(active)
    const savedPresets = getValue('search_presets_list')
    if (savedPresets) {
      try { setCustomPresets(JSON.parse(savedPresets)) } catch (e) {}
    }
  }, [loading])

  const loadPreset = (presetId) => {
    setActivePreset(presetId)
    let preset = BUILT_IN_PRESETS[presetId]
    if (!preset) preset = customPresets.find(p => p.id === presetId)
    if (preset) {
      const updates = {
        search_preset_active: presetId,
        search_keywords: preset.keywords.search_terms,
        search_platforms: preset.keywords.platforms,
        search_exclude: preset.keywords.exclude_terms
      }
      if (preset.mode) updates.search_mode = preset.mode
      Object.entries(updates).forEach(([k, v]) => setValue(k, v))
      return updates
    }
    return {}
  }

  const openEditor = (preset = null, fork = false) => {
    if (preset) {
      setEditingId(fork ? null : preset.id)
      setPresetName(preset.name)
      setCustomKeywords(preset.keywords.search_terms)
      setCustomPlatforms(preset.keywords.platforms)
      setCustomExclude(preset.keywords.exclude_terms)
      setCustomMode(preset.mode || '')
    } else {
      setEditingId(null)
      setPresetName('')
      setCustomKeywords('')
      setCustomPlatforms('')
      setCustomExclude('')
      setCustomMode('')
    }
    setIsEditorOpen(true)
  }

  const saveCustomPreset = () => {
    const newPreset = {
      id: editingId || `custom_${Date.now()}`,
      name: presetName || 'Untitled Preset',
      icon: "\u2699\uFE0F",
      description: 'User defined search configuration',
      mode: customMode || undefined,
      keywords: {
        search_terms: customKeywords,
        platforms: customPlatforms,
        exclude_terms: customExclude
      }
    }
    let updatedPresets
    if (editingId) {
      updatedPresets = customPresets.map(p => p.id === editingId ? newPreset : p)
    } else {
      updatedPresets = [...customPresets, newPreset]
    }
    setCustomPresets(updatedPresets)
    const updates = {
      search_presets_list: JSON.stringify(updatedPresets),
      search_preset_active: newPreset.id,
      search_keywords: newPreset.keywords.search_terms,
      search_platforms: newPreset.keywords.platforms,
      search_exclude: newPreset.keywords.exclude_terms
    }
    saveAll(updates)
    setActivePreset(newPreset.id)
    setIsEditorOpen(false)
  }

  const deletePreset = (e, presetId) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this preset?')) return
    const updatedPresets = customPresets.filter(p => p.id !== presetId)
    setCustomPresets(updatedPresets)
    const updates = { search_presets_list: JSON.stringify(updatedPresets) }
    if (activePreset === presetId) {
      Object.assign(updates, loadPreset('websites'))
    }
    saveAll(updates)
  }

  const allPlatforms = ['Reddit', 'Craigslist', 'Upwork', 'Mastodon', 'Indeed', 'HackerNews', 'Google Alerts', 'Lionbridge']

  const togglePlatform = (platform) => {
    const current = customPlatforms.split(',').filter(p => p.trim())
    if (current.includes(platform)) {
      setCustomPlatforms(current.filter(p => p !== platform).join(','))
    } else {
      setCustomPlatforms([...current, platform].join(','))
    }
  }

  const renderModeBadge = (mode) => {
    if (!mode || !MODE_SHORT[mode]) return null
    const m = MODE_SHORT[mode]
    return <i className={`fa-solid ${m.icon} ${m.color} text-xs ml-2`} title={MODE_LABELS[mode]?.label}></i>
  }

  const renderActiveBadge = () => (
    <span className="ml-auto bg-orange-500 border-[2px] border-black text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">Active</span>
  )

  return (
    <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
      <div className="px-6 py-5 border-b-[3px] border-black bg-[#f5f0eb] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
            <i className="fa-solid fa-magnifying-glass text-white text-sm"></i>
          </div>
          <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Search Presets</h2>
        </div>
        <button onClick={() => openEditor()}
          className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-4 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:text-orange-500 transition-all flex items-center gap-2">
          <i className="fa-solid fa-plus text-xs"></i> Create
        </button>
      </div>
      <div className="p-6 space-y-6">
        {/* Preset Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(BUILT_IN_PRESETS).map(([id, preset]) => {
            const active = activePreset === id
            return (
              <div key={id}
                onClick={() => loadPreset(id)}
                className={`cursor-pointer border-[3px] border-black transition-all ${
                  active
                    ? 'bg-orange-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]'
                    : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                }`}>
                <div className="p-4">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-xl">{preset.icon}</span>
                    <span className={`text-sm font-black uppercase tracking-wider ${active ? 'text-orange-700' : 'text-gray-700'}`}>
                      {preset.name}
                    </span>
                    {active && renderActiveBadge()}
                    {renderModeBadge(preset.mode)}
                  </div>
                  <p className="text-xs font-bold text-gray-500">{preset.description}</p>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden">
                    {/* Fork button kept but hidden — can unhover to see */}
                  </div>
                  {/* Fork button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditor({ ...preset, id, mode: preset.mode || '' }, true); }}
                    className={`mt-2 bg-white border-[2px] border-black text-gray-500 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <i className="fa-solid fa-pen-to-square text-xs"></i> Fork
                  </button>
                </div>
              </div>
            )
          })}

          {/* Custom Presets */}
          {customPresets.map((preset) => {
            const active = activePreset === preset.id
            return (
              <div key={preset.id}
                onClick={() => loadPreset(preset.id)}
                className={`cursor-pointer border-[3px] border-black transition-all relative group ${
                  active
                    ? 'bg-purple-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px] border-purple-700'
                    : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
                }`}>
                <div className="p-4">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-xl">{preset.icon || "\u2699\uFE0F"}</span>
                    <span className={`text-sm font-black uppercase tracking-wider ${active ? 'text-purple-700' : 'text-gray-700'}`}>
                      {preset.name}
                    </span>
                    {active && renderActiveBadge()}
                    {renderModeBadge(preset.mode)}
                  </div>
                  <p className="text-xs font-bold text-gray-500">{preset.description}</p>
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditor(preset); }}
                      className="bg-white border-[2px] border-black text-gray-500 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all">
                      <i className="fa-solid fa-pen-to-square text-xs"></i> Edit
                    </button>
                    <button
                      onClick={(e) => deletePreset(e, preset.id)}
                      className="bg-white border-[2px] border-black text-gray-500 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] hover:text-red-500 transition-all">
                      <i className="fa-solid fa-trash-can text-xs"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Auto-Apply Config */}
        <div className="border-[3px] border-black bg-white">
          <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                <i className="fa-solid fa-robot text-white text-xs"></i>
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">
                Auto-Apply (LinkedIn)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setValue('auto_apply_mode', 'review')}
                    className={`flex-1 px-3 py-2 border-[3px] border-black text-xs font-black uppercase tracking-wider transition-all ${
                      getValue('auto_apply_mode') !== 'autonomous'
                        ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-gray-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]'
                    }`}>
                    <i className="fa-solid fa-eye mr-1"></i> Review
                  </button>
                  <button
                    onClick={() => setValue('auto_apply_mode', 'autonomous')}
                    className={`flex-1 px-3 py-2 border-[3px] border-black text-xs font-black uppercase tracking-wider transition-all ${
                      getValue('auto_apply_mode') === 'autonomous'
                        ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-gray-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]'
                    }`}>
                    <i className="fa-solid fa-rocket mr-1"></i> Autonomous
                  </button>
                </div>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  {getValue('auto_apply_mode') === 'autonomous'
                    ? 'Agent submits automatically. Browser may run headless.'
                    : 'Agent pauses before final submit for your review.'}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Browser</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setValue('auto_apply_headless', 'false')}
                    className={`flex-1 px-3 py-2 border-[3px] border-black text-xs font-black uppercase tracking-wider transition-all ${
                      getValue('auto_apply_headless') !== 'true'
                        ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-gray-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]'
                    }`}>
                    <i className="fa-solid fa-desktop mr-1"></i> Visible
                  </button>
                  <button
                    onClick={() => setValue('auto_apply_headless', 'true')}
                    className={`flex-1 px-3 py-2 border-[3px] border-black text-xs font-black uppercase tracking-wider transition-all ${
                      getValue('auto_apply_headless') === 'true'
                        ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-gray-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]'
                    }`}>
                    <i className="fa-solid fa-eye-slash mr-1"></i> Headless
                  </button>
                </div>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  Visible browser shows you what the agent is doing.
                </p>
              </div>
            </div>
            <div className="border-[2px] border-black bg-[#f5f0eb] p-3 text-[11px] font-bold text-gray-600">
              <span className="text-orange-600 font-black">Note:</span> Requires a LinkedIn session in{' '}
              <code className="bg-white border-[2px] border-black px-1.5 py-0.5 text-[10px]">linkedin_profile/</code>.
              Log in to LinkedIn once in the visible browser, then the session is reused for all auto-apply runs.
            </div>
          </div>
        </div>

        {/* System Prompts */}
        <div className="border-[3px] border-black bg-white">
          <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-6 h-6 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                <i className="fa-solid fa-message text-white text-xs"></i>
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">
                System Prompts
              </h3>
              <span className="ml-auto text-[10px] font-black text-gray-400 uppercase tracking-wider">Settings → Presets</span>
            </div>
            <SystemPromptEditor />
          </div>
        </div>

        {/* Active settings summary */}
        {activePreset && (() => {
          const p = BUILT_IN_PRESETS[activePreset] || customPresets.find(p => p.id === activePreset)
          if (!p) return null
          return (
            <div className="border-[3px] border-black bg-[#f5f0eb] p-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
                Active: {p.name}
              </h3>
              <div className="text-[11px] font-bold text-gray-600 space-y-1">
                <div><span className="text-gray-800">Keywords:</span> {p.keywords.search_terms}</div>
                <div><span className="text-gray-800">Platforms:</span> {p.keywords.platforms}</div>
                <div><span className="text-gray-800">Exclude:</span> {p.keywords.exclude_terms}</div>
                {p.mode && MODE_LABELS[p.mode] && (
                  <div><span className="text-gray-800">Mode:</span> <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${MODE_LABELS[p.mode].color}`}>{MODE_LABELS[p.mode].label}</span></div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-black bg-[#f5f0eb]">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">
                {editingId ? 'Edit Preset' : 'Create Preset'}
              </h3>
              <button onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 bg-white border-[3px] border-black flex items-center justify-center text-gray-600 font-black hover:text-orange-500 transition-all">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Preset Name</label>
                <input type="text"
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                  placeholder="e.g. My Custom Search"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Search Keywords (comma separated)</label>
                <textarea
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none min-h-[80px]"
                  rows="3"
                  placeholder="need a website, looking for developer..."
                  value={customKeywords}
                  onChange={e => setCustomKeywords(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map(platform => {
                    const selected = customPlatforms.split(',').map(p => p.trim()).includes(platform)
                    return (
                      <button key={platform} onClick={() => togglePlatform(platform)}
                        className={`px-3 py-1.5 border-[3px] border-black text-xs font-black uppercase tracking-wider transition-all ${
                          selected
                            ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-gray-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]'
                        }`}>
                        {platform}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Exclude Terms (optional)</label>
                <input type="text"
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                  placeholder="free, cheap, budget..."
                  value={customExclude}
                  onChange={e => setCustomExclude(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Search Mode (optional)</label>
                <ModeSelector value={customMode} onChange={setCustomMode} compact />
                <p className="text-[10px] font-bold text-gray-400 mt-1.5">Leave empty to use the global default mode.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t-[3px] border-black bg-[#f5f0eb] flex justify-end gap-3">
              <button onClick={() => setIsEditorOpen(false)}
                className="bg-white border-[3px] border-black text-gray-600 font-black text-xs uppercase tracking-wider px-5 py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                Cancel
              </button>
              <button onClick={saveCustomPreset} disabled={saving || !presetName.trim() || !customKeywords.trim()}
                className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50">
                {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
