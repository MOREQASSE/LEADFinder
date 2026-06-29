import React from 'react'
import { useLeads } from '../../hooks/useLeads'
import LeadCard from './LeadCard'
import LeadDetail from './LeadDetail'
import BulkActionBar from './BulkActionBar'

const columns = ['new', 'drafted', 'replied', 'archived']
const columnLabels = { new: 'New', drafted: 'Drafted', replied: 'Replied', archived: 'Archived' }

export default function KanbanBoard() {
  const { leads, loading, updateLead, refetch, deleteLeadsById } = useLeads()
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

  if (selectedLead) {
    return (
      <div>
        <button onClick={() => setSelectedLead(null)}
          className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all mb-4 flex items-center gap-2"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Board
        </button>
        <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={refetch} />
      </div>
    )
  }

  const grouped = {}
  columns.forEach((col) => { grouped[col] = leads.filter((l) => l.status === col) })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-orange-500 border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <i className="fa-solid fa-columns text-white text-sm"></i>
        </div>
        <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Bebas Neue', cursive" }}>
          <span className="text-orange-500">KANBAN</span> BOARD
        </h1>
      </div>
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block w-6 h-6 border-[3px] border-orange-500 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-3">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {columns.map((col) => (
            <div key={col} className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 min-h-[200px]">
              <h3 className="font-black text-xs uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2 pb-2 border-b-[3px] border-black">
                {columnLabels[col]}
                <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">{grouped[col]?.length || 0}</span>
              </h3>
              <div className="space-y-2">
                {(grouped[col] || []).map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={setSelectedLead}
                    selected={selected.has(lead.id)}
                    onSelect={toggleSelect}
                    selecting={selecting}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
