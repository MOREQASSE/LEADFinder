import React, { useState } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

export default function Base64Tool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('encode')
  const [error, setError] = useState('')

  const getOutput = () => {
    if (!input) return ''
    setError('')
    try {
      if (mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(input)))
        return encoded
      } else {
        const decoded = decodeURIComponent(escape(atob(input)))
        return decoded
      }
    } catch (e) {
      setError('Invalid input for this mode')
      return ''
    }
  }

  const output = getOutput()

  return (
    <ToolCard title="Base64 Encoder / Decoder" description="Encode and decode Base64 strings with UTF-8 support" icon="fa-key">
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
        </div>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          placeholder={mode === 'encode' ? 'Enter text to encode to Base64...' : 'Enter Base64 string to decode...'}
          className="w-full h-32 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium font-mono focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
        />
        {error && (
          <div className="bg-red-100 border-[3px] border-black px-4 py-2 text-xs font-black text-red-700 uppercase tracking-wider">
            <i className="fa-solid fa-exclamation-triangle mr-1"></i> {error}
          </div>
        )}
        {output && !error && (
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
