import React, { useState, useMemo } from 'react'
import ToolCard from '../ToolCard'

const checks = [
  { id: 'format', label: 'Format', test: email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) },
  { id: 'noSpaces', label: 'No Spaces', test: email => !/\s/.test(email) },
  { id: 'hasAt', label: 'Has @', test: email => email.includes('@') },
  { id: 'localPart', label: 'Local Part (1-64)', test: email => { const parts = email.split('@'); return parts[0] && parts[0].length >= 1 && parts[0].length <= 64 } },
  { id: 'domainPart', label: 'Domain (1-253)', test: email => { const parts = email.split('@'); return parts[1] && parts[1].length >= 1 && parts[1].length <= 253 } },
  { id: 'hasDot', label: 'Domain Has Dot', test: email => { const domain = email.split('@')[1]; return domain && domain.includes('.') } },
  { id: 'validTLD', label: 'Valid TLD (2-12)', test: email => { const parts = email.split('@')[1]?.split('.'); return parts && parts.length >= 2 && parts[parts.length - 1].length >= 2 && parts[parts.length - 1].length <= 12 } },
  { id: 'noDoubleDot', label: 'No Double Dots', test: email => !/\.\./.test(email) },
  { id: 'noConsecutiveAt', label: 'Single @', test: email => (email.match(/@/g) || []).length === 1 },
]

export default function EmailValidator() {
  const [email, setEmail] = useState('')

  const results = useMemo(() => {
    if (!email.trim()) return null
    return checks.map(check => ({
      ...check,
      passed: check.test(email.trim())
    }))
  }, [email])

  const passedCount = results ? results.filter(r => r.passed).length : 0
  const totalCount = results ? results.length : 0

  return (
    <ToolCard title="Email Format Validator" description="Validate email addresses with detailed checks" icon="fa-envelope">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter email address..."
            className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
          />
        </div>

        {results && (
          <div className="space-y-3">
            {/* Score header */}
            <div className="flex items-center justify-between bg-[#f5f0eb] border-[3px] border-black px-4 py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-sm font-black text-gray-900 uppercase tracking-wider">Checks</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${passedCount === totalCount ? 'text-green-600' : passedCount >= totalCount / 2 ? 'text-orange-500' : 'text-red-500'}`}>
                  {passedCount}/{totalCount}
                </span>
                <span className={`px-2 py-0.5 border-[2px] border-black text-[10px] font-black uppercase tracking-wider ${
                  passedCount === totalCount ? 'bg-green-500 text-white' : passedCount >= totalCount / 2 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {passedCount === totalCount ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-gray-200 border-[3px] border-black overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  passedCount === totalCount ? 'bg-green-500' : passedCount >= totalCount / 2 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${(passedCount / totalCount) * 100}%` }}
              />
            </div>

            {/* Check list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.map(check => (
                <div
                  key={check.id}
                  className={`flex items-center gap-2 border-[3px] border-black px-3 py-2 transition-all ${
                    check.passed
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className={`w-5 h-5 border-[2px] border-black flex items-center justify-center shrink-0 ${
                    check.passed ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <i className={`fa-solid ${check.passed ? 'fa-check' : 'fa-xmark'} text-white text-[10px]`}></i>
                  </div>
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">{check.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!results && (
          <div className="text-center py-8 text-gray-400">
            <i className="fa-solid fa-envelope text-3xl mb-2"></i>
            <p className="text-xs font-bold uppercase tracking-wider">Enter an email to validate</p>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
