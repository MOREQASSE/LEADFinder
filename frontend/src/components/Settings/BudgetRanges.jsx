import React from 'react'
import { useSettings } from '../../hooks/useSettings'

export default function BudgetRanges() {
  const { getValue, setValue } = useSettings()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Low Range Max (MAD)</label>
        <input type="number"
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={getValue('budget_low_max', '100')}
          onChange={e => setValue('budget_low_max', String(e.target.value))} />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Medium Range Max (MAD)</label>
        <input type="number"
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={getValue('budget_medium_max', '500')}
          onChange={e => setValue('budget_medium_max', String(e.target.value))} />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">High Range Min (MAD)</label>
        <input type="number"
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          value={getValue('budget_high_min', '1000')}
          onChange={e => setValue('budget_high_min', String(e.target.value))} />
      </div>
    </div>
  )
}
