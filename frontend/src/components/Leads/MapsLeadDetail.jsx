import React from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import ReplyEditor from './ReplyEditor'
import ConfirmModal from '../ui/ConfirmModal'

function parseDescription(lead) {
  const lines = (lead.description || '').split('\n')
  const data = { rating: '', reviewCount: '', phone: '', address: '', type: '', reason: '', reviews: [], pros: [], cons: [] }
  let section = null
  for (const line of lines) {
    if (line.startsWith('Rating:')) {
      const rest = line.replace('Rating:', '').trim()
      const m = rest.match(/([\d.]+)\s*\(?\s*(\d[\d,]*)\s*reviews?/i)
      if (m) {
        data.rating = m[1]
        data.reviewCount = m[2].replace(',', '')
      } else {
        data.rating = rest
      }
    } else if (line.startsWith('Phone:')) data.phone = line.replace('Phone:', '').trim()
    else if (line.startsWith('Address:')) data.address = line.replace('Address:', '').trim()
    else if (line.startsWith('Type:')) data.type = line.replace('Type:', '').trim()
    else if (line.startsWith('REASON:')) data.reason = line.replace('REASON:', '').trim()
    else if (line === '---REVIEWS---') section = 'reviews'
    else if (line === '---REVIEWS_END---') section = null
    else if (line === '---PROS---') section = 'pros'
    else if (line === '---PROS_END---') section = null
    else if (line === '---CONS---') section = 'cons'
    else if (line === '---CONS_END---') section = null
    else if (section === 'reviews' && line.trim()) data.reviews.push(line.trim())
    else if (section === 'pros' && line.trim()) data.pros.push(line.trim())
    else if (section === 'cons' && line.trim()) data.cons.push(line.trim())
  }
  return data
}

function StarRating({ rating, size = 'md' }) {
  const num = parseFloat(rating) || 0
  const full = Math.floor(num)
  const frac = num - full
  const showHalf = frac >= 0.5
  const total = showHalf ? full + 1 : full

  const sizeClass = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <span className={`inline-flex items-center gap-0.5 text-orange-500 font-black ${sizeClass}`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className="text-orange-500">★</span>
        if (showHalf && i === full) return <span key={i} className="text-orange-500">½</span>
        return <span key={i} className="text-gray-300">★</span>
      })}
    </span>
  )
}

function ReviewCard({ review }) {
  const parts = review.split('|')
  if (parts.length < 3) return null
  const [name, rating, ...textParts] = parts
  const text = textParts.join('|')

  return (
    <div className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{name}</span>
        <StarRating rating={rating} size="sm" />
      </div>
      <p className="text-xs text-gray-600 font-medium leading-relaxed">{text}</p>
    </div>
  )
}

