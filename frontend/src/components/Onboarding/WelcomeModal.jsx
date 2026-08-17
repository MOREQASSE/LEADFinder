import React from 'react'

const HIGHLIGHTS = [
  { icon: 'fa-magnifying-glass', text: 'Scrape 9 platforms for leads in one click' },
  { icon: 'fa-robot', text: 'AI ranks every lead Hot / Warm / Cold' },
  { icon: 'fa-file-lines', text: 'Upload your resume — drafts get personalized' },
  { icon: 'fa-sliders', text: 'Tune presets, budgets, and AI models in Settings' },
]

export default function WelcomeModal({ open, onStart, onSkip }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onSkip} />
      <div
        className="relative bg-white border-[4px] border-black w-full max-w-lg overflow-hidden"
        style={{ boxShadow: '12px 12px 0px 0px rgba(0,0,0,1)' }}
      >
        <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
        <div className="px-7 py-6">
          <div className="flex items-center gap-3 mb-4">
            <img src="/Logo.webp" alt="LEADFinder" className="w-12 h-12 object-contain" />
            <div>
              <h2
                className="text-2xl font-black leading-none tracking-tight"
                style={{ fontFamily: "'Bebas Neue', cursive" }}
              >
                <span className="text-orange-500">WELCOME</span> ABOARD
              </h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mt-0.5">
                2-minute guided tour
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 font-medium leading-relaxed mb-5">
            LEADFinder turns 9 platforms of chaos into one brutalist dashboard. Take a quick tour to
            see how it all fits together.
          </p>
          <div className="space-y-2.5 mb-6">
            {HIGHLIGHTS.map((h) => (
              <div key={h.text} className="flex items-center gap-3 bg-gray-50 border-[2px] border-black px-3.5 py-2.5">
                <div className="w-7 h-7 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0">
                  <i className={`fa-solid ${h.icon} text-white text-xs`}></i>
                </div>
                <span className="text-xs font-bold text-gray-700">{h.text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onStart}
              className="flex-1 bg-orange-500 border-[3px] border-black text-white font-black text-sm uppercase tracking-wider py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-route text-xs"></i>
              Start the Tour
            </button>
            <button
              onClick={onSkip}
              className="text-xs font-black text-gray-400 hover:text-gray-600 uppercase tracking-wider underline underline-offset-4 decoration-2 transition-colors shrink-0"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}