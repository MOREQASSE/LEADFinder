import React from 'react'
import { createPortal } from 'react-dom'

export default function ConfirmModal({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant }) {
  if (!open) return null

  const confirmColor = variant === 'danger'
    ? 'bg-red-500 text-white hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
    : 'bg-orange-500 text-white hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onCancel} />
      <div
        className="relative bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm mx-4 p-6"
        role="dialog"
      >
        {title && (
          <h3
            className="text-lg font-black uppercase tracking-wider mb-3"
            style={{ fontFamily: "'Bebas Neue', cursive" }}
          >
            {title}
          </h3>
        )}
        <p className="text-sm text-gray-700 font-medium mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-700"
          >
            {cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all ${confirmColor}`}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
