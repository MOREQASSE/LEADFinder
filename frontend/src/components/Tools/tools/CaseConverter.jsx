import React, { useState } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

const cases = [
  { id: 'upper', label: 'UPPERCASE', fn: t => t.toUpperCase() },
  { id: 'lower', label: 'lowercase', fn: t => t.toLowerCase() },
  { id: 'title', label: 'Title Case', fn: t => t.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) },
  { id: 'sentence', label: 'Sentence case', fn: t => t.replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase()) },
  { id: 'camel', label: 'camelCase', fn: t => t.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase()) },
  { id: 'snake', label: 'snake_case', fn: t => t.replace(/([A-Z])/g, '_$1').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_/, '').toLowerCase() },
]

export default function CaseConverter() {
  const [text, setText] = useState('')
  const [activeCase, setActiveCase] = useState(null)

  const converted = activeCase ? cases.find(c => c.id === activeCase)?.fn(text) || '' : ''

  return (
    <ToolCard title="Text Case Converter" description="Convert text between different cases" icon="fa-font">
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setActiveCase(null) }}
          placeholder="Type or paste your text here..."
          className="w-full h-36 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
        />
        <div className="flex flex-wrap gap-2">
          {cases.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCase(c.id)}
              className={`border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                activeCase === c.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {converted && (
          <div className="relative">
            <textarea
              readOnly
              value={converted}
              className="w-full h-36 bg-white border-[3px] border-black px-4 py-3 text-sm font-medium resize-none"
            />
            <div className="absolute top-2 right-2">
              <CopyButton text={converted} />
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
