import React, { useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import ToolCard from '../ToolCard'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const ATS_CHECKS = {
  sections: {
    label: 'Key Sections Present',
    icon: 'fa-list-check',
    weight: 20,
    test: (text) => {
      const patterns = [
        { name: 'Experience', regex: /\b(experience|work\s*history|employment|professional\s*background)\b/i },
        { name: 'Education', regex: /\b(education|academic|degree|university|college|bachelor|master|phd)\b/i },
        { name: 'Skills', regex: /\b(skills?|technologies|competenc|proficiencies|tools)\b/i },
        { name: 'Summary', regex: /\b(summary|objective|profile|about\s*me|professional\s*summary)\b/i },
      ]
      const found = patterns.filter(p => p.regex.test(text))
      return {
        score: found.length / patterns.length,
        details: found.length > 0 ? `Found: ${found.map(p => p.name).join(', ')}` : 'Missing section headers'
      }
    }
  },
  contactInfo: {
    label: 'Contact Information',
    icon: 'fa-address-card',
    weight: 15,
    test: (text) => {
      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
      const emails = text.match(emailRegex) || []
      const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))]

      const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
      const phones = text.match(phoneRegex) || []
      const realPhones = phones.filter(p => p.replace(/\D/g, '').length >= 7)

      const hasLinkedIn = /linkedin\.com\/in\/[a-zA-Z0-9\-_]+/i.test(text)
      const hasGitHub = /github\.com\/[a-zA-Z0-9\-_]+/i.test(text)
      const hasWebsite = /https?:\/\/[^\s]+|www\.[^\s]+/i.test(text)

      const found = []
      if (uniqueEmails.length > 0) found.push(`Email (${uniqueEmails[0]})`)
      if (realPhones.length > 0) found.push('Phone')
      if (hasLinkedIn) found.push('LinkedIn')
      if (hasGitHub) found.push('GitHub')
      if (hasWebsite) found.push('Website')

      return {
        score: Math.min(1, found.length / 2),
        details: found.length > 0 ? found.join(', ') : 'No contact info detected',
      }
    }
  },
  bullets: {
    label: 'Bullet Point Format',
    icon: 'fa-list-ul',
    weight: 15,
    test: (text) => {
      const lines = text.split('\n').filter(l => l.trim().length > 10)
      const bulletLines = lines.filter(l =>
        /^[•\-\*►▸‣–>]/.test(l.trim()) ||
        /^\d+[.)]\s/.test(l.trim()) ||
        /^[A-Z][a-z]+\s\w+\s(led|managed|developed|created|built|increased|reduced|improved|achieved|delivered|implemented|designed|launched|optimized|streamlined|spearheaded|drove|scaled|established|orchestrated|pioneered|transformed|strengthened|accelerated|eliminated|revitalized|simplified|unified|expanded|surpassed|outperformed|exceeded|generated|produced|programmed|refactored|restructured|negotiated|supervised|introduced|exhibited|demonstrated|facilitated|coordinated|mentored)/i.test(l.trim())
      )
      const ratio = lines.length > 0 ? bulletLines.length / lines.length : 0
      return {
        score: Math.min(1, ratio * 2.5),
        details: `${bulletLines.length} of ${lines.length} lines are bullet points`
      }
    }
  },
  length: {
    label: 'Optimal Length',
    icon: 'fa-ruler-vertical',
    weight: 10,
    test: (text) => {
      const words = text.trim().split(/\s+/).filter(Boolean).length
      if (words >= 300 && words <= 800) return { score: 1, details: `${words} words (ideal)` }
      if (words >= 200 && words <= 1000) return { score: 0.7, details: `${words} words (acceptable)` }
      if (words < 200) return { score: 0.3, details: `${words} words (too short)` }
      return { score: 0.5, details: `${words} words (too long)` }
    }
  },
  numbers: {
    label: 'Quantifiable Results',
    icon: 'fa-chart-line',
    weight: 15,
    test: (text) => {
      const matches = text.match(/\d+[%$KMBkmb]|\$\d[\d,.]*|\d+x|\d+\s*(years?|months?|projects?|teams?|clients?|users?|customers?|revenue|growth|increase|reduction|savings|profit)/gi) || []
      return {
        score: Math.min(1, matches.length / 5),
        details: `${matches.length} quantified achievements`
      }
    }
  },
  powerWords: {
    label: 'Action Verbs',
    icon: 'fa-bolt',
    weight: 10,
    test: (text) => {
      const verbs = [
        'achieved', 'accelerated', 'accomplished', 'delivered', 'designed',
        'developed', 'drove', 'eliminated', 'engineered', 'established',
        'exceeded', 'executed', 'expanded', 'generated', 'grew',
        'implemented', 'improved', 'increased', 'innovated', 'introduced',
        'launched', 'led', 'managed', 'negotiated', 'optimized',
        'orchestrated', 'outperformed', 'pioneered', 'produced', 'reduced',
        'refactored', 'scaled', 'simplified', 'spearheaded', 'strengthened',
        'supervised', 'surpassed', 'transformed', 'unified', 'upgraded'
      ]
      const lower = text.toLowerCase()
      const found = verbs.filter(v => lower.includes(v))
      return {
        score: Math.min(1, found.length / 8),
        details: `${found.length} action verbs: ${found.slice(0, 5).join(', ')}${found.length > 5 ? '...' : ''}`
      }
    }
  },
  formatting: {
    label: 'Clean Formatting',
    icon: 'fa-text-width',
    weight: 10,
    test: (text) => {
      const issues = []
      if (/\t/.test(text)) issues.push('Tabs')
      if (/ {3,}/.test(text)) issues.push('Multiple spaces')
      if (/{|}|\[|\]|\\|\/\//.test(text)) issues.push('Code syntax')
      if (/\.(jpg|png|gif|svg|bmp)/i.test(text)) issues.push('Image refs')
      if (/\|/.test(text) && text.split('\n').filter(l => l.includes('|')).length > 5) issues.push('Table pipes')
      return {
        score: Math.max(0, 1 - issues.length * 0.2),
        details: issues.length > 0 ? `Issues: ${issues.join(', ')}` : 'Clean formatting'
      }
    }
  },
  passive: {
    label: 'Active Voice',
    icon: 'fa-person-running',
    weight: 5,
    test: (text) => {
      const passive = text.match(/\b(was|were|been|being|is|are|am)\s+(being\s+)?\w+ed\b/gi) || []
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5).length || 1
      const ratio = passive.length / sentences
      return {
        score: Math.max(0, 1 - ratio * 3),
        details: `${passive.length} passive phrases in ${sentences} sentences`
      }
    }
  },
}

