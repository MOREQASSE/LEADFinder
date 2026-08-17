import React, { useState, useEffect, useMemo } from 'react'
import WordCounter from './tools/WordCounter'
import CaseConverter from './tools/CaseConverter'
import WhitespaceCleaner from './tools/WhitespaceCleaner'
import JsonFormatter from './tools/JsonFormatter'
import UrlEncoder from './tools/UrlEncoder'
import Base64Tool from './tools/Base64Tool'
import PasswordGenerator from './tools/PasswordGenerator'
import EmailValidator from './tools/EmailValidator'
import HashGenerator from './tools/HashGenerator'
import ColorConverter from './tools/ColorConverter'
import UnitConverter from './tools/UnitConverter'
import WheelSpinner from './tools/WheelSpinner'
import SpamChecker from './tools/SpamChecker'
import QRCodeGenerator from './tools/QRCodeGenerator'
import InvoiceGenerator from './tools/InvoiceGenerator'
import ATSResumeChecker from './tools/ATSResumeChecker'
import DiceRoller from './tools/DiceRoller'
import TypingSpeedTest from './tools/TypingSpeedTest'

const tools = [
  { id: 'word-counter', label: 'Word Counter', icon: 'fa-font', category: 'Text', component: WordCounter },
  { id: 'case-converter', label: 'Case Converter', icon: 'fa-font', category: 'Text', component: CaseConverter },
  { id: 'whitespace-cleaner', label: 'Whitespace Cleaner', icon: 'fa-eraser', category: 'Text', component: WhitespaceCleaner },
  { id: 'json-formatter', label: 'JSON Formatter', icon: 'fa-code', category: 'Developer', component: JsonFormatter },
  { id: 'url-encoder', label: 'URL Encoder', icon: 'fa-link', category: 'Developer', component: UrlEncoder },
  { id: 'base64', label: 'Base64 Tool', icon: 'fa-key', category: 'Developer', component: Base64Tool },
  { id: 'hash-generator', label: 'Hash Generator', icon: 'fa-fingerprint', category: 'Developer', component: HashGenerator },
  { id: 'password-generator', label: 'Password Generator', icon: 'fa-lock', category: 'Security', component: PasswordGenerator },
  { id: 'email-validator', label: 'Email Validator', icon: 'fa-envelope', category: 'Security', component: EmailValidator },
  { id: 'spam-checker', label: 'Spam Checker', icon: 'fa-shield-halved', category: 'Security', component: SpamChecker },
  { id: 'color-converter', label: 'Color Converter', icon: 'fa-palette', category: 'Design', component: ColorConverter },
  { id: 'qr-code', label: 'QR Code Generator', icon: 'fa-qrcode', category: 'Design', component: QRCodeGenerator },
  { id: 'unit-converter', label: 'Unit Converter', icon: 'fa-ruler', category: 'Converters', component: UnitConverter },
  { id: 'wheel-spinner', label: 'Wheel Spinner', icon: 'fa-dharmachakra', category: 'Fun', component: WheelSpinner },
  { id: 'dice-roller', label: 'Dice Roller', icon: 'fa-dice', category: 'Fun', component: DiceRoller },
  { id: 'typing-test', label: 'Typing Speed Test', icon: 'fa-keyboard', category: 'Fun', component: TypingSpeedTest },
  { id: 'ats-checker', label: 'ATS Resume Checker', icon: 'fa-file-circle-check', category: 'Generators', component: ATSResumeChecker },
  { id: 'invoice-generator', label: 'Invoice Generator', icon: 'fa-file-invoice', category: 'Generators', component: InvoiceGenerator },
]

const categories = ['Generators', 'Text', 'Developer', 'Security', 'Design', 'Converters', 'Fun']

