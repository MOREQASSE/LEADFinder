import React from 'react'
import api from '../services/api'

export function useNotifications() {
  const [notifications, setNotifications] = React.useState([])
  const [unreadCount, setUnreadCount] = React.useState(0)

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await api.get('/dashboard/notifications')
      setNotifications(res.data)
      setUnreadCount(res.data.filter((n) => !n.is_read).length)
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markRead = async (id) => {
    await api.post(`/dashboard/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    await api.post('/dashboard/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markRead, markAllRead, refetch: fetchNotifications }
}
