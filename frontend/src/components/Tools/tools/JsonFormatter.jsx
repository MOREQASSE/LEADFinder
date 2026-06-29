import React, { useState } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState(2)
  const [error, setError] = useState('')

  const format = (minify = false) => {
    if (!input.trim()) return ''
    setError('')
    try {
      const parsed = JSON.parse(input)
      if (minify) return JSON.stringify(parsed)
      return JSON.stringify(parsed, null, indent)
    } catch (e) {
      setError(e.message)
      return ''
    }
  }

  const output = format()

  return (
    <ToolCard title="JSON Formatter & Validator" description="Format, validate, and minify JSON data" icon="fa-code">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setInput(format())}
            disabled={!input.trim()}
            className="bg-orange-500 border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-indent mr-1"></i> Format
          </button>
          <button
            onClick={() => setInput(format(true))}
            disabled={!input.trim()}
            className="bg-white border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-minimize mr-1"></i> Minify
          </button>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Indent:</span>
            {[2, 4, 8].map(v => (
              <button
                key={v}
                onClick={() => setIndent(v)}
                className={`w-8 h-8 border-[3px] border-black text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  indent === v ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Input</div>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              placeholder='{"key": "value"}'
              className="w-full h-64 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-mono focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
              spellCheck={false}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Output</div>
              {error && <span className="text-[10px] font-black text-red-500 uppercase tracking-wider"><i className="fa-solid fa-xmark mr-1"></i>Invalid JSON</span>}
              {!error && output && <span className="text-[10px] font-black text-green-600 uppercase tracking-wider"><i className="fa-solid fa-check mr-1"></i>Valid JSON</span>}
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={error ? `Error: ${error}` : output}
                className={`w-full h-64 bg-white border-[3px] border-black px-4 py-3 text-sm font-mono resize-none ${error ? 'text-red-600' : ''}`}
              />
              {output && !error && (
                <div className="absolute top-2 right-2">
                  <CopyButton text={output} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  )
}
