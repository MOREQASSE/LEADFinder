import React from 'react'
import { useSettings } from '../../hooks/useSettings'
import CraigslistSiteSelector from './CraigslistSiteSelector'

function HelpIcon({ title, children }) {
  const [show, setShow] = React.useState(false)
  const [fixed, setFixed] = React.useState(false)
  const containerRef = React.useRef(null)

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShow(false); setFixed(false)
      }
    }
    if (show || fixed) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [show, fixed])

  return (
    <div ref={containerRef} className="relative inline-block ml-2">
      <button
        onClick={() => { if (fixed) { setFixed(false); setShow(false) } else { setFixed(true); setShow(true) } }}
        onMouseEnter={() => { if (!fixed) setShow(true) }}
        onMouseLeave={() => { if (!fixed) setShow(false) }}
        className={`w-5 h-5 border-[2px] border-black flex items-center justify-center text-[10px] font-black transition-all ${
          fixed ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-500 hover:text-white'
        }`}
      >
        ?
      </button>
      {(show || fixed) && (
        <div
          className="absolute z-50 left-7 top-0 w-80 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xs font-bold text-gray-700"
          onMouseEnter={() => { if (!fixed) setShow(true) }}
          onMouseLeave={() => { if (!fixed) setShow(false) }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-orange-600 uppercase tracking-wider text-[10px]">{title || 'Step-by-Step Guide'}</span>
            <button onClick={() => { setFixed(false); setShow(false) }} className="text-gray-400 hover:text-gray-600 font-black text-sm leading-none">&times;</button>
          </div>
          <div className="max-h-[320px] overflow-y-auto space-y-3">{children}</div>
        </div>
      )}
    </div>
  )
}

const GuideStep = ({ num, children }) => (
  <div className="flex gap-3">
    <div className="w-5 h-5 bg-orange-500 border-[2px] border-black flex items-center justify-center text-white text-[10px] font-black shrink-0">
      {num}
    </div>
    <div className="text-[11px] font-bold leading-relaxed text-gray-700">{children}</div>
  </div>
)