export default function ToolsLayout() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash && tools.find(t => t.id === hash)) {
      setSelectedId(hash)
    }
  }, [])

  const selectTool = (id) => {
    setSelectedId(id)
    window.location.hash = id
    setMobileMenuOpen(false)
  }

  const filteredTools = useMemo(() => {
    if (!search.trim()) return tools
    const q = search.toLowerCase()
    return tools.filter(t => t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
  }, [search])

  const groupedTools = useMemo(() => {
    const groups = {}
    categories.forEach(cat => { groups[cat] = [] })
    filteredTools.forEach(tool => {
      if (groups[tool.category]) groups[tool.category].push(tool)
    })
    return groups
  }, [filteredTools])

  const selectedTool = tools.find(t => t.id === selectedId)
  const ToolComponent = selectedTool?.component

  return (
    <div className="h-full flex flex-col">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <i className="fa-solid fa-wrench text-white text-sm"></i>
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>
            <span className="text-orange-500">TOOLS</span> UTILITY
          </h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white border-[3px] border-black px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-orange-500`}></i>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 mb-4 max-h-[60vh] overflow-y-auto">
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none mb-3"
          />
          {categories.map(cat => {
            const catTools = groupedTools[cat]
            if (!catTools || catTools.length === 0) return null
            return (
              <div key={cat} className="mb-3">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 px-1">{cat}</div>
                {catTools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => selectTool(tool.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 border-[2px] border-black text-xs font-black uppercase tracking-wider mb-1 transition-all ${
                      selectedId === tool.id
                        ? 'bg-orange-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white text-gray-700 hover:bg-orange-50'
                    }`}
                  >
                    <i className={`fa-solid ${tool.icon} text-sm w-4 text-center ${selectedId === tool.id ? 'text-white' : 'text-orange-500'}`}></i>
                    {tool.label}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col">
            <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
            <div className="px-4 py-4 border-b-[3px] border-black bg-[#f5f0eb]">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-wrench text-white text-xs"></i>
                </div>
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                  <span className="text-orange-500">TOOLS</span> UTILITY
                </h2>
              </div>
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border-[3px] border-black pl-8 pr-3 py-2 text-xs font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {categories.map(cat => {
                const catTools = groupedTools[cat]
                if (!catTools || catTools.length === 0) return null
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-2 px-2">{cat}</div>
                    <div className="space-y-1">
                      {catTools.map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => selectTool(tool.id)}
                          className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 border-[3px] border-black text-xs font-black uppercase tracking-wider transition-all ${
                            selectedId === tool.id
                              ? 'bg-orange-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                              : 'bg-white text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:text-orange-500'
                          }`}
                        >
                          <i className={`fa-solid ${tool.icon} text-sm w-4 text-center ${selectedId === tool.id ? 'text-white' : 'text-orange-500'}`}></i>
                          <span className="truncate">{tool.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {ToolComponent ? (
            <div>
              <button
                onClick={() => { setSelectedId(null); window.location.hash = '' }}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-black text-gray-500 uppercase tracking-wider hover:text-orange-500 transition-colors"
              >
                <i className="fa-solid fa-arrow-left"></i> All Tools
              </button>
              <ToolComponent />
            </div>
          ) : (
            <div>
              <div className="relative pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <i className="fa-solid fa-wrench text-white text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-2xl font-black leading-none tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                      <span className="text-orange-500">TOOLS</span> UTILITY
                    </h1>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Free browser-based tools for developers and creators</p>
                  </div>
                </div>
                <div className="absolute -bottom-0 left-0 right-0 h-[3px] bg-black mt-4" />
              </div>

              <div className="space-y-6" data-tour="tools-grid">
                {categories.map(cat => {
                  const catTools = groupedTools[cat]
                  if (!catTools || catTools.length === 0) return null
                  return (
                    <div key={cat}>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-3">{cat}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catTools.map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => selectTool(tool.id)}
                            className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                                <i className={`fa-solid ${tool.icon} text-white text-sm`}></i>
                              </div>
                              <div>
                                <div className="text-sm font-black text-gray-900 uppercase tracking-wider">{tool.label}</div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{tool.category}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
