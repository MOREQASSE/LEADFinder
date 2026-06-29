import React, { useState, useCallback } from 'react'

export default function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [text])

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className={`inline-flex items-center gap-1.5 border-[3px] border-black font-black text-[10px] uppercase tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${
        copied
          ? 'bg-green-500 text-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
          : 'bg-orange-500 text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]'
      }`}
    >
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
      {copied ? 'Copied!' : label}
    </button>
  )
}
