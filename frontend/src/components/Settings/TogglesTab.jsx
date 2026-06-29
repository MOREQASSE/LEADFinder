import React from 'react'
import { useSettings } from '../../hooks/useSettings'

const TOGGLES = [
  {
    key: 'dismiss_unsaved_warning',
    title: 'Unsaved Changes Warning',
    description: 'Show a warning popup when leaving the Settings page with unsaved changes.',
    icon: 'fa-triangle-exclamation',
    defaultValue: '',
    offValue: '1',
  },
  {
    key: 'auto_send_email',
    title: 'Auto-Send Outreach Emails',
    description: 'When disabled, generated emails are preview-only and not actually sent.',
    icon: 'fa-paper-plane',
    defaultValue: '1',
    offValue: '0',
  },
  {
    key: 'lionbridge_remote_only',
    title: 'Lionbridge Remote Only',
    description: 'Only show remote job listings when scraping Lionbridge.',
    icon: 'fa-house-laptop',
    defaultValue: '',
    offValue: '1',
    invert: true,
  },
]

export default function TogglesTab() {
  const { getValue, setValue } = useSettings()

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-gray-500 leading-relaxed">
        Toggle behaviors and reminders across the app. Changes require clicking "Save All" at the top.
      </p>
      {TOGGLES.map(t => {
        const defaultVal = t.defaultValue ?? ''
        const offVal = t.offValue ?? '1'
        const invert = t.invert ?? false
        const enabled = invert
          ? getValue(t.key, defaultVal) === offVal
          : getValue(t.key, defaultVal) !== offVal

        return (
          <div key={t.key} className="bg-white border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="h-2 bg-orange-500 border-b-[3px] border-black" />
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-500 border-[3px] border-black flex items-center justify-center shrink-0">
                <i className={`fa-solid ${t.icon} text-white`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">{t.title}</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">{t.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-wider ${enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {enabled ? 'On' : 'Off'}
                </span>
                <button
                  onClick={() => setValue(t.key, invert ? (enabled ? defaultVal : offVal) : (enabled ? offVal : defaultVal))}
                  className={`relative w-14 h-7 border-[3px] border-black transition-all ${
                    enabled ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white border-[2px] border-black transition-all ${
                    enabled ? 'left-[30px]' : 'left-[3px]'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
