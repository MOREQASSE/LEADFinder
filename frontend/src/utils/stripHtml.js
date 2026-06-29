/**
 * Strip HTML tags from text and decode HTML entities
 */
export function stripHtml(html) {
  if (!html) return ''
  
  // Create a temporary element
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  
  // Get text content (this decodes HTML entities automatically)
  let text = tmp.textContent || tmp.innerText || ''
  
  // Clean up extra whitespace
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Truncate text to a certain length with ellipsis
 */
export function truncate(text, length = 200) {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length).trim() + '...'
}

/**
 * Strip HTML and truncate in one go
 */
export function stripAndTruncate(html, length = 200) {
  return truncate(stripHtml(html), length)
}
