// const AUTH_BASE = 'https://mastercraft-clone.onrender.com/auth'
// const API_BASE  = 'https://mastercraft-clone.onrender.com/api'

// const AUTH_BASE = 'https://mastercraftclone-production.up.railway.app/auth'
// const API_BASE  = 'https://mastercraftclone-production.up.railway.app/api'

const AUTH_BASE = 'http://localhost:8090/auth'
const API_BASE  = 'http://localhost:8090/api'

const getToken = () => localStorage.getItem('access_token')

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
})

async function request(url, options = {}) {
  // _skipDefaultHeaders: used for multipart/form-data so browser sets Content-Type with boundary
  const { _skipDefaultHeaders, ...fetchOptions } = options
  const headers = _skipDefaultHeaders
    ? (fetchOptions.headers || {})
    : { ...authHeaders(), ...fetchOptions.headers }

  const res = await fetch(url, { ...fetchOptions, headers })

  if (res.status === 403) {
    localStorage.clear()
    window.location.href = '/'
    return
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg  = body.detail || body.message || body.title || `Request failed (${res.status})`
    const finalmsg = `http${res.status} : ` + msg
    throw new Error(finalmsg)
  }
  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

// ── Date helper ──────────────────────────────────────────────
export function toInstant(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d)) return null
  return d.toISOString()
}

// ── Auth ─────────────────────────────────────────────────────
export const login = (username, password) => {
  const body = new URLSearchParams({ username, password }).toString()
  return request(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

// ── Register ─────────────────────────────────────────────────
export const register = ({ username, email, password, fullName, roles }) =>
  request(`${AUTH_BASE}/register-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, fullName, roles }),
  })

// ── Tickets ──────────────────────────────────────────────────
export const getTickets = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`${API_BASE}/tickets${qs ? `?${qs}` : ''}`)
}

export const getTicket = (id) => request(`${API_BASE}/tickets/${id}`)

export const createTicket = ({ title, projectId, description, ticketType, ticketPriority, ticketStatus, assigneeUserName, dueDate }) =>
  request(`${API_BASE}/tickets`, {
    method: 'POST',
    body: JSON.stringify({ title, projectId, description, ticketType, ticketPriority, ticketStatus, assigneeUserName, dueDate }),
  })

export const updateTicket = (id, { title, description, ticketType, dueDate }) =>
  request(`${API_BASE}/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, description, ticketType, dueDate: dueDate ? toInstant(dueDate) : null }),
  })

export const assignTicket = (id, userName) =>
  request(`${API_BASE}/tickets/${id}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ userName }),
  })

export const updateTicketStatus = (id, status) =>
  request(`${API_BASE}/tickets/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })

export const updateTicketPriority = (id, priority) =>
  request(`${API_BASE}/tickets/${id}/priority`, {
    method: 'PUT',
    body: JSON.stringify({ priority }),
  })

export const updateTicketDueDate = (id, dateValue) =>
  request(`${API_BASE}/tickets/${id}/due-date`, {
    method: 'PUT',
    body: JSON.stringify({ dueDate: toInstant(dateValue) }),
  })

export const deleteTicket = (id) => request(`${API_BASE}/tickets/${id}`, { method: 'DELETE' })

// ── Assigned / Reported tickets ───────────────────────────────
export const getAssignedTickets = (userId) =>
  request(`${API_BASE}/users/${userId}/assigned-tickets`)

export const getReportedTickets = () =>
  request(`${API_BASE}/users/reported-tickets`)

// ── Admin ─────────────────────────────────────────────────────
export const getPendingUsers = () =>
  request(`${AUTH_BASE}/users/pending-auth`)

export const approveUser = ({ userId, toBeUpdatedUserStatus, userRolePermMap }) =>
  request(`${AUTH_BASE}/users/pending-auth`, {
    method: 'POST',
    body: JSON.stringify({ userId, toBeUpdatedUserStatus, userRolePermMap }),
  })

// ── Comments ─────────────────────────────────────────────────
export const getComments = (ticketId) =>
  request(`${API_BASE}/tickets/${ticketId}/comments`)

export const postComment = (ticketId, content) =>
  request(`${API_BASE}/tickets/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })

// ── Attachments ───────────────────────────────────────────────
export const getAttachments = (ticketId) =>
  request(`${API_BASE}/tickets/${ticketId}/attachments`)

export const deleteAttachments = (ticketId) => request(`${API_BASE}/tickets/${ticketId}/attachments`, { method: 'DELETE' })

export const uploadAttachment = (ticketId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request(`${API_BASE}/tickets/${ticketId}/attachments`, {
    method: 'POST',
    // _skipDefaultHeaders so browser sets Content-Type with correct multipart boundary
    _skipDefaultHeaders: true,
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    body: formData,
  })
}

export const downloadAttachment = async (id, originalName) => {
  const token = getToken()
  const res = await fetch(`${API_BASE}/download-attachment/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.status === 403 || res.status === 401) {
    localStorage.clear(); window.location.href = '/'; return
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || body.message || `Download failed (${res.status})`)
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = originalName
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// ── Keep-alive ping ───────────────────────────────────────────
// Hits /api/ping every 15 min to prevent backend from sleeping.
// Returns 'pong' on success. Fails silently — never shown to user.
export const pings = () =>
  fetch(`${API_BASE}/ping`, {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  }).catch(() => {}) // silent fail

  // ── AI Summary ────────────────────────────────────────────────
export const summarizeTicket = (ticketId) =>
  request(`${API_BASE}/tickets/summarize-tickets/${ticketId}`)
 