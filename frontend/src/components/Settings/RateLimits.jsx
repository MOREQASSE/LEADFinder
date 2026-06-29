import React from 'react'
import { useSettings } from '../../hooks/useSettings'

const platforms = ['reddit', 'craigslist', 'upwork', 'mastodon', 'indeed', 'hackernews', 'lionbridge']

export default function RateLimits() {
  const { getValue, setValue } = useSettings()

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {platforms.map((p) => (
          <div key={p}>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 capitalize">{p}</label>
            <input type="number"
              className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
              value={getValue(`rate_limit_${p}_daily`, '10')}
              onChange={e => setValue(`rate_limit_${p}_daily`, String(e.target.value))} />
          </div>
        ))}
      </div>
      <div className="border-t-[3px] border-black pt-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 mb-4">Email Outreach (Gmail SMTP)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Max emails per hour</label>
            <input type="number" min="1" max="100"
              className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
              value={getValue('email_rate_limit_hour', '50')}
              onChange={e => setValue('email_rate_limit_hour', String(e.target.value))} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Max emails per day</label>
            <input type="number" min="1" max="1000"
              className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
              value={getValue('email_rate_limit_daily', '400')}
              onChange={e => setValue('email_rate_limit_daily', String(e.target.value))} />
          </div>
        </div>
        <p className="text-xs font-bold text-gray-400 mt-3">Gmail allows up to 500 recipients/day. App passwords yield ~2000/day.</p>
      </div>
    </div>
  )
}
