import React from 'react'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

function getToken() {
  return localStorage.getItem('token')
}

function ProgressFeed({ events, loading }) {
  const bottomRef = React.useRef(null)
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  if (!loading && events.length === 0) return null

  return (
    <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="px-6 py-4 border-b-[3px] border-black flex items-center gap-3">
        {loading && (
          <div className="w-5 h-5 border-[3px] border-orange-500 border-t-transparent animate-spin" />
        )}
        <span className="text-sm font-black uppercase tracking-wider text-gray-900">
          {loading ? 'Scanning...' : 'Complete'}
        </span>
        <span className="text-xs font-bold text-gray-500">{events.length} businesses processed</span>
      </div>
      <div className="max-h-[400px] overflow-y-auto p-4 space-y-1.5">
        {events.map((ev, i) => {
          let icon, color
          switch (ev.status) {
            case 'scraping':
              icon = (
                <div className="w-3.5 h-3.5 border-[2px] border-orange-500 border-t-transparent animate-spin" />
              )
              color = 'text-orange-600 font-black'
              break
            case 'found':
              icon = (
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
              color = 'text-emerald-600 font-black'
              break
            case 'has_website':
              icon = (
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )
              color = 'text-gray-400 line-through'
              break
            case 'error':
              icon = (
                <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
              color = 'text-red-500 font-black'
              break
            default:
              icon = null
              color = 'text-gray-500'
          }
          return (
            <div key={i} className={`flex items-center gap-2.5 text-sm ${color} ${ev.status === 'scraping' ? 'font-black' : ''}`}>
              {icon}
              <span className="truncate flex-1">{ev.name}</span>
              {ev.status === 'found' && (
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 border-[2px] border-black font-black flex-shrink-0">NEW LEAD</span>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default function ScrapeMaps() {
  const navigate = useNavigate()
  const [formData, setFormData] = React.useState({
    business_type: '',
    city: '',
    country: ''
  })
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [events, setEvents] = React.useState([])
  const [stopped, setStopped] = React.useState(false)
  const [stopping, setStopping] = React.useState(false)

  const handleScrape = async (e) => {
    e.preventDefault()
    if (!formData.business_type || !formData.city) return

    setLoading(true)
    setError(null)
    setResults(null)
    setEvents([])
    setStopped(false)
    setStopping(false)

    const params = new URLSearchParams({
      business_type: formData.business_type,
      city: formData.city,
      country: formData.country || ''
    })

    const token = getToken()
    const es = new EventSource(`/api/leads/scrape-maps/stream?${params}&token=${token}`)
    window._currentES = es

    es.onmessage = (event) => {
      if (!event.data || event.data === '{}') return
      try {
        const data = JSON.parse(event.data)
        if (data.status === 'complete' || data.status === 'stopped') {
          setResults({ leads_found: data.leads_found, new_leads: data.new_leads })
          setLoading(false)
          setStopping(false)
          if (data.status === 'stopped') setStopped(true)
          es.close()
          window._currentES = null
        } else {
          setEvents(prev => [...prev, data])
        }
      } catch (e) {
        console.error('SSE parse error', e)
      }
    }

    es.onerror = () => {
      setError('Connection lost during scraping. Check backend logs.')
      setLoading(false)
      setStopping(false)
      es.close()
      window._currentES = null
    }
  }

  const stopSearch = async () => {
    setStopping(true)
    try {
      await api.post('/leads/scrape-maps/stop')
    } catch (e) {
      console.error('Failed to signal stop', e)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-2 h-8 bg-orange-500" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Google Maps Prospector</h1>
          <p className="text-gray-500 mt-1 text-sm">Find local businesses without websites and offer them your services.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <form onSubmit={handleScrape} className="bg-white border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Type</label>
              <input
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="e.g. Coffee Shop, Optician"
                value={formData.business_type}
                onChange={e => setFormData({...formData, business_type: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
              <input
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="e.g. Casablanca, London"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Country</label>
              <input
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="e.g. Morocco, UK"
                value={formData.country}
                onChange={e => setFormData({...formData, country: e.target.value})}
                required
              />
            </div>

            {loading ? (
              <button type="button" onClick={stopSearch} disabled={stopping}
                className="w-full bg-red-500 border-[3px] border-black text-white py-4 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-60 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 uppercase tracking-wider"
              >
                <div className="flex items-center justify-center gap-2">
                  {stopping ? (
                    <div className="w-4 h-4 border-[3px] border-white border-t-transparent animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span>{stopping ? 'Stopping...' : 'Stop Search'}</span>
                </div>
              </button>
            ) : (
              <button
                type="submit"
                className="w-full bg-orange-500 border-[3px] border-black text-white py-4 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 uppercase tracking-wider"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Start Search</span>
                </div>
              </button>
            )}
          </form>

          <div className="mt-6 p-5 bg-orange-500 border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h4 className="text-xs font-black text-white mb-1 flex items-center gap-1 uppercase tracking-wider">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why &quot;No Website&quot;?
            </h4>
            <p className="text-[10px] text-white/80 leading-relaxed font-medium">
              Businesses on Google Maps without an associated website are prime candidates for web development services. 
              They are active but missing a digital presence.
            </p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <ProgressFeed events={events} loading={loading} />

          {stopping && (
            <div className="p-4 bg-orange-500 border-[4px] border-black text-white text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
              <div className="w-5 h-5 border-[3px] border-white border-t-transparent animate-spin" />
              <div>
                <div className="font-black uppercase tracking-wider">Stopping Search...</div>
                <div className="mt-1 text-xs text-white/80">Finishing up the current business, then results will be saved.</div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-500 border-[4px] border-black text-white text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="font-black uppercase tracking-wider">Scraping Error</div>
                <div className="mt-1 text-xs text-white/80">{error}</div>
              </div>
            </div>
          )}

          {!results && !loading && !error && events.length === 0 && (
            <div className="h-full min-h-[400px] bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-orange-500 border-[3px] border-black flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Ready to find prospects?</h3>
              <p className="text-gray-500 text-xs mt-1 max-w-xs">Enter a business type and city to scan Google Maps for leads with no website.</p>
            </div>
          )}

          {results && !loading && (
            <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="p-8 text-center border-b-[3px] border-black bg-[#f5f0eb]">
                <div className={`inline-flex items-center justify-center w-16 h-16 border-[3px] border-black mb-4 ${stopped ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                  {stopped ? (
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>
                  {stopped ? 'Scan Stopped' : 'Scan Complete!'}
                </h2>
                {stopped && (
                  <p className="text-xs text-orange-600 font-bold mt-1">Partial results have been saved to the database.</p>
                )}
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="text-sm font-black text-gray-700">
                    <span className="text-gray-900">{results.leads_found}</span> Businesses Found
                  </div>
                  <div className="w-1 h-1 bg-gray-300"></div>
                  <div className="text-sm font-black text-emerald-600">
                    <span className="">{results.new_leads}</span> New Leads Added
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <h4 className="font-black uppercase tracking-wider text-gray-900 mb-4" style={{ fontFamily: "'Bebas Neue', cursive" }}>Next Steps</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => navigate('/maps-leads')}
                    className="flex items-center justify-between p-4 bg-orange-500 border-[3px] border-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  >
                    <div className="text-left">
                      <div className="font-black text-sm uppercase tracking-wider">View Maps Leads</div>
                      <div className="text-[10px] text-white/70 font-bold">See the list of prospects</div>
                    </div>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => { setResults(null); setEvents([]); setStopped(false) }}
                    className="flex items-center justify-between p-4 bg-white border-[3px] border-black text-gray-900 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  >
                    <div className="text-left">
                      <div className="font-black text-sm uppercase tracking-wider">New Search</div>
                      <div className="text-[10px] text-gray-500 font-bold">Scan another city</div>
                    </div>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}