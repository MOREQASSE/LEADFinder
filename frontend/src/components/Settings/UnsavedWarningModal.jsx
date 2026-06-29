import React from 'react'
import api from '../../services/api'

export default function UnsavedWarningModal({ open, onSave, onLeave, onCancel }) {
  const [dismiss, setDismiss] = React.useState(false)

  React.useEffect(() => {
    if (open) setDismiss(false)
  }, [open])

  const handleLeave = async () => {
    if (dismiss) {
      await api.post('/settings/bulk-update', {
        settings: { dismiss_unsaved_warning: '1' }
      }).catch(() => {})
    }
    onLeave()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md mx-4 overflow-hidden">
        <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-500 border-[3px] border-black flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Unsaved Changes</h3>
              <p className="text-sm text-gray-600 font-medium mt-1">You have unsaved changes. Do you want to save before leaving?</p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group bg-[#f5f0eb] border-[3px] border-black p-3 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            <div
              onClick={(e) => { e.stopPropagation(); setDismiss(!dismiss) }}
              className={`w-5 h-5 border-[3px] border-black flex items-center justify-center transition-all ${
                dismiss ? 'bg-orange-500' : 'bg-white'
              }`}
            >
              {dismiss && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-gray-700 select-none">Do not remind me again</span>
          </label>

          <div className="flex flex-col gap-2.5">
            <button onClick={onSave}
              className="w-full bg-orange-500 border-[3px] border-black text-white px-5 py-3.5 text-sm font-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all uppercase tracking-wider flex items-center justify-center gap-2.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Changes & Stay
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={handleLeave}
                className="bg-white border-[3px] border-black text-red-600 px-4 py-3 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Leave Anyway
              </button>
              <button onClick={onCancel}
                className="bg-gray-900 border-[3px] border-black text-white px-4 py-3 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all uppercase tracking-wider flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
