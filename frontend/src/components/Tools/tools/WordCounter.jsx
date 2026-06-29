import React, { useState, useMemo } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

export default function WordCounter() {
  const [text, setText] = useState('')

  const stats = useMemo(() => {
    if (!text) return { chars: 0, charsNoSpace: 0, words: 0, sentences: 0, lines: 0, paragraphs: 0 }
    const chars = text.length
    const charsNoSpace = text.replace(/\s/g, '').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0
    const lines = text ? text.split('\n').length : 0
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0
    return { chars, charsNoSpace, words, sentences, lines, paragraphs }
  }, [text])

  return (
    <ToolCard title="Word & Character Counter" description="Count characters, words, sentences, lines and paragraphs" icon="fa-font">
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full h-48 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
        />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'Characters', value: stats.chars },
            { label: 'No Spaces', value: stats.charsNoSpace },
            { label: 'Words', value: stats.words },
            { label: 'Sentences', value: stats.sentences },
            { label: 'Lines', value: stats.lines },
            { label: 'Paragraphs', value: stats.paragraphs },
          ].map(s => (
            <div key={s.label} className="bg-[#f5f0eb] border-[3px] border-black p-3 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-xl font-black text-orange-500">{s.value}</div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <CopyButton text={text} />
        </div>
      </div>
    </ToolCard>
  )
}
