import React, { useState, useCallback, useEffect } from 'react'
import ToolCard from '../ToolCard'
import CopyButton from '../CopyButton'

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

function getStrength(password) {
  let score = 0
  if (password.length >= 12) score += 2
  else if (password.length >= 8) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  if (password.length >= 16) score += 1
  return Math.min(score, 5)
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600']

export default function PasswordGenerator() {
  const [length, setLength] = useState(16)
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  })
  const [password, setPassword] = useState('')
  const [history, setHistory] = useState([])

  const generate = useCallback(() => {
    let chars = ''
    if (options.uppercase) chars += CHARSETS.uppercase
    if (options.lowercase) chars += CHARSETS.lowercase
    if (options.numbers) chars += CHARSETS.numbers
    if (options.symbols) chars += CHARSETS.symbols
    if (!chars) {
      setPassword('')
      return
    }
    const arr = new Uint32Array(length)
    crypto.getRandomValues(arr)
    const pwd = Array.from(arr, x => chars[x % chars.length]).join('')
    setPassword(pwd)
    setHistory(prev => [pwd, ...prev].slice(0, 5))
  }, [length, options])

  useEffect(() => { generate() }, [generate])

  const strength = getStrength(password)

  return (
    <ToolCard title="Password Generator" description="Generate secure random passwords" icon="fa-lock">
      <div className="space-y-5">
        {/* Password display */}
        <div className="bg-[#f5f0eb] border-[3px] border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-mono font-bold text-gray-900 break-all flex-1 select-all">{password || 'Select a charset'}</div>
            <CopyButton text={password} />
          </div>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-2 flex-1 border-[2px] border-black transition-all ${i <= strength ? STRENGTH_LABELS[strength] ? STRENGTH_COLORS[strength] : 'bg-gray-200' : 'bg-gray-200'}`}></div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{STRENGTH_LABELS[strength] || 'N/A'}</span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{password.length} chars</span>
          </div>
        </div>

        {/* Length slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Length</span>
            <span className="text-sm font-black text-orange-500">{length}</span>
          </div>
          <input
            type="range"
            min={4}
            max={64}
            value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="w-full h-3 bg-gray-200 border-[3px] border-black appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-black text-gray-400">4</span>
            <span className="text-[10px] font-black text-gray-400">64</span>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries({ uppercase: 'ABC', lowercase: 'abc', numbers: '123', symbols: '#$%' }).map(([key, label]) => (
            <label
              key={key}
              className={`flex items-center gap-2 border-[3px] border-black px-3 py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                options[key]
                  ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-gray-700 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-orange-50'
              }`}
            >
              <input
                type="checkbox"
                checked={options[key]}
                onChange={e => setOptions({ ...options, [key]: e.target.checked })}
                className="sr-only"
              />
              <i className={`fa-solid ${options[key] ? 'fa-check-square' : 'fa-square'}`}></i>
              <span>{label}</span>
              <span className="text-[10px] font-bold opacity-70 ml-auto">{key}</span>
            </label>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          className="w-full bg-orange-500 border-[3px] border-black px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <i className="fa-solid fa-rotate mr-2"></i> Generate New Password
        </button>

        {/* History */}
        {history.length > 1 && (
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Recent</div>
            <div className="space-y-1">
              {history.slice(1).map((pwd, i) => (
                <div key={i} className="flex items-center gap-2 bg-white border-[2px] border-black px-3 py-1.5 text-xs font-mono text-gray-600">
                  <span className="flex-1 truncate">{pwd}</span>
                  <CopyButton text={pwd} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
