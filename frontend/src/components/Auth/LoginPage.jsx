import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        <path d="M13 8h-2v2H9v2h2v2h2v-2h2v-2h-2V8z" />
      </svg>
    ),
    title: 'Smart Lead Discovery',
    desc: 'AI-powered search finds qualified leads across industries. Score, rank, and prioritize with precision.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
    title: 'Job & Internship Engine',
    desc: 'Automate applications, discover hiring managers, and send personalized connection requests at scale.',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Maps Data Scraper',
    desc: 'Extract business intelligence from Google Maps. Build targeted lead lists from real-world locations.',
  },
]

const rightFeatures = [
  'AI-powered lead scoring',
  'Multi-platform scraping',
  'Automated LinkedIn outreach',
  'Real-time pipeline tracking',
  'Smart resume matching',
]

const testimonial = {
  quote: "LEADFinder cut my lead research time by 80%. The LinkedIn automation is a game-changer for outreach.",
  name: 'Mohammed Reqasse',
  role: 'Network Engineer, Morocco',
  initials: 'AC',
}

export default function LoginPage() {
  const { login, register, loading } = useAuth()
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [visible, setVisible] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    setVisible(true)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (isRegistering) {
        await register(email, password, name)
      } else {
        await login(email, password)
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || (isRegistering ? 'Registration failed' : 'Login failed'))
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center p-4 md:p-8 relative overflow-x-hidden">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* Background decorative blobs */}
      <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[35vw] h-[35vw] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[40%] right-[20%] w-[20vw] h-[20vw] bg-orange-400/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Decorative neo-brutalist elements */}
      <div className="fixed top-12 right-16 w-32 h-2 bg-orange-500 rotate-12 hidden lg:block" />
      <div className="fixed bottom-20 left-12 w-24 h-2 bg-black -rotate-6 hidden lg:block" />

      <div
        ref={containerRef}
        className={`w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        {/* ===== LEFT COLUMN: Brand & Features ===== */}
        <div className="lg:col-span-3 space-y-5 order-2 lg:order-1">
          {/* Brand block */}
          <div
            className="bg-white border-[4px] border-black p-5 lg:p-6 relative transition-all duration-500 hover:translate-x-[-2px] hover:translate-y-[-2px]"
            style={{
              boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
              transitionDelay: '100ms',
              transform: visible ? 'none' : 'translateX(-30px)',
              opacity: visible ? 1 : 0,
            }}
          >
            {/* Orange decorative corner */}
            <div className="absolute -top-[4px] -right-[4px] w-12 h-12 bg-orange-500 border-b-[4px] border-l-[4px] border-black" />

            <div className="flex items-center gap-2.5 mb-1">
              <img src="/Logo.webp" alt="" className="w-12 h-12 object-contain" />
              <h1 className="text-[2rem] leading-none font-black text-black tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                <span className="text-orange-500">LEAD</span>Finder
              </h1>
            </div>
            <p className="text-sm font-bold text-gray-600 mt-1.5 uppercase tracking-[0.2em]">By Devaxio</p>
            <p className="text-sm text-gray-600 mt-4 leading-relaxed font-medium">
              Supercharge your outreach with AI-powered lead discovery, job automation, and data scraping — all in one brutalist dashboard.
            </p>
          </div>

          {/* Feature cards */}
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white border-[4px] border-black p-4 relative group cursor-default transition-all duration-300"
              style={{
                boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)',
                transitionDelay: `${200 + i * 100}ms`,
                transform: visible ? 'none' : 'translateX(-30px)',
                opacity: visible ? 1 : 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '8px 8px 0px 0px rgba(0,0,0,1)';
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '6px 6px 0px 0px rgba(0,0,0,1)';
                e.currentTarget.style.transform = 'translate(0, 0)';
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-500 border-[3px] border-black flex items-center justify-center text-white shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-black text-black text-base uppercase tracking-tight">{f.title}</h3>
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-medium">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== CENTER COLUMN: Auth Form ===== */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div
            className="bg-white border-[4px] border-black p-8 lg:p-10 relative"
            style={{
              boxShadow: '14px 14px 0px 0px rgba(0,0,0,1)',
              transitionDelay: '300ms',
              transform: visible ? 'none' : 'translateY(30px)',
              opacity: visible ? 1 : 0,
            }}
          >
            {/* Form header decorative bar */}
            <div className="absolute top-0 left-0 right-0 h-[5px] bg-orange-500" />

            {/* Toggle tabs */}
            <div className="grid grid-cols-2 border-[3px] border-black mb-7">
              <button
                type="button"
                className={`py-3.5 text-sm font-black uppercase tracking-wider transition-all ${
                  !isRegistering
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-black hover:bg-orange-100'
                }`}
                onClick={() => { setIsRegistering(false); setError(''); setShowPassword(false); setAgreed(false) }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`py-3.5 text-sm font-black uppercase tracking-wider transition-all ${
                  isRegistering
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-black hover:bg-orange-100'
                }`}
                onClick={() => { setIsRegistering(true); setError(''); setShowPassword(false); setAgreed(false) }}
              >
                Register
              </button>
            </div>

            <h2 className="text-[2.2rem] font-black text-black leading-none tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {isRegistering ? 'GET STARTED' : 'WELCOME BACK'}
            </h2>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1.5 mb-7">
              {isRegistering ? 'Create your free account in seconds' : 'Sign in to your dashboard'}
            </p>

            {error && (
              <div className="bg-red-50 border-[3px] border-red-600 p-3.5 mb-5 flex items-start gap-2.5"
                style={{ boxShadow: '4px 4px 0px 0px rgba(220,38,38,1)' }}
              >
                <span className="text-red-600 font-black text-sm leading-none mt-0.5">!</span>
                <p className="text-xs font-bold text-red-700 leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegistering && (
                <div>
                  <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider mb-1.5">Full Name</label>
                  <div className="relative">
                    <input
                      className="w-full border-[3px] border-black p-3.5 text-sm font-bold text-black bg-white outline-none transition-all placeholder:text-gray-400"
                      style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                      onFocus={e => { e.target.style.boxShadow = '1px 1px 0px 0px rgba(0,0,0,1)'; e.target.style.transform = 'translate(3px, 3px)' }}
                      onBlur={e => { e.target.style.boxShadow = '4px 4px 0px 0px rgba(0,0,0,1)'; e.target.style.transform = 'translate(0, 0)' }}
                      placeholder="Dean Winchester"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    className="w-full border-[3px] border-black p-3.5 text-sm font-bold text-black bg-white outline-none transition-all placeholder:text-gray-400"
                    style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                    onFocus={e => { e.target.style.boxShadow = '1px 1px 0px 0px rgba(0,0,0,1)'; e.target.style.transform = 'translate(3px, 3px)' }}
                    onBlur={e => { e.target.style.boxShadow = '4px 4px 0px 0px rgba(0,0,0,1)'; e.target.style.transform = 'translate(0, 0)' }}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-600 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input
                    className="w-full border-[3px] border-black p-3.5 pr-12 text-sm font-bold text-black bg-white outline-none transition-all placeholder:text-gray-400"
                    style={{ boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                    onFocus={e => { e.target.style.boxShadow = '1px 1px 0px 0px rgba(0,0,0,1)'; e.target.style.transform = 'translate(3px, 3px)' }}
                    onBlur={e => { e.target.style.boxShadow = '4px 4px 0px 0px rgba(0,0,0,1)'; e.target.style.transform = 'translate(0, 0)' }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {isRegistering && (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 border-[3px] border-black accent-orange-500 shrink-0"
                  />
                  <span className="text-xs font-bold text-gray-600 leading-relaxed">
                    I agree to the{' '}
                    <button type="button" onClick={(e) => { e.preventDefault(); setShowPolicy(true) }}
                      className="text-orange-600 underline underline-offset-2 decoration-2 hover:text-orange-700 font-black">
                      Terms & Privacy Policy
                    </button>
                    . I understand my data is stored locally on my machine and never sent to Devaxio.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading || (isRegistering && !agreed)}
                className="w-full bg-orange-500 border-[3px] border-black text-white font-black py-4 text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '2px 2px 0px 0px rgba(0,0,0,1)';
                    e.currentTarget.style.transform = 'translate(4px, 4px)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '6px 6px 0px 0px rgba(0,0,0,1)';
                  e.currentTarget.style.transform = 'translate(0, 0)';
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isRegistering ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                className="text-xs font-bold text-gray-500 hover:text-orange-600 underline underline-offset-4 decoration-2 transition-colors"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); setShowPassword(false); setAgreed(false) }}
              >
                {isRegistering
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Register"}
              </button>
            </div>

            {/* Decorative divider */}
            <div className="mt-6 pt-5 border-t-[3px] border-black flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">Secured</span>
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-[10px] font-bold uppercase">256-bit</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN: Stats & Social Proof ===== */}
        <div className="lg:col-span-4 space-y-5 order-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4"
            style={{
              transitionDelay: '400ms',
              transform: visible ? 'none' : 'translateX(30px)',
              opacity: visible ? 1 : 0,
            }}
          >
            <div className="bg-white border-[4px] border-black p-4 relative transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
            >
              <p className="text-3xl font-black text-orange-500 leading-none" style={{ fontFamily: "'Bebas Neue', cursive" }}>10K+</p>
              <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider mt-1.5">Leads Found</p>
            </div>
            <div className="bg-white border-[4px] border-black p-4 relative transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
            >
              <p className="text-3xl font-black text-orange-500 leading-none" style={{ fontFamily: "'Bebas Neue', cursive" }}>500+</p>
              <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider mt-1.5">Jobs Matched</p>
            </div>
            <div className="bg-white border-[4px] border-black p-4 relative transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
            >
              <p className="text-3xl font-black text-orange-500 leading-none" style={{ fontFamily: "'Bebas Neue', cursive" }}>100%</p>
              <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider mt-1.5">Uptime</p>
            </div>
            <div className="bg-white border-[4px] border-black p-4 relative transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
            >
              <p className="text-3xl font-black text-orange-500 leading-none" style={{ fontFamily: "'Bebas Neue', cursive" }}>4.9</p>
              <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider mt-1.5">User Rating</p>
            </div>
          </div>

          {/* Testimonial card */}
          <div
            className="bg-orange-500 border-[4px] border-black p-6 relative transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px]"
            style={{
              boxShadow: '7px 7px 0px 0px rgba(0,0,0,1)',
              transitionDelay: '500ms',
              transform: visible ? 'none' : 'translateX(30px)',
              opacity: visible ? 1 : 0,
            }}
          >
            {/* Quote mark */}
            <span className="text-6xl font-black text-white/20 leading-none absolute top-2 right-4" style={{ fontFamily: "'Space Mono', monospace" }}>"</span>
            <p className="text-sm font-bold text-white leading-relaxed relative z-10">
              "{testimonial.quote}"
            </p>
            <div className="mt-4 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-black border-[2px] border-white flex items-center justify-center">
                <span className="text-xs font-black text-white">{testimonial.initials}</span>
              </div>
              <div>
                <p className="text-xs font-black text-white">{testimonial.name}</p>
                <p className="text-[10px] font-bold text-orange-200">{testimonial.role}</p>
              </div>
            </div>
          </div>

          {/* Why LEADFinder */}
          <div
            className="bg-white border-[4px] border-black p-6 transition-all duration-300 hover:translate-x-[-2px] hover:translate-y-[-2px]"
            style={{
              boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)',
              transitionDelay: '600ms',
              transform: visible ? 'none' : 'translateX(30px)',
              opacity: visible ? 1 : 0,
            }}
          >
            <h3 className="text-lg font-black text-black leading-none tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
              WHY <span className="text-orange-500">LEAD</span>FINDER?
            </h3>
            <div className="mt-4 space-y-3">
              {rightFeatures.map((item, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="w-5 h-5 bg-orange-500 border-[2px] border-black flex items-center justify-center shrink-0 group-hover:rotate-45 transition-transform duration-200">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Free trial badge */}
          <div className="text-center"
            style={{
              transitionDelay: '700ms',
              transform: visible ? 'none' : 'translateX(30px)',
              opacity: visible ? 1 : 0,
            }}
          >
            <span className="inline-block bg-black text-white text-[11px] font-black px-5 py-2.5 tracking-[0.15em] uppercase border-[3px] border-orange-500"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Free Trial {'/*'} No Credit Card
            </span>
          </div>
        </div>
      </div>

      {/* Policy Modal */}
      {showPolicy && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowPolicy(false)} />
          <div className="relative bg-white border-[4px] border-black w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            style={{ boxShadow: '12px 12px 0px 0px rgba(0,0,0,1)' }}
          >
            <div className="bg-orange-500 border-b-[4px] border-black px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                Terms & Privacy Policy
              </h2>
              <button onClick={() => setShowPolicy(false)} className="text-white/70 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5 text-sm text-gray-700 leading-relaxed font-medium">
              <div>
                <h3 className="font-black text-black uppercase tracking-wider text-xs mb-2">1. Open Source & Free Forever</h3>
                <p>LEADFinder is an open source project distributed under the MIT License. It is and will remain completely free of charge. No features are gated behind paywalls, subscriptions, or premium tiers. The source code is publicly available and may be audited by anyone at any time.</p>
              </div>
              <div>
                <h3 className="font-black text-black uppercase tracking-wider text-xs mb-2">2. Your Data Stays on Your Machine</h3>
                <p>LEADFinder is a self-hosted application. All data you enter — leads, resume information, API keys, and any other content — is stored exclusively in the local SQLite database on your own machine. <strong className="text-black">No data is ever transmitted to Devaxio, its developers, or any third-party servers.</strong> There are no telemetry services, no analytics tracking, and no phone-home mechanisms of any kind.</p>
              </div>
              <div>
                <h3 className="font-black text-black uppercase tracking-wider text-xs mb-2">3. API Keys & Third-Party Services</h3>
                <p>If you configure API keys for AI providers (GitHub AI, OpenRouter, etc.), those keys are stored locally and used solely to communicate with the services you explicitly configure. Devaxio has no access to your API keys or the requests made through them.</p>
              </div>
              <div>
                <h3 className="font-black text-black uppercase tracking-wider text-xs mb-2">4. No Responsibility for Automated Actions</h3>
                <p>LEADFinder provides automation tools for lead discovery, outreach, and job applications. You are solely responsible for how you use these tools and for compliance with the terms of service of any platform you interact with (LinkedIn, Reddit, etc.). Devaxio assumes no liability for consequences arising from automated actions performed by this software.</p>
              </div>
              <div>
                <h3 className="font-black text-black uppercase tracking-wider text-xs mb-2">5. No Warranty</h3>
                <p>LEADFinder is provided "as is" without warranty of any kind, express or implied. The developers make no guarantees about the software's reliability, accuracy, or suitability for any particular purpose.</p>
              </div>
              <div>
                <h3 className="font-black text-black uppercase tracking-wider text-xs mb-2">6. Contact</h3>
                <p>For questions about this policy or the project, visit the GitHub repository or open an issue. Devaxio does not operate any centralized servers or support desks for this project.</p>
              </div>
            </div>
            <div className="border-t-[4px] border-black px-6 py-4 bg-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Last updated: June 2026</span>
              <button onClick={() => { setAgreed(true); setShowPolicy(false) }}
                className="bg-orange-500 border-[3px] border-black text-white font-black text-xs uppercase tracking-wider px-5 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
