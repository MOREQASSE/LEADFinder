import React from 'react'

const MODES = [
  {
    id: 'job_hunter',
    label: 'Job Hunter',
    icon: 'fa-briefcase',
    description: 'Find employment, full-time roles, and contract positions. Focuses on job boards and hiring posts.',
    color: 'blue',
  },
  {
    id: 'internship_scout',
    label: 'Internship Scout',
    icon: 'fa-graduation-cap',
    description: 'Discover internships, graduate programs, and entry-level positions for newcomers.',
    color: 'green',
  },
  {
    id: 'clients_excavator',
    label: 'Clients Excavator',
    icon: 'fa-users',
    description: 'Find buyers and people who need services. Best for freelancers and agencies seeking clients.',
    color: 'orange',
  },
]

export default function ModeSelector({ value, onChange, compact }) {
  return (
    <div className={compact ? 'flex gap-2' : 'grid grid-cols-1 md:grid-cols-3 gap-3'}>
      {MODES.map((mode) => {
        const active = value === mode.id
        const colorMap = {
          blue: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', icon: 'text-blue-500', ring: 'ring-blue-100' },
          green: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', icon: 'text-green-500', ring: 'ring-green-100' },
          orange: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', icon: 'text-amber-500', ring: 'ring-amber-100' },
        }
        const c = colorMap[mode.color]
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`relative text-left transition-all duration-200 ${
              compact
                ? `px-3 py-2 rounded-lg text-xs font-medium border ${
                    active
                      ? `${c.bg} ${c.border} ${c.text} ring-2 ${c.ring}`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`
                : `p-4 rounded-xl border-2 ${
                    active
                      ? `${c.bg} ${c.border} ${c.text} ring-4 ${c.ring}`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`
            }`}
          >
            {!compact && (
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3 ${active ? c.icon : 'text-gray-400'}`}>
                <i className={`fa-solid ${mode.icon} text-lg`}></i>
              </div>
            )}
            <div className="flex items-center gap-2">
              {compact && <i className={`fa-solid ${mode.icon} text-xs ${active ? c.icon : 'text-gray-400'}`}></i>}
              <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{mode.label}</span>
              {active && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                  active ? `${c.bg} ${c.text}` : ''
                }`}>
                  Active
                </span>
              )}
            </div>
            {!compact && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{mode.description}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { MODES }
