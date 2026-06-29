import React from 'react'
import { useNotifications } from '../../hooks/useNotifications'

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef()

  React.useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 bg-white border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-600 hover:text-orange-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center border-[2px] border-black px-1">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border-[4px] border-black z-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between px-4 py-3 border-b-[3px] border-black">
            <h3 className="text-sm font-black uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', cursive" }}>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-bold text-orange-500 hover:text-orange-600 underline underline-offset-2 decoration-2">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-5 text-sm font-bold text-gray-400 text-center">No notifications</div>
            )}
            {notifications.map((n) => (
              <div key={n.id}
                className={`px-4 py-3 border-b-[2px] border-gray-200 last:border-0 cursor-pointer transition-colors ${n.is_read ? 'bg-white' : 'bg-orange-50'}`}
                onClick={() => markRead(n.id)}
              >
                <div className="text-sm font-black text-gray-800">{n.title}</div>
                <div className="text-xs font-medium text-gray-500 mt-0.5">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
