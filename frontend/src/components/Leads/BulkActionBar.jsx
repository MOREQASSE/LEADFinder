import React from 'react'
import ConfirmModal from '../ui/ConfirmModal'

export default function BulkActionBar({ count, allCount, onSelectAll, onDeselectAll, onDelete, selecting }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const handleDelete = () => {
    setConfirmOpen(true)
  }

  const confirmDelete = () => {
    setConfirmOpen(false)
    onDelete()
  }

  if (!selecting || count === 0) return null

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center pb-5 pointer-events-none">
        <div className="bg-black text-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] px-5 py-3 flex items-center gap-4 pointer-events-auto animate-slideUp">
          <span className="text-xs font-black uppercase tracking-wider text-orange-400">
            {count} selected
          </span>

          <button
            onClick={onSelectAll}
            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-[2px] border-white/30 text-white/70 hover:text-white hover:border-white/60 transition-all"
          >
            All ({allCount})
          </button>

          <button
            onClick={onDeselectAll}
            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-[2px] border-white/30 text-white/70 hover:text-white hover:border-white/60 transition-all"
          >
            None
          </button>

          <div className="w-px h-5 bg-white/20" />

          <button
            onClick={handleDelete}
            className="text-[10px] font-black uppercase tracking-wider px-4 py-1.5 bg-red-500 border-[2px] border-white/30 text-white hover:bg-red-400 hover:border-white/60 transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>

          <button
            onClick={onDeselectAll}
            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-[2px] border-white/30 text-white/50 hover:text-white hover:border-white/60 transition-all"
          >
            ESC
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Delete Selected"
        message={`Are you sure you want to delete ${count} lead${count > 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
