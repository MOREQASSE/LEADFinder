import React, { useState, useMemo } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

const options = [
  { id: 'extraSpaces', label: 'Extra Spaces', desc: 'Collapse multiple spaces to single', default: true },
  { id: 'trailingWhitespace', label: 'Trailing Whitespace', desc: 'Remove spaces/tabs at line ends', default: true },
  { id: 'extraNewlines', label: 'Extra Newlines', desc: 'Collapse 3+ newlines to 2', default: true },
  { id: 'leadingWhitespace', label: 'Leading Whitespace', desc: 'Remove spaces/tabs at line starts', default: false },
  { id: 'tabsToSpaces', label: 'Tabs to Spaces', desc: 'Convert tabs to 2 spaces', default: false },
]

export default function WhitespaceCleaner() {
  const [text, setText] = useState('')
  const [opts, setOpts] = useState(() => {
    const o = {}
    options.forEach(opt => { o[opt.id] = opt.default })
    return o
  })

  const cleaned = useMemo(() => {
    if (!text) return ''
    let result = text
    if (opts.extraSpaces) result = result.replace(/[^\S\n]+/g, ' ')
    if (opts.trailingWhitespace) result = result.replace(/[^\S\n]+$/gm, '')
    if (opts.extraNewlines) result = result.replace(/\n{3,}/g, '\n\n')
    if (opts.leadingWhitespace) result = result.replace(/^[^\S\n]+/gm, '')
    if (opts.tabsToSpaces) result = result.replace(/\t/g, '  ')
    return result
  }, [text, opts])

  const savedBytes = text.length - cleaned.length

  return (
    <ToolCard title="Whitespace Cleaner" description="Remove extra spaces, tabs, and newlines" icon="fa-eraser">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <label
              key={opt.id}
              className={`inline-flex items-center gap-2 border-[3px] border-black px-3 py-2 text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                opts[opt.id]
                  ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-gray-700 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-50'
              }`}
            >
              <input
                type="checkbox"
                checked={opts[opt.id]}
                onChange={e => setOpts({ ...opts, [opt.id]: e.target.checked })}
                className="sr-only"
              />
              <i className={`fa-solid ${opts[opt.id] ? 'fa-check-square' : 'fa-square'}`}></i>
              {opt.label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Input</div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste your text here..."
              className="w-full h-48 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Output</div>
              {savedBytes > 0 && (
                <span className="text-[10px] font-black text-green-600 uppercase tracking-wider">
                  <i className="fa-solid fa-arrow-down mr-1"></i>{savedBytes} chars saved
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={cleaned}
                className="w-full h-48 bg-white border-[3px] border-black px-4 py-3 text-sm font-medium resize-none"
              />
              <div className="absolute top-2 right-2">
                <CopyButton text={cleaned} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  )
}
