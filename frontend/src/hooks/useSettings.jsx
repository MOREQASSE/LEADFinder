import React from 'react'
import api from '../services/api'

const SettingsContext = React.createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = React.useState({})
  const [pending, setPending] = React.useState({})
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    api.get('/settings/').then(r => {
      const map = {}
      r.data.forEach(s => { map[s.key] = s.value })
      setSettings(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const setValue = (key, value) => {
    setPending(prev => ({ ...prev, [key]: value }))
  }

  const saveAll = async (maybeUpdates = {}) => {
    const extraUpdates = (maybeUpdates && maybeUpdates.nativeEvent) ? {} : maybeUpdates;

    setPending(currentPending => {
      const allUpdates = { ...currentPending, ...extraUpdates }
      if (Object.keys(allUpdates).length === 0) return currentPending

      setSaving(true)
      api.post('/settings/bulk-update', { settings: allUpdates })
        .then(() => {
          setSettings(prev => ({ ...prev, ...allUpdates }))
          setPending(prev => {
            const next = { ...prev }
            Object.keys(allUpdates).forEach(k => {
              if (next[k] === allUpdates[k]) delete next[k]
            })
            return next
          })
        })
        .catch(err => console.error('Failed to save settings', err))
        .finally(() => setSaving(false))

      return currentPending
    })
  }

  const getValue = (key, fallback = '') => {
    if (key in pending) return pending[key]
    return settings[key] ?? fallback
  }

  const hasChanges = Object.keys(pending).length > 0

  return (
    <SettingsContext.Provider value={{ getValue, setValue, saveAll, saving, loading, hasChanges }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
