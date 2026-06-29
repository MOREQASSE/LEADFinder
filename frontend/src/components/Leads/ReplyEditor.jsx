import React from 'react'
import api from '../../services/api'

export default function ReplyEditor({ reply, lead, onUpdate }) {
  const [content, setContent] = React.useState(reply.draft_content || '')
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(reply.status === 'sent')

  const phone = lead.contact_phone || lead.author || ''
  const email = lead.contact_email || ''

  const handleSend = async () => {
    setSending(true)
    try {
      await api.post('/replies/send', { reply_id: reply.id, content })
      setSent(true)
      onUpdate?.({ ...reply, status: 'sent', sent_content: content })
    } catch (e) {
      alert('Failed to send: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-gray-100 border-[3px] border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-emerald-600 text-sm font-black uppercase tracking-wider mb-2">Reply Sent!</p>
        <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  const contentWithoutSubject = content.replace(/^Subject:.*\n?/im, '').trim()
  const whatsappUrl = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(contentWithoutSubject)}` : null
  const mailtoUrl = email ? `mailto:${email}?subject=${encodeURIComponent('Business Inquiry')}&body=${encodeURIComponent(content)}` : null

  return (
    <div>
      <textarea
        className="w-full bg-white border-[3px] border-black p-3 text-sm font-medium min-h-[120px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex flex-wrap gap-2 mt-3">
        {email && (
          <a
            href={mailtoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-orange-500 border-[3px] border-black text-white px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send as Email
          </a>
        )}
        {phone && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-500 border-[3px] border-black text-white px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all uppercase tracking-wider"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Send via WhatsApp
          </a>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={handleSend} disabled={sending || !content.trim()}
            className="bg-gray-800 border-[3px] border-black text-white px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 uppercase tracking-wider">
            {sending ? 'Saving...' : 'Save Reply'}
          </button>
          <button onClick={() => onUpdate?.(null)}
            className="bg-white border-[3px] border-black text-gray-700 px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all uppercase tracking-wider">
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
