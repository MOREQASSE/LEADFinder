import React from 'react'
import api from '../../services/api'

const RECOMMENDED_MODELS = {
  openrouter: [
    { value: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B Instruct' },
    { value: 'meta-llama/llama-3-8b-instruct', label: 'Llama 3 8B Instruct' },
    { value: 'google/gemma-2-9b-it', label: 'Gemma 2 9B IT' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
  ],
  github: [
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
    { value: 'mistralai/mistral-large', label: 'Mistral Large' },
    { value: 'cohere/command-r-plus', label: 'Command R+' },
  ],
  azure: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B Instruct' },
    { value: 'Mistral-large', label: 'Mistral Large' },
    { value: 'Phi-3-small-8k-instruct', label: 'Phi-3 Small 8K Instruct' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
  ],
  google: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Exp)' },
  ],
}

const PROVIDER_LABELS = {
  openrouter: 'OpenRouter',
  github: 'GitHub AI',
  azure: 'Azure AI Inference',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
}

function HelpIcon() {
  const [show, setShow] = React.useState(false)
  const [fixed, setFixed] = React.useState(false)
  const containerRef = React.useRef(null)

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShow(false)
        setFixed(false)
      }
    }
    if (show || fixed) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [show, fixed])

  const handleClick = () => {
    if (fixed) { setFixed(false); setShow(false) }
    else { setFixed(true); setShow(true) }
  }

  return (
    <div ref={containerRef} className="relative inline-block ml-2 align-middle">
      <button
        onClick={handleClick}
        onMouseEnter={() => { if (!fixed) setShow(true) }}
        onMouseLeave={() => { if (!fixed) setShow(false) }}
        className="w-5 h-5 bg-white border-[2px] border-black text-gray-600 font-black text-[10px] leading-none flex items-center justify-center hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
      >
        ?
      </button>
      {(show || fixed) && (
        <div
          className="absolute z-50 left-7 top-0 w-96 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xs font-bold text-gray-700"
          onMouseEnter={() => { if (!fixed) setShow(true) }}
          onMouseLeave={() => { if (!fixed) setShow(false) }}
        >
          <div className="font-black text-orange-600 uppercase tracking-wider text-[10px] mb-3">How to get API Keys (FREE options)</div>
          <div className="space-y-3">
            <div>
              <p className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1">OpenRouter</p>
              <p className="text-[11px] font-bold">openrouter.ai → Settings → API Keys. Free credits monthly.</p>
            </div>
            <div>
              <p className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1">GitHub AI</p>
              <p className="text-[11px] font-bold">github.com/settings/tokens → Generate classic token (no scopes). 100% FREE. Uses provider/model-name format.</p>
            </div>
            <div>
              <p className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1">Azure AI Inference</p>
              <p className="text-[11px] font-bold">Same GitHub token. Uses model-name format. endpoint: models.inference.ai.azure.com</p>
            </div>
            <div>
              <p className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1">OpenAI</p>
              <p className="text-[11px] font-bold">platform.openai.com/api-keys. Free trial credits available.</p>
            </div>
            <div>
              <p className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1">Anthropic</p>
              <p className="text-[11px] font-bold">console.anthropic.com → API Keys. Free trial credits.</p>
            </div>
            <div>
              <p className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1">Google Gemini</p>
              <p className="text-[11px] font-bold">aistudio.google.com → Get API Key. FREE tier available.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ModelSelector() {
  const [configs, setConfigs] = React.useState([])
  const [newConfig, setNewConfig] = React.useState({ provider: 'openrouter', model: '', api_key: '', is_primary: false })
  const [useCustomModel, setUseCustomModel] = React.useState(false)

  React.useEffect(() => {
    api.get('/ai/config').then(r => setConfigs(r.data)).catch(() => {})
  }, [])

  const addConfig = async () => {
    if (!newConfig.model) return
    const res = await api.post('/ai/config', newConfig)
    setConfigs(prev => [...prev, res.data])
    setNewConfig({ provider: 'openrouter', model: '', api_key: '', is_primary: false })
    setUseCustomModel(false)
  }

  const removeConfig = async (id) => {
    await api.delete(`/ai/config/${id}`)
    setConfigs(prev => prev.filter(c => c.id !== id))
  }

  const setPrimary = async (id) => {
    await api.post(`/ai/config/${id}/primary`)
    setConfigs(prev => prev.map(c => ({ ...c, is_primary: c.id === id })))
  }

  const handleProviderChange = (provider) => {
    setUseCustomModel(false)
    const models = RECOMMENDED_MODELS[provider]
    setNewConfig(prev => ({ ...prev, provider, model: models?.[0]?.value || '' }))
  }

  const handleModelSelect = (value) => {
    if (value === '__custom__') {
      setUseCustomModel(true)
      setNewConfig(prev => ({ ...prev, model: '' }))
    } else {
      setNewConfig(prev => ({ ...prev, model: value }))
    }
  }

  const currentModels = RECOMMENDED_MODELS[newConfig.provider] || []

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {configs.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-[#f5f0eb] border-[3px] border-black px-5 py-3">
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="text-orange-600 uppercase text-[10px] tracking-wider">{PROVIDER_LABELS[c.provider] || c.provider}</span>
              <span className="text-gray-500">({c.model})</span>
              {c.is_primary && (
                <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">Primary</span>
              )}
              <span className="text-gray-400 text-xs">{c.rate_limit_rpm} rpm</span>
              {c.api_key && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 uppercase tracking-wider border-[2px] border-emerald-800">Key Set</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!c.is_primary && (
                <button onClick={() => setPrimary(c.id)}
                  className="bg-white border-[3px] border-black text-gray-600 font-black text-xs uppercase tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:text-orange-500 transition-all">
                  Make Primary
                </button>
              )}
              <button onClick={() => removeConfig(c.id)}
                className="bg-white border-[3px] border-black text-gray-600 font-black text-xs uppercase tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:text-red-500 transition-all">
                Remove
              </button>
            </div>
          </div>
        ))}
        {configs.length === 0 && (
          <div className="border-[3px] border-dashed border-black p-8 text-center">
            <p className="text-sm font-bold text-gray-400">No AI models configured yet.</p>
            <p className="text-xs font-bold text-gray-300 mt-1">Add one below to get started.</p>
          </div>
        )}
      </div>
      <div className="border-t-[3px] border-black pt-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-600 mb-4">Add New Model <HelpIcon /></h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Provider</label>
            <select className="bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium outline-none"
              value={newConfig.provider}
              onChange={e => handleProviderChange(e.target.value)}>
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Model</label>
            {useCustomModel ? (
              <input className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="Enter custom model name"
                value={newConfig.model}
                onChange={e => setNewConfig(prev => ({ ...prev, model: e.target.value }))} />
            ) : (
              <select className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium outline-none"
                value={newConfig.model}
                onChange={e => handleModelSelect(e.target.value)}>
                {currentModels.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
                <option value="__custom__">—— Custom Model ——</option>
              </select>
            )}
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">API Key</label>
            <input className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
              type="password" placeholder="Enter API key"
              value={newConfig.api_key}
              onChange={e => setNewConfig(prev => ({ ...prev, api_key: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <input type="checkbox" id="is_primary"
              className="w-4 h-4 border-[3px] border-black accent-orange-500"
              checked={newConfig.is_primary}
              onChange={e => setNewConfig(prev => ({ ...prev, is_primary: e.target.checked }))} />
            <label htmlFor="is_primary" className="text-xs font-bold text-gray-600 uppercase tracking-wider">Primary</label>
          </div>
          <button onClick={addConfig}
            className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-5 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
