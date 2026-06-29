import React from 'react'
import { useLeads } from '../../hooks/useLeads'
import SearchFilterBar from '../Filters/SearchFilterBar'
import LeadCard from './LeadCard'
import LeadDetail from './LeadDetail'
import BulkActionBar from './BulkActionBar'

export default function SplitView() {
  const [filters, setFilters] = React.useState({})
  const { leads, loading, refetch, deleteLeadsById } = useLeads(filters)
  const [selectedLead, setSelectedLead] = React.useState(null)
  const [selected, setSelected] = React.useState(new Set())

  const selecting = selected.size > 0

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(leads.map((l) => l.id)))
  }

  const deselectAll = () => {
    setSelected(new Set())
  }

  const handleBulkDelete = async () => {
    const ids = [...selected]
    setSelected(new Set())
    await deleteLeadsById(ids)
  }

  React.useEffect(() => {
    if (!selecting) return
    const handler = (e) => {
      if (e.key === 'Escape') deselectAll()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selecting])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <i className="fa-solid fa-arrows-left-right text-white text-sm"></i>
        </div>
        <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
          <span className="text-orange-500">SPLIT</span> VIEW
        </h1>
      </div>
      <SearchFilterBar filters={filters} onFilterChange={setFilters} />
      <div className="flex gap-4 mt-4" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="w-1/2 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block w-6 h-6 border-[3px] border-orange-500 border-t-transparent animate-spin" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-3">Loading...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-white border-[3px] border-black p-8 text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-10 h-10 bg-gray-100 border-[2px] border-black flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-inbox text-gray-400"></i>
              </div>
              <p className="text-sm font-bold text-gray-500">No leads found</p>
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={setSelectedLead}
                selected={selected.has(lead.id)}
                onSelect={toggleSelect}
                selecting={selecting}
              />
            ))
          )}
        </div>
        <div className="w-1/2 overflow-y-auto">
          {selectedLead ? (
            <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={refetch} />
          ) : (
            <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-10 text-center flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 bg-gray-100 border-[3px] border-black flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-arrow-pointer text-xl text-gray-400"></i>
              </div>
              <p className="text-sm font-black text-gray-500 uppercase tracking-wider">Select a lead</p>
              <p className="text-xs font-bold text-gray-400 mt-1">to view details</p>
            </div>
          )}
        </div>
      </div>

      <BulkActionBar
        count={selected.size}
        allCount={leads.length}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onDelete={handleBulkDelete}
        selecting={selecting}
      />
    </div>
  )
}