export default function MapsLeadDetail({ lead, onClose, onUpdate }) {
  const [reply, setReply] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const info = parseDescription(lead)
  const tags = lead.tags || []

  const generateDraft = async () => {
    setLoading(true)
    try {
      const res = await api.post('/replies/generate', { lead_id: lead.id })
      setReply(res.data)
    } catch (e) {
      alert('Failed to generate draft: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setConfirmDelete(false)
    try {
      await api.delete(`/leads/${lead.id}`)
      onUpdate?.()
      onClose?.()
    } catch (e) {
      alert('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  React.useEffect(() => {
    api.get('/replies/', { params: { lead_id: lead.id } })
      .then(r => { if (r.data.length) setReply(r.data[0]) })
      .catch(() => {})
  }, [lead.id])

  return (
    <>
    <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Header */}
      <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
      <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-black bg-[#f5f0eb]">
        <h2 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Lead Details</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setConfirmDelete(true)} disabled={deleting}
            className="text-xs font-black text-red-500 border-[2px] border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={onClose} className="text-gray-700 hover:text-gray-900 font-black text-xl leading-none border-[2px] border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">&times;</button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Business name + No Website badge */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-black text-gray-900 flex-1 mr-4 uppercase tracking-tight">{lead.title}</h3>
            <span className="flex-shrink-0 bg-orange-500 text-white text-xs font-black px-3 py-1 border-[2px] border-black uppercase tracking-wider">
              No Website
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {info.type && (
              <span className="bg-white text-gray-900 text-xs font-bold px-2.5 py-1 border-[2px] border-black">
                {info.type}
              </span>
            )}
            {tags.filter(t => t !== 'maps').map(tag => (
              <span key={tag} className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 border-[2px] border-black capitalize">
                {tag}
              </span>
            ))}
            <span className="bg-gray-800 text-white text-xs font-black px-2.5 py-1 border-[2px] border-black uppercase tracking-wider">
              Google Maps
            </span>
          </div>
        </div>

        {/* Rating section - numerical score + star display + total reviews */}
        {info.rating && (
          <div className="bg-white border-[3px] border-black p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Rating</div>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-gray-900" style={{ fontFamily: "'Bebas Neue', cursive" }}>{info.rating}</span>
              <div className="flex flex-col gap-0.5">
                <StarRating rating={info.rating} size="lg" />
                {info.reviewCount && (
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{info.reviewCount} Reviews</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lead.author && lead.author !== 'No phone' && (
            <div className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Phone</div>
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{lead.author}</span>
                <a href={`tel:${lead.author.replace(/\s/g, '')}`} className="ml-auto text-orange-500 font-black text-xs uppercase tracking-wider border-[2px] border-black px-2 py-0.5 bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all" target="_blank" rel="noopener noreferrer">
                  Call
                </a>
                <a href={`https://wa.me/${lead.author.replace(/[^0-9]/g, '')}`} className="text-emerald-500 font-black text-xs uppercase tracking-wider border-[2px] border-black px-2 py-0.5 bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </div>
            </div>
          )}
          {info.address && (
            <div className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Address</div>
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{info.address}</span>
              </div>
            </div>
          )}
          <div className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Status</div>
            <div className="flex items-center gap-2 text-sm font-black text-gray-900">
              <span className={`w-2 h-2 border-[1px] border-black ${lead.status === 'new' ? 'bg-orange-500' : lead.status === 'replied' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              <span className="uppercase">{lead.status}</span>
            </div>
          </div>
        </div>

        {/* Reason */}
        {info.reason && (
          <div className="bg-emerald-500 border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-sm font-black text-white uppercase tracking-wider">Opportunity</div>
                <div className="text-xs text-white/80 font-bold mt-0.5">{info.reason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews section */}
        {info.reviews.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-6 bg-orange-500" />
              <h4 className="text-base font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Reviews</h4>
            </div>
            <div className="space-y-3">
              {info.reviews.map((r, i) => (
                <ReviewCard key={i} review={r} />
              ))}
            </div>
          </div>
        )}

        {/* Pros & Cons section */}
        {(info.pros.length > 0 || info.cons.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {info.pros.length > 0 && (
              <div className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">Pros / Features</span>
                </div>
                <ul className="space-y-1.5">
                  {info.pros.map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {info.cons.length > 0 && (
              <div className="bg-white border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="text-xs font-black text-red-600 uppercase tracking-wider">Cons / Missing</span>
                </div>
                <ul className="space-y-1.5">
                  {info.cons.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Google Maps link */}
        {lead.url && (
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 border-[3px] border-black text-white font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all uppercase tracking-wider text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Google Maps
          </a>
        )}

        {/* Reply Draft section */}
        <div className="border-t-[3px] border-black pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Reply Draft</h4>
            {!reply && (
              <div className="flex items-center gap-2">
                <button onClick={generateDraft} disabled={loading}
                  className="bg-orange-500 border-[3px] border-black text-white px-5 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 uppercase tracking-wider">
                  {loading ? 'Generating...' : 'Generate Draft'}
                </button>
                <Link to="/settings"
                  className="bg-white border-[3px] border-black text-gray-600 px-3 py-2 text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all uppercase tracking-wider flex items-center gap-1.5"
                  title="Edit system prompt in Settings">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Prompt
                </Link>
              </div>
            )}
          </div>
          {reply && <ReplyEditor reply={reply} lead={lead} onUpdate={setReply} />}
          {!reply && (
            <p className="text-sm text-gray-500 font-bold text-center py-8 border-[2px] border-dashed border-black bg-[#f5f0eb]">
              Generate an AI draft reply to offer your services to this business
            </p>
          )}
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
