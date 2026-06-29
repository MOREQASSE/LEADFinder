import React from 'react'

export default function SearchFilterBar({ filters, onFilterChange }) {
  const [sortDir, setSortDir] = React.useState(filters.sort || 'desc')

  const update = (key, value) => {
    onFilterChange({ ...filters, [key]: value || undefined })
  }

  const toggleSort = () => {
    const next = sortDir === 'desc' ? 'asc' : 'desc'
    setSortDir(next)
    update('sort', next)
  }

  return (
    <div className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-wrap gap-3 items-center">
      <input
        placeholder="Search keywords..."
        className="border-[3px] border-black px-3 py-2 text-sm font-bold flex-1 min-w-[200px] outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all placeholder:text-gray-400"
        value={filters.keyword || ''}
        onChange={(e) => update('keyword', e.target.value)}
      />
      <select className="border-[3px] border-black px-3 py-2 text-sm font-bold outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all bg-white"
        value={filters.platform || ''} onChange={(e) => update('platform', e.target.value)}>
        <option value="">All Platforms</option>
        <option value="Reddit">Reddit</option>
        <option value="Craigslist">Craigslist</option>
        <option value="Upwork">Upwork</option>
        <option value="Mastodon">Mastodon</option>
        <option value="Indeed">Indeed</option>
        <option value="HackerNews">HackerNews</option>
        <option value="LinkedIn">LinkedIn</option>
        <option value="Lionbridge">Lionbridge</option>
      </select>
      <select className="border-[3px] border-black px-3 py-2 text-sm font-bold outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all bg-white"
        value={filters.rank || ''} onChange={(e) => update('rank', e.target.value)}>
        <option value="">All Ranks</option>
        <option value="Hot">Hot</option>
        <option value="Warm">Warm</option>
        <option value="Cold">Cold</option>
      </select>
      <select className="border-[3px] border-black px-3 py-2 text-sm font-bold outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all bg-white"
        value={filters.status || ''} onChange={(e) => update('status', e.target.value)}>
        <option value="">All Status</option>
        <option value="new">New</option>
        <option value="drafted">Drafted</option>
        <option value="replied">Replied</option>
        <option value="archived">Archived</option>
      </select>
      {filters.platform === 'LinkedIn' && (
        <label className="flex items-center gap-2 cursor-pointer select-none ml-1">
          <input type="checkbox"
            className="w-4 h-4 border-[3px] border-black accent-blue-500"
            checked={filters.easy_apply === true}
            onChange={(e) => update('easy_apply', e.target.checked || undefined)}
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Easy Apply only</span>
        </label>
      )}
      <button onClick={toggleSort}
        title={sortDir === 'desc' ? 'Oldest first' : 'Newest first'}
        className="border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all bg-white"
      >
        {sortDir === 'desc' ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        )}
      </button>
    </div>
  )
}
