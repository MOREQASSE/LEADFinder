import React, { useState } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

const ALGORITHMS = [
  { id: 'SHA-256', label: 'SHA-256' },
  { id: 'SHA-1', label: 'SHA-1' },
  { id: 'SHA-384', label: 'SHA-384' },
  { id: 'SHA-512', label: 'SHA-512' },
]

async function hashText(text, algorithm) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest(algorithm, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function HashGenerator() {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState('SHA-256')
  const [hashes, setHashes] = useState({})
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!input) return
    setLoading(true)
    const result = {}
    for (const algo of ALGORITHMS) {
      result[algo.id] = await hashText(input, algo.id)
    }
    setHashes(result)
    setLoading(false)
  }

  return (
    <ToolCard title="Hash Generator" description="Generate SHA-256, SHA-1, SHA-384, SHA-512 hashes" icon="fa-fingerprint">
      <div className="space-y-4">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="w-full h-28 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
        />
        <div className="flex flex-wrap gap-2">
          {ALGORITHMS.map(algo => (
            <button
              key={algo.id}
              onClick={() => setAlgorithm(algo.id)}
              className={`border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                algorithm === algo.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              {algo.label}
            </button>
          ))}
        </div>
        <button
          onClick={generate}
          disabled={!input}
          className="w-full bg-orange-500 border-[3px] border-black px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span><i className="fa-solid fa-spinner animate-spin mr-2"></i>Generating...</span>
          ) : (
            <span><i className="fa-solid fa-fingerprint mr-2"></i>Generate Hashes</span>
          )}
        </button>
        {Object.keys(hashes).length > 0 && (
          <div className="space-y-2">
            {ALGORITHMS.map(algo => (
              <div key={algo.id} className="bg-white border-[3px] border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{algo.label}</span>
                  <CopyButton text={hashes[algo.id]} />
                </div>
                <div className="text-xs font-mono text-gray-900 break-all bg-[#f5f0eb] border-[2px] border-black p-2 select-all">
                  {hashes[algo.id]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolCard>
  )
}
