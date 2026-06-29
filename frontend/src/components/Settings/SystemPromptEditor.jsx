import React from 'react'
import { useSettings } from '../../hooks/useSettings'

const TEMPLATE_VARS = [
  '{lead_name}', '{platform}', '{description}',
  '{name}', '{email}', '{phone}', '{portfolio}',
  '{skills}', '{pricing}', '{tone}', '{availability}',
]

const PROMPT_DEFINITIONS = [
  {
    key: 'prompt_maps_draft',
    title: 'Maps Draft Reply',
    description: 'Full AI instruction for generating draft replies to Google Maps leads. Uses template variables — the seed builds a complete prompt with lead info, your resume data, and formatting rules.',
    seed: 'Write a short, professional email to this local business owner offering web development services.',
  },
]

export default function SystemPromptEditor() {
  const { getValue, setValue } = useSettings()
  const [expanded, setExpanded] = React.useState('prompt_maps_draft')

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-gray-500 leading-relaxed">
        Custom prompts replace the entire AI instruction. Use <code className="bg-gray-100 border-[1px] border-black px-1 text-[10px]">{'{lead_name}'}</code> etc. to inject lead/resume data.
        Leave blank to use the seed default.
      </p>
      <div className="flex flex-wrap gap-1.5 text-[10px] mb-2">
        <span className="text-gray-500 font-black uppercase tracking-wider mr-1">Variables:</span>
        {TEMPLATE_VARS.map(v => (
          <code key={v} className="bg-gray-100 border-[1px] border-black px-1.5 py-0.5 font-bold text-gray-700">{v}</code>
        ))}
      </div>
      {PROMPT_DEFINITIONS.map(pd => {
        const current = getValue(pd.key, '')
        const isCustom = !!current
        const isOpen = expanded === pd.key

        return (
          <div key={pd.key} className="border-[3px] border-black bg-white">
            <button
              onClick={() => setExpanded(isOpen ? null : pd.key)}
              className="flex items-center justify-between w-full px-5 py-3 bg-[#f5f0eb] border-b-[3px] border-black hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-left">
                  <span className="text-sm font-black uppercase tracking-wider text-gray-800">{pd.title}</span>
                  {isCustom && (
                    <span className="ml-2 text-[10px] font-black text-orange-500 bg-orange-50 border-[2px] border-orange-300 px-1.5 py-0.5 uppercase tracking-wider">
                      Custom
                    </span>
                  )}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="p-5 space-y-4">
                <p className="text-xs font-bold text-gray-500 leading-relaxed">{pd.description}</p>
                <textarea
                  className="w-full bg-white border-[3px] border-black p-3 text-sm font-mono min-h-[180px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                  value={current}
                  onChange={(e) => setValue(pd.key, e.target.value)}
                  placeholder={pd.seed}
                />
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-gray-400 font-medium leading-relaxed">
                    <span className="text-gray-600 font-bold uppercase tracking-wider">Seed: </span>
                    <span className="italic">{pd.seed}</span>
                  </div>
                  <button
                    onClick={() => setValue(pd.key, '')}
                    className="flex items-center gap-1.5 bg-white border-[3px] border-black px-3 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset to Seed
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
