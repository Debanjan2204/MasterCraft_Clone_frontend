import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getTicket, updateTicket, deleteTicket,
  assignTicket, updateTicketStatus, updateTicketPriority, updateTicketDueDate,
  getComments, postComment,
  getAttachments, uploadAttachment, downloadAttachment,
  summarizeTicket,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import ErrorToast from '../components/ErrorToast'
import { STATUSES, PRIORITIES, TYPES as TICKET_TYPES } from '../constants'
import './PageLayout.css'
import './TicketDetail.css'

function toInputDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d)) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// UTC ISO strings from backend → browser local timezone for display
const LOCAL_DATE_OPTS = { day: '2-digit', month: 'short', year: 'numeric' }
const LOCAL_TIME_OPTS = { hour: '2-digit', minute: '2-digit', hour12: false }

function formatDisplay(value) {
  if (!value) return '—'
  const d = new Date(value)          // parses UTC, displays in local tz
  if (isNaN(d)) return String(value)
  return d.toLocaleDateString('en-GB', LOCAL_DATE_OPTS)
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return String(value)
  return d.toLocaleDateString('en-GB', LOCAL_DATE_OPTS) +
    ', ' + d.toLocaleTimeString('en-GB', LOCAL_TIME_OPTS)
}

// Backend comment/attachment times are "2026-02-07 20:25:45" (no Z = treat as local from backend)
// Replace space with T but do NOT append Z — backend stores local time for these fields
function formatCommentTime(value) {
  if (!value) return ''
  const d = new Date(value.replace(' ', 'T'))
  if (isNaN(d)) return value
  return d.toLocaleDateString('en-GB', LOCAL_DATE_OPTS) +
    ', ' + d.toLocaleTimeString('en-GB', LOCAL_TIME_OPTS)
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAttachTime(value) {
  if (!value) return ''
  const d = new Date(value.replace(' ', 'T'))
  if (isNaN(d)) return value
  return d.toLocaleDateString('en-GB', LOCAL_DATE_OPTS)
}

function getFileIcon(contentType) {
  if (!contentType) return '📄'
  if (contentType.startsWith('image/'))  return '🖼'
  if (contentType === 'application/pdf') return '📕'
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊'
  if (contentType.includes('word'))      return '📝'
  if (contentType.includes('zip') || contentType.includes('compressed')) return '🗜'
  return '📄'
}

function ticketToForm(t) {
  return {
    title:       t.title       || '',
    description: t.description || '',
    ticketType:  t.type        || '',
    status:      t.status      || '',
    priority:    t.priority    || '',
    assignee:    t.assignee?.userName || '',
    dueDate:     toInputDateTime(t.dueDate),
  }
}

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('ROLE_ADMIN')

  const [ticket, setTicket]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState(false)

  const [editing, setEditing]           = useState(false)
  const [form, setForm]                 = useState({})
  const [saving, setSaving]             = useState(false)
  const [saveProgress, setSaveProgress] = useState('')

  const [comments, setComments]               = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentText, setCommentText]         = useState('')
  const [posting, setPosting]                 = useState(false)

  const [attachments, setAttachments]     = useState([])
  const [attachLoading, setAttachLoading] = useState(true)
  const [uploading, setUploading]         = useState(false)
  const attachInputRef = useRef(null)

  const [summary, setSummary]           = useState(null)   // null=not loaded, {}=loaded
  const [summaryOpen, setSummaryOpen]   = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryReady, setSummaryReady] = useState(false)   // true once fetched on mount

  const [errorMsg, setErrorMsg] = useState('')
  const showError = (msg) => setErrorMsg(msg || 'An unexpected error occurred.')

  const commentsEndRef = useRef(null)

  useEffect(() => {
    getTicket(id)
      .then(data => { setTicket(data); setForm(ticketToForm(data)) })
      .catch(e => showError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setCommentsLoading(true)
    getComments(id)
      .then(data => setComments(Array.isArray(data) ? data : data?.content ?? []))
      .catch(e => showError(e.message))
      .finally(() => setCommentsLoading(false))
  }, [id])

  useEffect(() => {
    if (!commentsLoading) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  useEffect(() => {
    setAttachLoading(true)
    getAttachments(id)
      .then(data => setAttachments(Array.isArray(data) ? data : []))
      .catch(e => showError(e.message))
      .finally(() => setAttachLoading(false))
  }, [id])

  // Fetch summary once per ticket. The ignore flag handles React Strict Mode's
  // double-invoke — if the effect is cleaned up, we discard the result.
  useEffect(() => {
    let ignore = false
    setSummary(null)
    setSummaryReady(false)
    setSummaryLoading(true)
    summarizeTicket(id)
      .then(data => {
        if (ignore) return
        console.log('[Summary] typeof:', typeof data)
        console.log('[Summary] raw:', data)
        let parsed = data
        if (typeof data === 'string') {
          try { parsed = JSON.parse(data) } catch(e) { console.error('[Summary] JSON.parse failed:', e) }
        }
        console.log('[Summary] parsed:', parsed)
        console.log('[Summary] Object.entries:', Object.entries(parsed))
        setSummary(parsed)
        setSummaryReady(true)
      })
      .catch(() => {
        if (!ignore) setSummaryReady(false)
      })
      .finally(() => {
        if (!ignore) setSummaryLoading(false)
      })
    return () => { ignore = true }
  }, [id])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const getChanges = () => {
    const original = ticketToForm(ticket)
    const changed = {}
    Object.keys(form).forEach(k => { if (form[k] !== original[k]) changed[k] = form[k] })
    return changed
  }

  const handleSave = async () => {
    const changes = getChanges()
    if (Object.keys(changes).length === 0) { setEditing(false); return }

    setSaving(true); setSaveProgress('')
    const coreFields = ['title', 'description', 'ticketType', 'dueDate']
    const needsCore  = coreFields.some(k => k in changes)

    let latest = ticket
    try {
      if (needsCore) {
        setSaveProgress('Saving core details…')
        latest = await updateTicket(id, {
          title: form.title, description: form.description,
          ticketType: form.ticketType,
          dueDate: form.dueDate ? new Date(form.dueDate) : null,
        })
      }
      if ('status' in changes) {
        setSaveProgress('Updating status…')
        latest = await updateTicketStatus(id, form.status)
      }
      if ('priority' in changes) {
        setSaveProgress('Updating priority…')
        latest = await updateTicketPriority(id, form.priority)
      }
      if ('assignee' in changes) {
        setSaveProgress('Updating assignee…')
        latest = await assignTicket(id, form.assignee)
      }
      if ('dueDate' in changes && !needsCore) {
        setSaveProgress('Updating due date…')
        latest = await updateTicketDueDate(id, form.dueDate ? new Date(form.dueDate) : null)
      }
      setTicket(latest); setForm(ticketToForm(latest)); setEditing(false)
    } catch (e) {
      showError(e.message)
    } finally {
      setSaving(false); setSaveProgress('')
    }
  }

  const handleCancel = () => { setForm(ticketToForm(ticket)); setEditing(false) }

  const remove = async () => {
    if (!confirm('Delete this ticket permanently?')) return
    setDeleting(true)
    try { await deleteTicket(id); navigate('/dashboard') }
    catch (e) { showError(e.message); setDeleting(false) }
  }

  const submitComment = async e => {
    e.preventDefault()
    if (!commentText.trim()) return
    setPosting(true)
    try {
      const newComment = await postComment(id, commentText.trim())
      setComments(c => [...c, newComment])
      setCommentText('')
    } catch (e) { showError(e.message) }
    finally { setPosting(false) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadAttachment(id, file)
      const updated = await getAttachments(id)
      setAttachments(Array.isArray(updated) ? updated : [])
    } catch (err) { showError(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleSummarize = async () => {
    // Toggle close
    if (summaryOpen) { setSummaryOpen(false); return }

    // Open panel
    setSummaryOpen(true)

    // Background fetch already succeeded — nothing to do
    if (summaryReady) return

    // Background fetch is still running — panel will show shimmer, data will appear when done
    if (summaryLoading) return

    // Background fetch failed silently — retry now
    setSummaryLoading(true)
    try {
      const data = await summarizeTicket(id)
      setSummary(data)
      setSummaryReady(true)
    } catch (e) { showError(e.message) }
    finally { setSummaryLoading(false) }
  }

  const handleDownload = async (a) => {
    try { await downloadAttachment(a.id, a.originalName) }
    catch (e) { showError(e.message) }
  }

  const initials = name => name?.[0]?.toUpperCase() ?? '?'
  const changedFields = editing ? Object.keys(getChanges()) : []
  const hasChanges = changedFields.length > 0

  if (loading) return (
    <div className="page fade-in">
      <div className="page__loading">{[...Array(6)].map((_, i) => <div key={i} className="skeleton-row" />)}</div>
    </div>
  )
  if (!ticket) return null

  return (
    <div className="page fade-in">

      <ErrorToast message={errorMsg} onClose={() => setErrorMsg('')} />

      {/* Top bar */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="detail-actions">
          {!editing ? (
            <>
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                <IconEdit /> Edit
              </button>
              <button className="btn-danger" onClick={remove}
                disabled={deleting || !isAdmin}
                title={!isAdmin ? 'Only admins can delete tickets' : ''}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </>
          ) : (
            <>
              {saving && saveProgress && <span className="save-progress">{saveProgress}</span>}
              <button className="btn-secondary" onClick={handleCancel} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !hasChanges}>
                {saving
                  ? <><span className="spinner" /> Saving…</>
                  : hasChanges
                    ? `Save ${changedFields.length} change${changedFields.length > 1 ? 's' : ''}`
                    : 'No changes'
                }
              </button>
            </>
          )}
        </div>
      </div>

      <div className="detail-body">

        {/* ── LEFT ── */}
        <div className="detail-main">

          {editing ? (
            <input className="detail-title-input" name="title" value={form.title} onChange={handleChange} />
          ) : (
            <h1 className="detail-title">{ticket.title}</h1>
          )}

          <div className="detail-meta-row">
            <span className="detail-id">#{ticket.id}</span>
            <StatusBadge   status={editing   ? form.status   : ticket.status} />
            <PriorityBadge priority={editing ? form.priority : ticket.priority} />
            {(editing ? form.ticketType : ticket.type) && (
              <span className="detail-type-badge">{editing ? form.ticketType : ticket.type}</span>
            )}
          </div>

          <div className="detail-section">
            <h3>Description</h3>
            {editing ? (
              <textarea className="detail-textarea" name="description" value={form.description} onChange={handleChange} rows={5} />
            ) : (
              <p className="detail-desc">
                {ticket.description || <em style={{ color: 'var(--text-muted)' }}>No description provided.</em>}
              </p>
            )}
          </div>


          {/* ── AI Summary panel ── */}
          <div className="summary-panel">
            <div className="summary-panel__trigger" onClick={handleSummarize} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleSummarize()}>
              <span className="summary-panel__trigger-left">
                <SparkleIcon />
                <span>AI Summary</span>
                {summaryReady && !summaryOpen && (
                  <span className="summary-panel__ready-dot" title="Summary ready" />
                )}
              </span>
              <span className="summary-panel__meta">
                {summaryLoading
                  ? <span className="summary-panel__status">Summarizing…</span>
                  : summaryReady
                    ? <span className="summary-panel__status summary-panel__status--ready">Ready</span>
                    : <span className="summary-panel__status">Click to load</span>
                }
                <span className={`summary-panel__chevron${summaryOpen ? ' summary-panel__chevron--open' : ''}`}>›</span>
              </span>
            </div>

            <div className={`summary-panel__body${summaryOpen ? ' summary-panel__body--open' : ''}`}>
              {summaryLoading ? (
                <div className="summary-shimmer">
                  {[80, 60, 90, 50, 70].map((w, i) => (
                    <div key={i} className="summary-shimmer__line" style={{ width: `${w}%`, animationDelay: `${i * 0.07}s` }} />
                  ))}
                </div>
              ) : summary && Object.keys(summary).length > 0 ? (
                <div className="summary-cards">
                  {Object.entries(summary).map(([key, value], i) => (
                    <SummaryCard key={key} index={i} label={key} text={value} />
                  ))}
                </div>
              ) : (
                <p className="summary-panel__empty">Summary unavailable.</p>
              )}
            </div>
          </div>

          {editing && hasChanges && (
            <div className="changed-fields-hint">
              <span className="changed-dot" />
              Will update: {changedFields.map(f => fieldLabel(f)).join(', ')}
            </div>
          )}

          {/* ── Attachments ── */}
          <div className="detail-section attachments-section">
            <h3>
              Attachments
              <span className="comments-count">{attachments.length}</span>
              <input ref={attachInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
              <button
                className="attach-upload-btn"
                onClick={() => attachInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <><span className="spinner--sm" /> Uploading…</> : '+ Upload'}
              </button>
            </h3>

            {attachLoading ? (
              <div className="skeleton-row" style={{ height: 40 }} />
            ) : attachments.length === 0 ? (
              <p className="attach-empty">No attachments yet.</p>
            ) : (
              <div className="attach-list">
                {attachments.map(a => (
                  <div key={a.id} className="attach-row" onClick={() => handleDownload(a)} title={`Download ${a.originalName}`}>
                    <span className="attach-row__icon">{getFileIcon(a.contentType)}</span>
                    <div className="attach-row__info">
                      <span className="attach-row__name">{a.originalName}</span>
                      <span className="attach-row__meta">
                        {formatBytes(a.size)} · {a.createdBy} · {formatAttachTime(a.createdAt)}
                      </span>
                    </div>
                    <span className="attach-row__download">↓</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Comments ── */}
          <div className="detail-section comments-section">
            <h3>Comments <span className="comments-count">{comments.length}</span></h3>

            <div className="comments-list">
              {commentsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="comment-skeleton" style={{ animationDelay: `${i * 0.08}s` }} />
                ))
              ) : comments.length === 0 ? (
                <div className="comments-empty">No comments yet.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="comment fade-in">
                    <div className="comment__avatar">{initials(c.author?.userName)}</div>
                    <div className="comment__body">
                      <span className="comment__author">{c.author?.userName ?? 'Unknown'}</span>
                      <p className="comment__content">{c.content}</p>
                      {c.time && (
                        <div className="comment__time-row">
                          <span className="comment__time">{formatCommentTime(c.time)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            <form className="comment-form" onSubmit={submitComment}>
              <div className="comment__avatar comment__avatar--me">{initials(user?.username)}</div>
              <div className="comment-input-wrap">
                <textarea
                  className="comment-input"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment(e) }}
                />
                <div className="comment-form__footer">
                  <span className="comment-hint">⌘ Enter to submit</span>
                  <button type="submit" className="btn-primary" disabled={posting || !commentText.trim()}
                    style={{ padding: '6px 14px', fontSize: '12px' }}>
                    {posting ? <span className="spinner" /> : 'Comment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── RIGHT sidebar ── */}
        <div className="detail-sidebar">
          <div className="detail-info-card">
            <h3>Details</h3>

            <div className="detail-field">
              <span>Status</span>
              {editing ? (
                <select name="status" value={form.status} onChange={handleChange}
                  className={`filter-select sidebar-select${changedFields.includes('status') ? ' field--changed' : ''}`}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : <StatusBadge status={ticket.status} />}
            </div>

            <div className="detail-field">
              <span>Priority</span>
              {editing ? (
                <select name="priority" value={form.priority} onChange={handleChange}
                  className={`filter-select sidebar-select${changedFields.includes('priority') ? ' field--changed' : ''}`}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              ) : <PriorityBadge priority={ticket.priority} />}
            </div>

            <div className="detail-field">
              <span>Type</span>
              {editing ? (
                <select name="ticketType" value={form.ticketType} onChange={handleChange}
                  className={`filter-select sidebar-select${changedFields.includes('ticketType') ? ' field--changed' : ''}`}>
                  {TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : <span className="detail-user">{ticket.type || '—'}</span>}
            </div>

            <div className="detail-field">
              <span>Reporter</span>
              <span className="detail-user">{ticket.reporter?.userName || '—'}</span>
            </div>

            <div className="detail-field">
              <span>Assignee</span>
              {editing ? (
                <input name="assignee" value={form.assignee} onChange={handleChange}
                  className={`sidebar-input${changedFields.includes('assignee') ? ' field--changed' : ''}`}
                  placeholder="username" autoComplete="off" />
              ) : <span className="detail-user">{ticket.assignee?.userName || 'Unassigned'}</span>}
            </div>

            <div className="detail-field">
              <span>Due Date</span>
              {editing ? (
                <input type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange}
                  className={`sidebar-input${changedFields.includes('dueDate') ? ' field--changed' : ''}`} />
              ) : <span className="detail-user">{formatDisplay(ticket.dueDate)}</span>}
            </div>

            {ticket.project && (
              <div className="detail-field">
                <span>Project</span>
                <span className="detail-user">{ticket.project?.ProjectName || '—'}</span>
              </div>
            )}

            <div className="detail-field">
              <span>Created</span>
              <span className="detail-user">{formatDisplay(ticket.createdAt)}</span>
            </div>

            <div className="detail-field">
              <span>Updated</span>
              <span className="detail-user">{formatDisplay(ticket.updatedAt)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function fieldLabel(key) {
  const map = {
    title: 'Title', description: 'Description', ticketType: 'Type',
    status: 'Status', priority: 'Priority', assignee: 'Assignee', dueDate: 'Due Date',
  }
  return map[key] || key
}

const IconEdit = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const CARD_STYLES = [
  { color: 'blue',  icon: '⚖' },
  { color: 'red',   icon: '⚠' },
  { color: 'green', icon: '✓' },
  { color: 'purple', icon: '◈' },
]

function SummaryCard({ index, label, text }) {
  if (!text) return null
  const { color, icon } = CARD_STYLES[index % CARD_STYLES.length]

  // Split on newlines or sentence-start digits for bullet rendering
  const lines = text
    .split(/\n|(?=\d+\.\s)/)
    .map(l => l.trim())
    .filter(Boolean)

  return (
    <div className={`summary-card summary-card--${color}`}>
      <div className="summary-card__header">
        <span className="summary-card__icon">{icon}</span>
        <span className="summary-card__label">{label}</span>
      </div>
      <ul className="summary-card__list">
        {lines.map((line, i) => (
          <li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>
        ))}
      </ul>
    </div>
  )
}

const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
)