function SectionCard({ icon, bg, label, tourId, children }) {
  return (
    <div className="border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden" data-tour={tourId}>
      <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f0eb] border-b-[3px] border-black">
        <div className={`w-8 h-8 ${bg} border-[2px] border-black flex items-center justify-center shrink-0`}>
          <span className="text-white font-black text-xs">{icon}</span>
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">{label}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export default function PlatformApiKeys() {
  const { getValue, setValue } = useSettings()

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="border-[3px] border-black bg-emerald-50 px-5 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Local Encryption Active</span>
      </div>

      <div className="space-y-6">
        {/* Reddit */}
        <SectionCard icon="R" bg="bg-[#FF4500]" label="Reddit Developer API" tourId="settings-keys-reddit">
          <div className="flex items-center gap-2 mb-2">
            <HelpIcon title="Reddit 2026 API Setup">
              <GuideStep num="1">Log in to <a href="https://www.reddit.com/prefs/apps" target="_blank" className="text-orange-600 font-black underline">Reddit Apps Portal</a>.</GuideStep>
              <GuideStep num="2">Click <strong>"Create App"</strong> at the bottom.</GuideStep>
              <GuideStep num="3">Choose <strong>"script"</strong> (crucial for local tools).</GuideStep>
              <GuideStep num="4">Name it <span className="font-black bg-gray-100 px-1">Devaxio Finder</span>. Leave description blank.</GuideStep>
              <GuideStep num="5">Redirect URI: <span className="font-black bg-gray-100 px-1">http://127.0.0.1:8000</span></GuideStep>
              <GuideStep num="6">Copy the <strong>Client ID</strong> (under "personal use script").</GuideStep>
              <GuideStep num="7">Copy the <strong>Secret</strong>.</GuideStep>
            </HelpIcon>
            <span className="text-[10px] font-bold text-gray-400">Reddit "scripts" remain free for personal use.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Client ID</label>
              <input type="password"
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="e.g. zX_9qP1..."
                value={getValue('reddit_client_id')}
                onChange={e => setValue('reddit_client_id', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Client Secret</label>
              <input type="password"
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="Enter secret key..."
                value={getValue('reddit_client_secret')}
                onChange={e => setValue('reddit_client_secret', e.target.value)} />
            </div>
          </div>
        </SectionCard>

        {/* Gmail */}
        <SectionCard icon="G" bg="bg-[#EA4335]" label="Gmail &amp; Google Alerts" tourId="settings-gmail-smtp">
          <div className="flex items-center gap-2 mb-2">
            <HelpIcon title="Google Security 2026 Guide">
              <GuideStep num="1">Enable <strong>2-Step Verification</strong> in <a href="https://myaccount.google.com/security" target="_blank" className="text-orange-600 font-black underline">Google Security</a>.</GuideStep>
              <GuideStep num="2">Search for <strong>"App Passwords"</strong> in the search bar.</GuideStep>
              <GuideStep num="3">Create a name like <span className="font-black bg-gray-100 px-1">Devaxio Scraper</span>.</GuideStep>
              <GuideStep num="4">Copy the <strong>16-character yellow code</strong> (App Password).</GuideStep>
              <GuideStep num="5">Go to <a href="https://www.google.com/alerts" target="_blank" className="text-orange-600 font-black underline">Google Alerts</a> and create alerts.</GuideStep>
              <GuideStep num="6">Set "Deliver to" as your Gmail. Our bot reads these automatically.</GuideStep>
            </HelpIcon>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Gmail Address</label>
              <input
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="yourname@gmail.com"
                value={getValue('gmail_email')}
                onChange={e => setValue('gmail_email', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">App Password</label>
              <input type="password"
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="xxxx xxxx xxxx xxxx"
                value={getValue('gmail_app_password')}
                onChange={e => setValue('gmail_app_password', e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox"
              className="w-5 h-5 border-[3px] border-black accent-orange-500"
              checked={getValue('auto_send_email', '1') === '1'}
              onChange={e => setValue('auto_send_email', e.target.checked ? '1' : '0')} />
            <div>
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Auto-send emails</span>
              <p className="text-[10px] font-bold text-gray-400">Disable to preview drafts before sending.</p>
            </div>
          </label>
        </SectionCard>

        {/* Upwork */}
        <SectionCard icon="U" bg="bg-[#14A800]" label="Upwork Private Feed">
          <div className="flex items-center gap-2 mb-2">
            <HelpIcon title="Upwork RSS 2026 Method">
              <p className="text-[11px] mb-3">Direct scraping blocked — we use your private RSS feed instead.</p>
              <GuideStep num="1">Log in to your Upwork Freelancer account.</GuideStep>
              <GuideStep num="2">Search for any job (e.g., "React Developer").</GuideStep>
              <GuideStep num="3">Apply filters like $1k+ budget.</GuideStep>
              <GuideStep num="4">Look for the <strong>Feed icon</strong> (orange radio wave) near the search title.</GuideStep>
              <GuideStep num="5">Right-click <strong>"RSS"</strong> → <strong>"Copy link address"</strong>.</GuideStep>
              <GuideStep num="6">Link should start with <span className="font-black bg-gray-100 px-1 text-[10px]">upwork.com/ab/feed/jobs/rss</span></GuideStep>
            </HelpIcon>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Private RSS URL</label>
            <input
              className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
              placeholder="Paste your Upwork RSS URL here..."
              value={getValue('upwork_rss_url')}
              onChange={e => setValue('upwork_rss_url', e.target.value)} />
          </div>
        </SectionCard>

        {/* Adzuna */}
        <SectionCard icon="A" bg="bg-gradient-to-br from-blue-400 to-indigo-600" label="Adzuna API (Free Indeed Alternative)">
          <div className="flex items-center gap-2 mb-2">
            <HelpIcon title="Adzuna 2026 API Setup">
              <p className="text-[11px] mb-3">Indeed restricted public RSS. Adzuna aggregates Indeed + LinkedIn for free.</p>
              <GuideStep num="1">Register at <a href="https://developer.adzuna.com/" target="_blank" className="text-orange-600 font-black underline">Adzuna Developer Portal</a>.</GuideStep>
              <GuideStep num="2">Dashboard → <strong>"Create New App"</strong>.</GuideStep>
              <GuideStep num="3">Copy your <strong>Application ID</strong> and <strong>Application Key</strong>.</GuideStep>
              <GuideStep num="4">250,000 free requests per month.</GuideStep>
            </HelpIcon>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Adzuna App ID</label>
              <input
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="Enter App ID"
                value={getValue('adzuna_api_id')}
                onChange={e => setValue('adzuna_api_id', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Adzuna App Key</label>
              <input type="password"
                className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                placeholder="Enter App Key"
                value={getValue('adzuna_api_key')}
                onChange={e => setValue('adzuna_api_key', e.target.value)} />
            </div>
          </div>
        </SectionCard>

        {/* Craigslist */}
        <SectionCard icon="C" bg="bg-[#551A8B]" label="Craigslist Region">
          <div className="flex items-center gap-2 mb-2">
            <HelpIcon title="Craigslist Region Guide">
              <GuideStep num="1">Open <a href="https://www.craigslist.org/about/sites" target="_blank" className="text-orange-600 font-black underline">craigslist.org/about/sites</a>.</GuideStep>
              <GuideStep num="2">Pick your city's subdomain (e.g., <span className="font-black bg-gray-100 px-1">sfbay</span>).</GuideStep>
              <GuideStep num="3">If your city shows area tabs (e.g., <span className="font-black bg-gray-100 px-1">mnh</span>), put that in <strong>Area</strong>.</GuideStep>
              <GuideStep num="4">Use <strong>Extra regions</strong> below to scan more cities.</GuideStep>
            </HelpIcon>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Primary site</label>
                <input
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                  placeholder="sfbay"
                  value={getValue('craigslist_site')}
                  onChange={e => setValue('craigslist_site', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Area (optional)</label>
                <input
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
                  placeholder="e.g. mnh, sfc"
                  value={getValue('craigslist_area')}
                  onChange={e => setValue('craigslist_area', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Extra regions</label>
              <CraigslistSiteSelector
                value={getValue('craigslist_sites')}
                onChange={(val) => setValue('craigslist_sites', val)}
                maxRegions={getValue('craigslist_max_sites')}
                onMaxRegionsChange={(val) => setValue('craigslist_max_sites', val)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                className="w-5 h-5 border-[3px] border-black accent-orange-500"
                checked={getValue('craigslist_use_us_hubs') === '1'}
                onChange={e => setValue('craigslist_use_us_hubs', e.target.checked ? '1' : '0')} />
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Include major US / CA / EU hubs</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Max regions</label>
                <input type="number" min="1" max="999"
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2.5 text-sm font-medium outline-none"
                  value={getValue('craigslist_max_sites') || '10'}
                  onChange={e => setValue('craigslist_max_sites', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Pages / category</label>
                <input type="number" min="1" max="5"
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2.5 text-sm font-medium outline-none"
                  value={getValue('craigslist_max_pages') || '2'}
                  onChange={e => setValue('craigslist_max_pages', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Parallel tabs</label>
                <input type="number" min="1" max="6"
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2.5 text-sm font-medium outline-none"
                  value={getValue('craigslist_parallel_tabs') || '4'}
                  onChange={e => setValue('craigslist_parallel_tabs', e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Wait after load (ms)</label>
                <input type="number" min="1500" max="8000" step="100"
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2.5 text-sm font-medium outline-none"
                  value={getValue('craigslist_post_goto_ms') || '3200'}
                  onChange={e => setValue('craigslist_post_goto_ms', e.target.value)} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Mastodon */}
        <SectionCard icon="M" bg="bg-[#6364FF]" label="Mastodon Developer Access">
          <div className="flex items-center gap-2 mb-2">
            <HelpIcon title="Mastodon 2026 App Setup">
              <GuideStep num="1">Log in to <a href="https://mastodon.social" target="_blank" className="text-orange-600 font-black underline">mastodon.social</a> (or your instance).</GuideStep>
              <GuideStep num="2">Preferences → <strong>Development</strong>.</GuideStep>
              <GuideStep num="3">Click <strong>"New Application"</strong>.</GuideStep>
              <GuideStep num="4">Name: <span className="font-black bg-gray-100 px-1">Devaxio Finder</span>. Scopes: read + write.</GuideStep>
              <GuideStep num="5">Copy your <strong>Access Token</strong>.</GuideStep>
            </HelpIcon>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Access Token</label>
            <input type="password"
              className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
              placeholder="Paste token here..."
              value={getValue('mastodon_access_token')}
              onChange={e => setValue('mastodon_access_token', e.target.value)} />
          </div>
        </SectionCard>
      </div>

      {/* Public platforms note */}
      <div className="border-[3px] border-black bg-[#f5f0eb] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-white border-[3px] border-black flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-1">Public Platforms (No Key Required)</h4>
            <p className="text-xs font-bold text-gray-500 leading-relaxed">
              <span className="text-gray-800">HackerNews</span> and <span className="text-gray-800">Lionbridge</span> are searched using public HTTP protocols.
              No API keys needed. Our bots use browser emulation to safely scan these platforms.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
