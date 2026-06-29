import React from 'react'
import rankColors from '../../utils/rankColors'
import { stripAndTruncate } from '../../utils/stripHtml'
import ConfirmModal from '../ui/ConfirmModal'

export default function LeadCard({ lead, onClick, onDelete, selected, onSelect, selecting }) {
  const colors = rankColors[lead.rank] || rankColors.Unknown
  const cleanTitle = stripAndTruncate(lead.title, 150)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const handleDelete = (e) => {
    e.stopPropagation()
    setConfirmDelete(true)
  }

  const confirmDeleteLead = () => {
    setConfirmDelete(false)
    onDelete?.(lead.id)
  }

  const handleCheckboxClick = (e) => {
    e.stopPropagation()
    onSelect?.(lead.id)
  }

  const handleCardClick = () => {
    if (selecting) {
      onSelect?.(lead.id)
    } else {
      onClick?.(lead)
    }
  }

  return (
    <>
    <div
      className={`bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all p-4 cursor-pointer group relative ${
        selected ? 'ring-2 ring-orange-500 ring-offset-1' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <div
          onClick={handleCheckboxClick}
          className={`mt-0.5 w-5 h-5 border-[3px] border-black flex items-center justify-center shrink-0 transition-all ${
            selected ? 'bg-orange-500' : 'bg-white group-hover:bg-gray-100'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-black text-sm leading-snug flex-1 pr-8 text-gray-900">{cleanTitle}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {!selecting && (
                <button
                  onClick={handleDelete}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all"
                  title="Delete Lead"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <span className={`px-2 py-0.5 border-[2px] border-black text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${colors.bg} ${colors.text}`}>
                {lead.rank}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2">
            <span className="bg-gray-100 border-[2px] border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">{lead.platform}</span>
            {lead.has_easy_apply && (
              <span className="bg-blue-500 border-[2px] border-black text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Easy Apply
              </span>
            )}
            {lead.budget_raw && <span>{lead.budget_raw}</span>}
          </div>
          <div className="text-xs font-bold text-gray-400">
            {lead.author && <span>@{lead.author} · </span>}
            {lead.timestamp && <span>{new Date(lead.timestamp).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Lead"
        message={`Delete "${cleanTitle}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteLead}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
