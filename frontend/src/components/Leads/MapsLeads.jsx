import React from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import MapsLeadCard from './MapsLeadCard'
import MapsLeadDetail from './MapsLeadDetail'
import toast from 'react-hot-toast'
import ConfirmModal from '../ui/ConfirmModal'

function parseLocation(lead) {
  for (const line of (lead.description || '').split('\n')) {
    if (line.startsWith('Location:')) return line.replace('Location:', '').trim()
  }
  return 'Unknown'
}

function parseType(lead) {
  for (const line of (lead.description || '').split('\n')) {
    if (line.startsWith('Type:')) return line.replace('Type:', '').trim()
  }
  return ''
}

function statusColor(status) {
  switch (status) {
    case 'new': return { bg: 'bg-orange-500', text: 'text-white', dot: 'bg-white' }
    case 'replied': return { bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-white' }
    case 'contacted': return { bg: 'bg-gray-800', text: 'text-white', dot: 'bg-white' }
    default: return { bg: 'bg-gray-300', text: 'text-gray-800', dot: 'bg-gray-600' }
  }
}

function FilterBar({ search, setSearch, statusFilter, setStatusFilter, cityFilter, setCityFilter, typeFilter, setTypeFilter, cities, types }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by business name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border-[3px] border-black text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-4 py-2.5 bg-white border-[3px] border-black text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
      >
        <option value="">All Statuses</option>
        <option value="new">New</option>
        <option value="replied">Replied</option>
        <option value="contacted">Contacted</option>
      </select>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="px-4 py-2.5 bg-white border-[3px] border-black text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
      >
        <option value="">All Types</option>
        {types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        value={cityFilter}
        onChange={(e) => setCityFilter(e.target.value)}
        className="px-4 py-2.5 bg-white border-[3px] border-black text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
      >
        <option value="">All Cities</option>
        {cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {(search || statusFilter || cityFilter || typeFilter) && (
        <button onClick={() => { setSearch(''); setStatusFilter(''); setCityFilter(''); setTypeFilter('') }}
          className="px-4 py-2.5 text-sm font-black text-gray-600 border-[3px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider">
          Clear
        </button>
      )}
    </div>
  )
}

function CityGroup({ city, leads, onClick, onDelete }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="mb-8">
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full mb-4 group bg-white border-[3px] border-black px-5 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
        <div className="flex items-center gap-3">
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-lg font-black uppercase tracking-wider text-gray-900" style={{ fontFamily: "'Bebas Neue', cursive" }}>{city}</h2>
          <span className="text-xs font-black bg-orange-500 text-white border-[2px] border-black px-2.5 py-0.5">{leads.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(statusCounts).map(([s, count]) => {
            const colors = statusColor(s)
            return (
              <span key={s} className={`text-[10px] font-black px-2 py-0.5 border-[2px] border-black ${colors.bg} ${colors.text} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 ${colors.dot}`} />
                {count}
              </span>
            )
          })}
        </div>
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {leads.map(lead => (
            <MapsLeadCard key={lead.id} lead={lead} onClick={onClick} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MapsLeads() {
  const [leads, setLeads] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [selectedLead, setSelectedLead] = React.useState(null)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [cityFilter, setCityFilter] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('')

  const [deletingAll, setDeletingAll] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(null)

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await api.get('/leads/', { params: { platform: 'Google Maps', limit: 200 } })
      setLeads(res.data)
    } catch (err) {
      console.error('Failed to fetch maps leads', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id) => {
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const promptDeleteAll = () => {
    const count = filtered.length
    if (count === 0) return
    const filterDesc = [statusFilter, cityFilter, typeFilter, search].filter(Boolean).join(', ')
    const msg = filterDesc
      ? `Delete all ${count} filtered Maps leads (${filterDesc})?`
      : `Delete all ${count} Maps leads?`
    setConfirmDelete({ count, msg })
  }

  const handleDeleteAll = async () => {
    if (!confirmDelete) return
    setDeletingAll(true)
    setConfirmDelete(null)
    try {
      const params = { platform: 'Google Maps' }
      if (statusFilter) params.status = statusFilter
      if (cityFilter) params.city = cityFilter
      if (typeFilter) params.biz_type = typeFilter
      if (search) params.keyword = search
      const res = await api.delete('/leads/', { params })
      const deleted = res.data.count
      setLeads(prev => prev.filter(l => !filtered.some(f => f.id === l.id)))
      toast.success(`Deleted ${deleted} lead${deleted !== 1 ? 's' : ''}`)
    } catch (e) {
      toast.error('Delete failed')
    } finally {
      setDeletingAll(false)
    }
  }

  React.useEffect(() => { fetchLeads() }, [])

  const filtered = React.useMemo(() => {
    let result = [...leads]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l => l.title.toLowerCase().includes(q))
    }
    if (statusFilter) result = result.filter(l => l.status === statusFilter)
    if (cityFilter) result = result.filter(l => parseLocation(l) === cityFilter)
    if (typeFilter) result = result.filter(l => parseType(l) === typeFilter)
    return result
  }, [leads, search, statusFilter, cityFilter, typeFilter])

  const cities = React.useMemo(() => {
    const set = new Set(leads.map(parseLocation))
    return Array.from(set).sort()
  }, [leads])

  const types = React.useMemo(() => {
    const set = new Set(leads.map(parseType).filter(Boolean))
    return Array.from(set).sort()
  }, [leads])

  const grouped = React.useMemo(() => {
    const map = {}
    for (const lead of filtered) {
      const loc = parseLocation(lead)
      if (!map[loc]) map[loc] = []
      map[loc].push(lead)
    }
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length)
  }, [filtered])

  const totalNew = leads.filter(l => l.status === 'new').length
  const totalFiltered = filtered.length
  const hasFilters = search || statusFilter || cityFilter || typeFilter

  if (selectedLead) {
    return (
      <div className="max-w-6xl mx-auto">
        <button onClick={() => setSelectedLead(null)} className="text-sm mb-4 font-black uppercase tracking-wider bg-white border-[3px] border-black px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center gap-2">
          &larr; Back to Maps Leads
        </button>
        <MapsLeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={fetchLeads} />
      </div>
    )
  }

  return (
    <>
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-orange-500" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Maps Leads</h1>
            <p className="text-gray-500 text-sm mt-1">
              {leads.length} local businesses &middot; {totalNew} new
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border-[3px] border-black px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Cities</span>
            <span className="font-black text-gray-900">{cities.length}</span>
          </div>
          {leads.length > 0 && (
            <button onClick={promptDeleteAll} disabled={deletingAll}
              className="flex items-center gap-2 bg-white border-[3px] border-black px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-red-500 uppercase tracking-wider">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deletingAll ? 'Deleting...' : 'Delete All'}
            </button>
          )}
          <Link to="/scrape-maps"
            className="flex items-center gap-2 bg-orange-500 border-[3px] border-black px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-white uppercase tracking-wider">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Find More
          </Link>
        </div>
      </div>

      <FilterBar {...{ search, setSearch, statusFilter, setStatusFilter, cityFilter, setCityFilter, typeFilter, setTypeFilter, cities, types }} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white border-[3px] border-black p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-pulse">
              <div className="h-4 bg-gray-200 w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 w-2/3 mb-6"></div>
              <div className="h-10 bg-gray-100 border-[2px] border-black"></div>
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border-[4px] border-black p-16 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 bg-orange-500 border-[3px] border-black flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>No Maps Leads Yet</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto mb-8">
            Start by scanning a city and business type to find local prospects without websites.
          </p>
          <Link to="/scrape-maps"
            className="inline-flex items-center gap-2 bg-orange-500 border-[3px] border-black text-white px-8 py-4 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all uppercase tracking-wider">
            Launch Scraper
          </Link>
        </div>
      ) : (
        <>
          {hasFilters && (
            <p className="text-sm font-black text-gray-500 mb-4 uppercase tracking-wider">{totalFiltered} result{totalFiltered !== 1 ? 's' : ''}</p>
          )}
          {grouped.length === 0 ? (
            <div className="bg-white border-[4px] border-black p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-gray-500 font-black uppercase tracking-wider">No leads match the current filters</p>
            </div>
          ) : (
            grouped.map(([city, cityLeads]) => (
              <CityGroup key={city} city={city} leads={cityLeads} onClick={setSelectedLead} onDelete={handleDelete} />
            ))
          )}
        </>
      )}
    </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Leads"
        message={confirmDelete?.msg ? `${confirmDelete.msg} This cannot be undone.` : ''}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}