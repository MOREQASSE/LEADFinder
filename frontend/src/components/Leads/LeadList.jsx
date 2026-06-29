import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLeads } from '../../hooks/useLeads'
import SearchFilterBar from '../Filters/SearchFilterBar'
import LeadCard from './LeadCard'
import LeadDetail from './LeadDetail'
import ConfirmModal from '../ui/ConfirmModal'
import BulkActionBar from './BulkActionBar'

export default function LeadList({ compact }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilters = React.useMemo(() => {
    const f = {}
    if (searchParams.get('platform')) f.platform = searchParams.get('platform')
    if (searchParams.get('rank')) f.rank = searchParams.get('rank')
    if (searchParams.get('status')) f.status = searchParams.get('status')
    if (searchParams.get('keyword')) f.keyword = searchParams.get('keyword')
    if (searchParams.get('application_status')) f.application_status = searchParams.get('application_status')
    if (searchParams.get('easy_apply')) f.easy_apply = searchParams.get('easy_apply') === 'true'
    return f
  }, []) // eslint-disable-line
  const [filters, setFilters] = React.useState(initialFilters)
  const { leads, loading, refetch, updateLead, bulkDeleteLeads, deleteLead, deleteLeadsById } = useLeads(filters)
  const [selectedLead, setSelectedLead] = React.useState(null)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
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

  const handleDeleteAll = async () => {
    setConfirmDelete(false)
    await bulkDeleteLeads()
    refetch()
  }

  React.useEffect(() => {
    if (!selecting) return
    const handler = (e) => {
      if (e.key === 'Escape') deselectAll()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selecting])

  if (selectedLead) {
    return (
      <div>
        <button onClick={() => setSelectedLead(null)}
          className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all mb-4 flex items-center gap-2"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to list
        </button>
        <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={refetch} />
      </div>
    )
  }

  return (
    <>
      <div>
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <i className="fa-solid fa-list text-white text-sm"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
              <span className="text-orange-500">ALL</span> LEADS
            </h1>
          </div>
          {leads.length > 0 && (
            <button onClick={() => setConfirmDelete(true)}
              className="bg-white border-[3px] border-black text-gray-500 font-black text-xs uppercase tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:text-red-500 transition-all flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete All Filtered
            </button>
          )}
        </div>
      )}
      <SearchFilterBar filters={filters} onFilterChange={setFilters} />
      {loading ? (
        <div className="text-center py-10 mt-4">
          <div className="inline-block w-6 h-6 border-[3px] border-orange-500 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-3">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border-[3px] border-black p-8 text-center mt-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-10 h-10 bg-gray-100 border-[2px] border-black flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-inbox text-gray-400"></i>
          </div>
          <p className="text-sm font-bold text-gray-500">No leads found</p>
          <p className="text-xs font-bold text-gray-400 mt-1">Scrapers will fetch leads automatically.</p>
        </div>
      ) : (
        <div className="grid gap-3 mt-4">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={setSelectedLead}
              onDelete={deleteLead}
              selected={selected.has(lead.id)}
              onSelect={toggleSelect}
              selecting={selecting}
            />
          ))}
        </div>
      )}
    </div>

      <BulkActionBar
        count={selected.size}
        allCount={leads.length}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onDelete={handleBulkDelete}
        selecting={selecting}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete All"
        message={`Are you sure you want to delete these ${leads.length} leads? This cannot be undone.`}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
