import React, { useState, useMemo } from 'react'
import ToolCard from '../ToolCard'

const SPAM_TRIGGERS = {
  urgency: {
    label: 'Urgency Words',
    icon: 'fa-clock',
    weight: 15,
    words: ['urgent', 'immediately', 'act now', 'limited time', 'expires', 'deadline', 'hurry', 'dont wait', 'dont miss', 'last chance', 'running out']
  },
  money: {
    label: 'Money Words',
    icon: 'fa-dollar-sign',
    weight: 12,
    words: ['free', 'winner', 'congratulations', 'prize', 'bonus', 'cash', 'earn money', 'make money', 'extra income', 'double your', 'no cost', 'no fees']
  },
  spam: {
    label: 'Spam Phrases',
    icon: 'fa-ban',
    weight: 20,
    words: ['click here', 'buy now', 'order now', 'apply now', 'subscribe', 'opt in', 'unseen', 'hidden', 'secret', 'exclusive deal', 'once in a lifetime']
  },
  caps: {
    label: 'ALL CAPS',
    icon: 'fa-font',
    weight: 8,
    test: (text) => {
      const words = text.split(/\s+/)
      const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w))
      return capsWords.length / Math.max(words.length, 1)
    }
  },
  exclamation: {
    label: 'Excessive !!!!',
    icon: 'fa-exclamation',
    weight: 10,
    test: (text) => {
      const matches = text.match(/!{2,}/g)
      return matches ? matches.length * 0.3 : 0
    }
  },
  links: {
    label: 'Too Many Links',
    icon: 'fa-link',
    weight: 15,
    test: (text) => {
      const links = text.match(/https?:\/\/[^\s]+/g)
      return links ? Math.max(0, (links.length - 1) * 0.5) : 0
    }
  },
  personal: {
    label: 'Lack of Personalization',
    icon: 'fa-user',
    weight: 5,
    test: (text) => {
      const hasName = /\b(dear|hi|hello|hey)\s+\w+/i.test(text)
      return hasName ? 0 : 0.5
    }
  },
  unsubscribe: {
    label: 'Missing Unsubscribe',
    icon: 'fa-right-from-bracket',
    weight: 8,
    test: (text) => {
      const hasUnsub = /unsubscribe|opt.out|remove me/i.test(text)
      return hasUnsub ? 0 : 0.5
    }
  },
}

function analyzeEmail(text) {
  if (!text.trim()) return null

  const results = []
  let totalScore = 0

  for (const [key, trigger] of Object.entries(SPAM_TRIGGERS)) {
    let score = 0
    let details = ''

    if (trigger.words) {
      const found = trigger.words.filter(w => text.toLowerCase().includes(w))
      if (found.length > 0) {
        score = Math.min(1, found.length * 0.4)
        details = `Found: ${found.join(', ')}`
      }
    } else if (trigger.test) {
      const ratio = trigger.test(text)
      score = Math.min(1, ratio)
      details = `Score: ${Math.round(ratio * 100)}%`
    }

    const weightedScore = Math.round(score * trigger.weight)
    totalScore += weightedScore

    results.push({
      id: key,
      label: trigger.label,
      icon: trigger.icon,
      score: weightedScore,
      maxScore: trigger.weight,
      passed: score < 0.3,
      details,
    })
  }

  const maxPossible = Object.values(SPAM_TRIGGERS).reduce((sum, t) => sum + t.weight, 0)
  const spamScore = Math.min(100, Math.round((totalScore / maxPossible) * 100))

  return { results, spamScore }
}

export default function SpamChecker() {
  const [text, setText] = useState('')

  const analysis = useMemo(() => analyzeEmail(text), [text])

  const getScoreColor = (score) => {
    if (score <= 30) return 'bg-green-500'
    if (score <= 60) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScoreLabel = (score) => {
    if (score <= 30) return 'Low Risk'
    if (score <= 60) return 'Medium Risk'
    return 'High Risk'
  }

  return (
    <ToolCard title="Cold Email Spam Checker" description="Check your email for spam triggers and improve deliverability" icon="fa-shield-halved">
      <div className="space-y-5">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your cold email here to check for spam triggers..."
          className="w-full h-48 bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none"
        />

        {analysis && (
          <div className="space-y-4">
            {/* Score header */}
            <div className="bg-[#f5f0eb] border-[3px] border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-gray-900 uppercase tracking-wider">Spam Score</span>
                <span className={`px-3 py-1 border-[2px] border-black text-xs font-black uppercase tracking-wider text-white ${getScoreColor(analysis.spamScore)}`}>
                  {getScoreLabel(analysis.spamScore)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-6 bg-gray-200 border-[3px] border-black overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getScoreColor(analysis.spamScore)}`}
                    style={{ width: `${analysis.spamScore}%` }}
                  />
                </div>
                <span className="text-xl font-black text-gray-900">{analysis.spamScore}</span>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-2">
              {analysis.results.map(result => (
                <div
                  key={result.id}
                  className={`border-[3px] border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    result.passed ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 border-[2px] border-black flex items-center justify-center ${
                        result.passed ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        <i className={`fa-solid ${result.passed ? 'fa-check' : 'fa-xmark'} text-white text-[10px]`}></i>
                      </div>
                      <i className={`fa-solid ${result.icon} text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}></i>
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider">{result.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.details && (
                        <span className="text-[10px] font-bold text-gray-500">{result.details}</span>
                      )}
                      <span className={`text-xs font-black ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {result.score}/{result.maxScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            {analysis.spamScore > 30 && (
              <div className="bg-orange-50 border-[3px] border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-lightbulb text-orange-500"></i>
                  <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Tips to Improve</span>
                </div>
                <ul className="space-y-1 text-xs font-bold text-gray-700">
                  {analysis.spamScore > 50 && <li>• Reduce urgency and money-related words</li>}
                  {analysis.results.find(r => r.id === 'caps' && !r.passed) && <li>• Avoid using too many ALL CAPS words</li>}
                  {analysis.results.find(r => r.id === 'exclamation' && !r.passed) && <li>• Limit exclamation marks to 1-2 per email</li>}
                  {analysis.results.find(r => r.id === 'links' && !r.passed) && <li>• Keep links to a maximum of 1-2 per email</li>}
                  {analysis.results.find(r => r.id === 'personal' && !r.passed) && <li>• Add personalization with the recipient's name</li>}
                  {analysis.results.find(r => r.id === 'unsubscribe' && !r.passed) && <li>• Include an unsubscribe option for compliance</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {!analysis && (
          <div className="text-center py-8 text-gray-400">
            <i className="fa-solid fa-shield-halved text-3xl mb-2"></i>
            <p className="text-xs font-bold uppercase tracking-wider">Enter email text to analyze</p>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