function analyzeResume(text) {
  if (!text.trim()) return null
  const results = []
  let totalWeight = 0
  let weightedScore = 0

  for (const [key, check] of Object.entries(ATS_CHECKS)) {
    const { score, details } = check.test(text)
    const weighted = score * check.weight
    weightedScore += weighted
    totalWeight += check.weight
    results.push({
      id: key,
      label: check.label,
      icon: check.icon,
      score: Math.round(score * 100),
      weight: check.weight,
      details,
      passed: score >= 0.6,
    })
  }

  const atsScore = Math.round((weightedScore / totalWeight) * 100)
  return { results, atsScore }
}

function getScoreColor(score) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-orange-500'
  return 'text-red-500'
}

function getScoreBg(score) {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-orange-500'
  return 'bg-red-500'
}

function getScoreLabel(score) {
  if (score >= 80) return 'ATS Optimized'
  if (score >= 60) return 'Needs Improvement'
  return 'At Risk'
}

export default function ATSResumeChecker() {
  const [pdfText, setPdfText] = useState('')
  const [fileName, setFileName] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const extractPDF = useCallback(async (file) => {
    setExtracting(true)
    setExtractError('')
    setFileName(file.name)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const data = new Uint8Array(arrayBuffer)

      if (data[0] !== 0x25 || data[1] !== 0x50) {
        setExtractError('File does not appear to be a valid PDF (missing header).')
        setPdfText('')
        setExtracting(false)
        return
      }

      const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
        ignoreBrokenImages: true,
        rangeChunkSize: 65536,
        disableAutoFetch: false,
        disableStream: false,
      })

      const pdf = await loadingTask.promise
      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        let pageText = ''
        try {
          const page = await pdf.getPage(i)

          let content
          try {
            content = await page.getTextContent({ includeMarkedContent: false })
          } catch (_) {
            content = { items: [] }
          }

          let lastY = null
          const items = content.items || []

          for (const item of items) {
            if (!item || typeof item.str !== 'string') continue
            const str = item.str
            if (!str) continue

            const y = item.transform ? item.transform[5] : null

            if (lastY !== null && y !== null) {
              const yDiff = Math.abs(y - lastY)
              if (yDiff > 5) {
                pageText += '\n'
              } else if (yDiff < 2 && pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                pageText += ' '
              }
            }

            pageText += str
            lastY = y
          }

          try {
            const annotations = await page.getAnnotations()
            for (const ann of annotations) {
              if (ann.subtype === 'Link' && ann.url) {
                const url = ann.url
                pageText += ' ' + url + ' '
                if (url.startsWith('mailto:')) {
                  const email = url.replace('mailto:', '').split('?')[0].trim()
                  if (email) pageText += email + ' '
                }
              }
              if (ann.subtype === 'Widget' && ann.fieldType === 'Tx' && ann.fieldValue) {
                pageText += ' ' + ann.fieldValue + ' '
              }
            }
          } catch (_) {}

        } catch (pageErr) {
          console.warn(`Failed to extract page ${i}:`, pageErr)
        }

        if (pageText.trim()) {
          fullText += pageText + '\n\n'
        }
      }

      const cleaned = fullText
        .replace(/\n{3,}/g, '\n\n')
        .replace(/ {2,}/g, ' ')
        .replace(/^\s+|\s+$/gm, '')
        .replace(/\b(\w[\w.\-]*)\s*[\[(\{]?\s*at\s*[\])\}]?\s*(\w[\w.\-]*)\s*[\[(\{]?\s*dot\s*[\])\}]?\s*(\w{2,})\b/gi,
          (_, user, domain, tld) => `${user}@${domain}.${tld}`)
        .replace(/\b(\w[\w.\-]*)\s*@\s*\[\s*(\w[\w.\-]*)\s*\]\s*\.\s*\[\s*(\w{2,})\s*\]/gi,
          (_, user, domain, tld) => `${user}@${domain}.${tld}`)
        .trim()

      if (cleaned.length < 10) {
        setExtractError('PDF parsed but no extractable text was found. This may be a scanned/image-based PDF — try OCR first.')
        setPdfText('')
      } else {
        setPdfText(cleaned)
      }
    } catch (err) {
      console.error('PDF parse error:', err)
      const msg = err?.message || String(err)
      if (msg.includes('password')) {
        setExtractError('This PDF is password-protected. Please provide an unlocked version.')
      } else if (msg.includes('Invalid')) {
        setExtractError(`Invalid PDF: ${msg}`)
      } else {
        setExtractError(`Parse error: ${msg}`)
      }
      setPdfText('')
    } finally {
      setExtracting(false)
    }
  }, [])

  const handleFile = (file) => {
    if (file && file.type === 'application/pdf') {
      extractPDF(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const analysis = analyzeResume(pdfText)

  return (
    <ToolCard title="ATS Resume Checker" description="Upload your PDF resume and get an ATS compatibility score with enhancement tips (Only English is supported, for now)." icon="fa-file-check">
      <div className="space-y-5">
        {/* Upload area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-[4px] border-dashed transition-all p-8 text-center cursor-pointer ${
            dragOver
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-300 bg-[#f5f0eb] hover:border-orange-400 hover:bg-orange-50'
          }`}
          onClick={() => document.getElementById('resume-upload').click()}
        >
          <input
            id="resume-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
          {extracting ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent animate-spin"></div>
              <span className="text-sm font-black text-gray-600 uppercase tracking-wider">Extracting text from PDF...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <i className="fa-solid fa-cloud-arrow-up text-white text-xl"></i>
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  {fileName ? fileName : 'Drop your resume PDF here'}
                </p>
                <p className="text-xs font-bold text-gray-500 mt-1">or click to browse — PDF files only</p>
              </div>
            </div>
          )}
        </div>

        {extractError && (
          <div className="bg-red-100 border-[3px] border-black px-4 py-3 text-xs font-bold text-red-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-exclamation-triangle mt-0.5 shrink-0"></i>
              <span className="break-all">{extractError}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {analysis && (
          <div className="space-y-5">
            {/* Score card */}
            <div className="bg-white border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${getScoreBg(analysis.atsScore)} border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
                    <span className="text-white font-black text-lg">{analysis.atsScore}</span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-900 uppercase tracking-wider">ATS Score</div>
                    <div className={`text-xs font-black uppercase tracking-wider ${getScoreColor(analysis.atsScore)}`}>
                      {getScoreLabel(analysis.atsScore)}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{fileName}</span>
              </div>
              <div className="h-4 bg-gray-100 border-[3px] border-black overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ease-out ${getScoreBg(analysis.atsScore)}`}
                  style={{ width: `${analysis.atsScore}%` }}
                />
              </div>
            </div>

            {/* Detailed breakdown */}
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-3">Detailed Breakdown</div>
              <div className="space-y-2">
                {analysis.results.map(result => (
                  <div
                    key={result.id}
                    className={`border-[3px] border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                      result.passed ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 border-[2px] border-black flex items-center justify-center ${
                          result.passed ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          <i className={`fa-solid ${result.passed ? 'fa-check' : 'fa-xmark'} text-white text-[10px]`}></i>
                        </div>
                        <i className={`fa-solid ${result.icon} text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}></i>
                        <span className="text-xs font-black text-gray-700 uppercase tracking-wider">{result.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-500 hidden sm:block max-w-[200px] truncate">{result.details}</span>
                        <span className={`text-sm font-black ${getScoreColor(result.score)}`}>{result.score}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhancement tips */}
            {analysis.atsScore < 100 && (
              <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
                <div className="px-6 py-4 border-b-[3px] border-black bg-[#f5f0eb] flex items-center gap-3">
                  <div className="w-7 h-7 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-wand-magic-sparkles text-white text-xs"></i>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Enhancement Tips</h3>
                </div>
                <div className="p-6 space-y-4">
                  {analysis.results.filter(r => !r.passed).map(result => (
                    <div key={result.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-red-100 border-[2px] border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <i className={`fa-solid ${result.icon} text-red-600 text-xs`}></i>
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900 uppercase tracking-wider">{result.label}</div>
                        <p className="text-xs font-bold text-gray-600 mt-0.5">
                          {result.id === 'sections' && 'Add clear section headers like "Professional Experience", "Education", "Skills" at the top of each section.'}
                          {result.id === 'contactInfo' && 'Include your email, phone number, and LinkedIn URL at the very top of your resume.'}
                          {result.id === 'bullets' && 'Use bullet points (•, -, *) to list achievements under each role. Start each with an action verb.'}
                          {result.id === 'length' && 'Aim for 300–800 words. Too short looks thin; too long gets truncated by ATS parsers.'}
                          {result.id === 'numbers' && 'Add metrics: "Increased sales by 40%", "Managed team of 8", "Reduced costs by $50K".'}
                          {result.id === 'powerWords' && 'Replace passive language with strong action verbs: Led, Developed, Optimized, Spearheaded, Delivered.'}
                          {result.id === 'formatting' && 'Remove tabs, special characters, and tables. Use simple text formatting that ATS can parse.'}
                          {result.id === 'passive' && 'Rewrite passive phrases: "Was responsible for managing" → "Managed", "Was assigned to" → "Led".'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {analysis.results.filter(r => !r.passed).length === 0 && (
                    <div className="text-center py-4 text-green-600">
                      <i className="fa-solid fa-circle-check text-2xl mb-2"></i>
                      <p className="text-xs font-black uppercase tracking-wider">Your resume looks ATS-optimized!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!analysis && !extracting && (
          <div className="text-center py-10 text-gray-400">
            <i className="fa-solid fa-file-pdf text-4xl mb-3"></i>
            <p className="text-xs font-bold uppercase tracking-wider">Upload a PDF resume to analyze</p>
          </div>
        )}
      </div>
    </ToolCard>
  )
}
