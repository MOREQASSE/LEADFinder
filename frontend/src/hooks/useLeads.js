import React from 'react'
import api from '../services/api'

export function useLeads(filters = {}) {
  const [leads, setLeads] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  const filtersKey = JSON.stringify(filters)

  const fetchLeads = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.platform) params.append('platform', filters.platform)
      if (filters.rank) params.append('rank', filters.rank)
      if (filters.status) params.append('status', filters.status)
      if (filters.keyword) params.append('keyword', filters.keyword)
      if (filters.easy_apply !== undefined) params.append('easy_apply', filters.easy_apply)
      if (filters.application_status) params.append('application_status', filters.application_status)
      if (filters.sort) params.append('sort', filters.sort)
      const res = await api.get(`/leads/?${params.toString()}`)
      setLeads(res.data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtersKey]) // eslint-disable-line

  React.useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const updateLead = async (id, data) => {
    const res = await api.patch(`/leads/${id}`, data)
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...res.data } : l)))
    return res.data
  }

  const deleteLead = async (id) => {
    await api.delete(`/leads/${id}`)
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  const bulkDeleteLeads = async () => {
    const params = new URLSearchParams()
    if (filters.platform) params.append('platform', filters.platform)
    if (filters.rank) params.append('rank', filters.rank)
    if (filters.status) params.append('status', filters.status)
    if (filters.keyword) params.append('keyword', filters.keyword)
    if (filters.easy_apply !== undefined) params.append('easy_apply', filters.easy_apply)
    if (filters.application_status) params.append('application_status', filters.application_status)
    
    await api.delete(`/leads/?${params.toString()}`)
    await fetchLeads()
  }

  const deleteLeadsById = async (ids) => {
    await api.post('/leads/delete-bulk', { ids })
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)))
  }

  return { leads, loading, error, refetch: fetchLeads, updateLead, deleteLead, bulkDeleteLeads, deleteLeadsById }
}
