import React, { useState } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

export default function UrlEncoder() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('encode')
  const [componentMode, setComponentMode] = useState(false)

  const getOutput = () => {
    if (!input) return ''
    try {
      if (mode === 'encode') {
        return componentMode ? encodeURIComponent(input) : encodeURI(input)
      } else {
        return componentMode ? decodeURIComponent(input) : decodeURI(input)
      }
    } catch (e) {
      return `Error: ${e.message}`
    }
  }

  const output = getOutput()

  return (
    <ToolCard title="URL Encoder / Decoder" description="Encode and decode URLs and query parameters" icon="fa-link">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('encode')}
            className={`border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
              mode === 'encode'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <i className="fa-solid fa-lock mr-1"></i> Encode
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
              mode === 'decode'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <i className="fa-solid fa-unlock mr-1"></i> Decode
          </button>
          <div className="border-l-[3px] border-black mx-1"></div>
          <button
            onClick={() => setComponentMode(!componentMode)}
            className={`border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
              componentMode
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            {componentMode ? 'Component' : 'Full URL'}
          </button>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'encode' ? 'Enter URL or text to encode...' : 'Enter encoded URL to decode...'}
          className="w-full h-32 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium font-mono focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
        />
        {output && (
          <div className="relative">
            <textarea
              readOnly
              value={output}
              className="w-full h-32 bg-white border-[3px] border-black px-4 py-3 text-sm font-medium font-mono resize-none"
            />
            <div className="absolute top-2 right-2">
              <CopyButton text={output} />
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
