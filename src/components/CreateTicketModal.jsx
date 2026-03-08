import { useState, useRef } from 'react'
import { createTicket, uploadAttachment } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { STATUSES, PRIORITIES, TYPES } from '../constants'
import { toInstant } from '../api/client'
import './CreateTicketModal.css'
import { useApi } from '../hooks/UseApi'
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(contentType) {
  if (!contentType) return '📄'
  if (contentType.startsWith('image/'))       return '🖼'
  if (contentType === 'application/pdf')      return '📕'
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊'
  if (contentType.includes('word'))           return '📝'
  if (contentType.includes('zip') || contentType.includes('compressed')) return '🗜'
  return '📄'
}

export default function CreateTicketModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const api= useApi()
  const [form, setForm] = useState({
    title: '', description: '', type: 'DEFECT', priority: 'MEDIUM', status: 'OPEN',
    assignee: '', dueDate: '', projectId: '',
  })
  const [files, setFiles]       = useState([])   // File[] staged for upload
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [uploadProgress, setUploadProgress] = useState('') // status text during upload

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleFiles = e => {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...selected.filter(f => !existing.has(f.name + f.size))]
    })
    // Reset input so same file can be re-added after removal
    e.target.value = ''
  }

  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx))

  const handleDrop = e => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files || [])
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...dropped.filter(f => !existing.has(f.name + f.size))]
    })
  }

  const submit = async e => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setLoading(true); setError(''); setUploadProgress('')

    try {
      // 1. Create the ticket
      const payload = {
        title:            form.title,
        projectId:        Number(form.projectId),
        description:      form.description,
        ticketType:       form.type,
        ticketPriority:   form.priority,
        ticketStatus:     form.status,
        assigneeUserName: form.assignee || {},
        dueDate:          form.dueDate?toInstant(new Date(form.dueDate).toISOString()):null,
      }
      const created = await api(createTicket,payload)

      // 2. Upload attachments sequentially if any
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(`Uploading attachment ${i + 1} of ${files.length}…`)
          await  uploadAttachment(created.id, files[i])
        }
      }

      setUploadProgress('')
      onCreated?.(created)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal__header">
          <h2>Create Ticket</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <form className="modal__form" onSubmit={submit}>
          <div className="form-field">
            <label>Title *</label>
            <input name="title" value={form.title} onChange={handle}
              placeholder="Short summary of the issue" autoFocus />
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handle}
              placeholder="Describe the issue in detail…" rows={4} />
          </div>

          <div className="form-field">
            <label>Project ID</label>
            <input name="projectId" value={form.projectId} onChange={handle} placeholder="Project ID" />
          </div>

          <div className="modal__row">
            <div className="form-field">
              <label>Type</label>
              <select name="type" value={form.type} onChange={handle}
                className="filter-select" style={{ width: '100%' }}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select name="priority" value={form.priority} onChange={handle}
                className="filter-select" style={{ width: '100%' }}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handle}
                className="filter-select" style={{ width: '100%' }}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="modal__row">
            <div className="form-field">
              <label>Assignee username</label>
              <input name="assignee" value={form.assignee} onChange={handle} placeholder="username" />
            </div>
            <div className="form-field">
              <label>Due Date</label>
              <input type="date" name="dueDate" value={form.dueDate} onChange={handle} />
            </div>
          </div>

          {/* ── Attachments ── */}
          <div className="form-field">
            <label>Attachments <span className="label-optional">(optional)</span></label>
            <div
              className={`attach-dropzone${files.length > 0 ? ' attach-dropzone--has-files' : ''}`}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFiles}
              />
              {files.length === 0 ? (
                <div className="attach-dropzone__hint">
                  <span className="attach-dropzone__icon">↑</span>
                  <span>Click or drag files here</span>
                </div>
              ) : (
                <span className="attach-dropzone__add">+ Add more files</span>
              )}
            </div>

            {files.length > 0 && (
              <div className="attach-file-list">
                {files.map((file, idx) => (
                  <div key={idx} className="attach-file-row">
                    <span className="attach-file-icon">{fileIcon(file.type)}</span>
                    <span className="attach-file-name">{file.name}</span>
                    <span className="attach-file-size">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      className="attach-file-remove"
                      onClick={e => { e.stopPropagation(); removeFile(idx) }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploadProgress && <div className="upload-progress">{uploadProgress}</div>}
          {error && <div className="form-error">{error}</div>}

          <div className="modal__footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? <><span className="spinner" /> {uploadProgress ? 'Uploading…' : 'Creating…'}</>
                : 'Create Ticket'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}