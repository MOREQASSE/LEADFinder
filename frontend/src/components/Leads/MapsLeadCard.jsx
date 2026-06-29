import React from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import ConfirmModal from '../ui/ConfirmModal'

function parseDescription(lead) {
  const lines = (lead.description || '').split('\n')
  const data = { rating: '', phone: '', address: '', type: '', reason: '' }
  for (const line of lines) {
    if (line.startsWith('Rating:')) data.rating = line.replace('Rating:', '').trim()
    else if (line.startsWith('Phone:')) data.phone = line.replace('Phone:', '').trim()
    else if (line.startsWith('Address:')) data.address = line.replace('Address:', '').trim()
    else if (line.startsWith('Type:')) data.type = line.replace('Type:', '').trim()
    else if (line.startsWith('REASON:')) data.reason = line.replace('REASON:', '').trim()
  }
  return data
}

export default function MapsLeadCard({ lead, onClick, onDelete }) {
  const info = parseDescription(lead)
  const tags = lead.tags || []
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    setConfirmDelete(false)
    try {
      await api.delete(`/leads/${lead.id}`)
      onDelete?.(lead.id)
    } catch (err) {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const promptDelete = (e) => {
    e.stopPropagation()
    setConfirmDelete(true)
  }

  return (
    <>
    <div
      onClick={() => onClick?.(lead)}
      className="bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer group"
    >
      <div className="h-2 bg-orange-500 border-b-[2px] border-black" />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-black text-gray-900 text-sm leading-snug flex-1 mr-2 uppercase tracking-tight">
            {lead.title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={promptDelete} disabled={deleting}
              className="text-gray-300 hover:text-red-500 transition-all text-xs p-1" title="Delete">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <span className="bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 border-[2px] border-black whitespace-nowrap uppercase tracking-wider">
              No Website
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {info.type && (
            <span className="bg-white text-gray-900 text-[10px] font-bold px-2 py-0.5 border-[2px] border-black">
              {info.type}
            </span>
          )}
          {tags.filter(t => t !== 'maps').map(tag => (
            <span key={tag} className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 border-[2px] border-black capitalize">
              {tag}
            </span>
          ))}
          {info.rating && (
            <span className="bg-white text-orange-500 text-[10px] font-black px-2 py-0.5 border-[2px] border-black">
              ★ {info.rating}
            </span>
          )}
        </div>

        <div className="space-y-1 text-xs text-gray-500">
          {info.phone && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="font-medium">{info.phone}</span>
            </div>
          )}
          {info.address && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">{info.address}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t-[2px] border-black flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-bold">
            {info.reason || 'Potential client without website'}
          </span>
          <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete Lead"
        message={`Delete "${lead.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
