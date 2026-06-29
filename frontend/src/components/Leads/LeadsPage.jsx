import React from 'react'
import api from '../../services/api'
import LeadList from './LeadList'
import KanbanBoard from './KanbanBoard'
import SplitView from './SplitView'

const VIEWS = [
  { id: 'list', label: 'List', icon: 'fa-list' },
  { id: 'kanban', label: 'Kanban', icon: 'fa-columns' },
  { id: 'split', label: 'Split', icon: 'fa-arrows-left-right' },
]

export default function LeadsPage() {
  const [view, setView] = React.useState('list')
  const [reclassifying, setReclassifying] = React.useState(false)
  const [reclassifyResult, setReclassifyResult] = React.useState(null)

  const handleReclassify = async () => {
    setReclassifying(true)
    setReclassifyResult(null)
    try {
      const res = await api.post('/leads/reclassify')
      setReclassifyResult(res.data)
    } catch {
      setReclassifyResult({ error: 'Reclassification failed' })
    } finally {
      setReclassifying(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-white border-[4px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-1 w-fit">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-black uppercase tracking-wider transition-all duration-200 ${
                view === v.id
                  ? 'bg-orange-500 text-white border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className={`fa-solid ${v.icon}`}></i>
              {v.label}
            </button>
          ))}
        </div>
        <button onClick={handleReclassify} disabled={reclassifying}
          className="bg-white border-[3px] border-black text-gray-600 font-black text-xs uppercase tracking-wider px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:text-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:hover:translate-x-0 disabled:hover:translate-y-0 flex items-center gap-2"
        >
          <i className={`fa-solid ${reclassifying ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>
          {reclassifying ? 'Reclassifying…' : 'Reclassify'}
        </button>
      </div>

      {reclassifyResult && (
        <div className={`mb-6 p-4 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 text-sm font-bold ${
          reclassifyResult.error
            ? 'bg-red-50 text-red-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}>
          <i className={`fa-solid ${reclassifyResult.error ? 'fa-circle-exclamation' : 'fa-check-circle'}`}></i>
          {reclassifyResult.error
            ? reclassifyResult.error
            : `Reclassified ${reclassifyResult.updated} of ${reclassifyResult.total} leads`
          }
          <button onClick={() => setReclassifyResult(null)} className="ml-auto opacity-50 hover:opacity-100">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
      )}

      {view === 'list' && <LeadList compact />}
      {view === 'kanban' && <KanbanBoard />}
      {view === 'split' && <SplitView />}
    </div>
  )
}
