export function formatBudget(lead) {
  if (lead.budget_raw) return lead.budget_raw
  if (lead.budget_min != null && lead.budget_max != null) {
    return `${lead.budget_min} - ${lead.budget_max} ${lead.budget_currency || 'USD'}`
  }
  if (lead.budget_min != null) {
    return `${lead.budget_min} ${lead.budget_currency || 'USD'}`
  }
  return 'Unknown'
}

export function formatMAD(lead) {
  if (lead.budget_mad != null) {
    return `~ ${lead.budget_mad.toLocaleString()} MAD`
  }
  return ''
}
