import React from 'react'
import { useSettings } from '../../hooks/useSettings'

export default function KeywordRules() {
  const { getValue, setValue } = useSettings()

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Boost Keywords (+1 rank tier)</label>
        <input className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={getValue('boost_keywords')}
          onChange={e => setValue('boost_keywords', e.target.value)}
          placeholder="urgent, asap, company" />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Blacklist Keywords (auto-archive)</label>
        <input className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={getValue('blacklist_keywords')}
          onChange={e => setValue('blacklist_keywords', e.target.value)}
          placeholder="scam, fake" />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Tag Keywords (add tag, no rank change)</label>
        <input className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={getValue('tag_keywords')}
          onChange={e => setValue('tag_keywords', e.target.value)}
          placeholder="wordpress, shopify, ecommerce" />
      </div>
    </div>
  )
}
