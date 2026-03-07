import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets, getPendingUsers, approveUser } from '../api/client'
import ErrorToast from '../components/ErrorToast'
import './AdminDashboard.css'

const STATUS_META = {
  OPEN:         { label: 'Open',          color: 'var(--accent)',     dim: 'var(--accent-dim)'   },
  IN_PROGRESS:  { label: 'In Progress',   color: 'var(--yellow)',     dim: 'var(--yellow-dim)'   },
  PENDING_IT:   { label: 'Pending IT',    color: 'var(--purple)',     dim: 'var(--purple-dim)'   },
  PENDING_USER: { label: 'Pending User',  color: 'var(--orange)',     dim: 'var(--orange-dim)'   },
  FIXED_IN_BAT: { label: 'Fixed in BAT', color: 'var(--green)',      dim: 'var(--green-dim)'    },
  REOPEN:       { label: 'Reopened',      color: 'var(--red)',        dim: 'var(--red-dim)'      },
  CLOSED:       { label: 'Closed',        color: 'var(--text-muted)', dim: 'var(--bg-elevated)'  },
}

function roleBadgeClass(name) {
  if (name.includes('ADMIN'))     return 'role-badge role-badge--admin'
  if (name.includes('DEVELOPER')) return 'role-badge role-badge--dev'
  if (name.includes('TESTER'))    return 'role-badge role-badge--test'
  return 'role-badge'
}
function roleShort(name) { return name.replace('ROLE_', '') }
function isAdminRole(name) { return name.includes('ADMIN') }

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [tickets, setTickets]           = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingPending, setLoadingPending] = useState(true)
  const [errorMsg, setErrorMsg]         = useState('')
  const [successMsg, setSuccessMsg]       = useState('')

  // Per-user approval state: { [userId]: { [roleId]: 'APPROVED'|'REJECTED'|null } }
  const [roleDecisions, setRoleDecisions] = useState({})
  // Per-user submitting state
  const [submitting, setSubmitting] = useState({})

  useEffect(() => {
    getTickets()
      .then(data => setTickets(Array.isArray(data) ? data : data?.content ?? []))
      .catch(e => setErrorMsg(e.message))
      .finally(() => setLoadingTickets(false))

    getPendingUsers()
      .then(data => {
        const users = Array.isArray(data) ? data : []
        setPendingUsers(users)
        // Initialise role decisions to null for each non-admin role
        const initial = {}
        users.forEach(u => {
          initial[u.userId] = {}
          u.roleList.forEach(r => {
            if (!isAdminRole(r.roleName)) {
              initial[u.userId][r.roleId] = null
            }
          })
        })
        setRoleDecisions(initial)
      })
      .catch(e => setErrorMsg(e.message))
      .finally(() => setLoadingPending(false))
  }, [])

  const totalTickets = tickets.length
  const statCounts   = Object.keys(STATUS_META).reduce((acc, s) => {
    acc[s] = tickets.filter(t => t.status === s).length
    return acc
  }, {})
  const activeCount = statCounts.OPEN + statCounts.IN_PROGRESS +
                      statCounts.PENDING_IT + statCounts.PENDING_USER + statCounts.REOPEN
  const closedCount = statCounts.CLOSED + statCounts.FIXED_IN_BAT
  const activeStatuses = Object.entries(STATUS_META).filter(([s]) => statCounts[s] > 0)

  const setDecision = (userId, roleId, decision) => {
    setRoleDecisions(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [roleId]: decision },
    }))
  }

  // Check if at least one non-admin role has a decision
  const canSubmit = (user) => {
    const decisions = roleDecisions[user.userId] || {}
    return Object.values(decisions).some(v => v !== null)
  }

  const handleSubmit = async (user) => {
    const decisions = roleDecisions[user.userId] || {}

    // Build map only for non-null decisions
    const userRolePermMap = {}
    Object.entries(decisions).forEach(([roleId, decision]) => {
      if (decision !== null) userRolePermMap[roleId] = decision
    })

    // toBeUpdatedUserStatus: null if already ACTIVE, else ACTIVE
    const toBeUpdatedUserStatus = user.status === 'ACTIVE' ? null : 'ACTIVE'

    setSubmitting(prev => ({ ...prev, [user.userId]: true }))
    try {
      const res = await approveUser({ userId: user.userId, toBeUpdatedUserStatus, userRolePermMap })
      setPendingUsers(prev => prev.filter(u => u.userId !== user.userId))
      setSuccessMsg(typeof res === 'string' ? res : `User ${user.userName} updated successfully.`)
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setSubmitting(prev => ({ ...prev, [user.userId]: false }))
    }
  }

  const initials = name => name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="page fade-in admin-dashboard">
      <ErrorToast message={errorMsg} onClose={() => setErrorMsg('')} />
      <SuccessToast message={successMsg} onClose={() => setSuccessMsg('')} />

      <div className="page__header">
        <div>
          <h1 className="page__title">Admin Overview</h1>
          <p className="page__sub">System-wide snapshot</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/dashboard/tickets')}>
          View All Tickets →
        </button>
      </div>

      {/* ── TICKET SUMMARY ── */}
      <div className="admin-block">
        <div className="admin-block__header">
          <h2>Ticket Summary</h2>
        </div>

        <div className="ticket-summary-strip">
          <SummaryCard label="Total"  value={loadingTickets ? '—' : totalTickets} accent="var(--text-primary)" />
          <SummaryCard label="Active" value={loadingTickets ? '—' : activeCount}  accent="var(--accent)"       />
          <SummaryCard label="Closed" value={loadingTickets ? '—' : closedCount}  accent="var(--green)"        />
        </div>

        {loadingTickets ? (
          <div className="admin-skeletons">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton-row" style={{ height: 52, animationDelay: `${i * 0.05}s` }} />)}
          </div>
        ) : activeStatuses.length === 0 ? (
          <div className="admin-empty"><span>🎉</span><p>No tickets in the system yet.</p></div>
        ) : (
          <div className="status-kanban">
            {activeStatuses.map(([status, meta]) => {
              const count  = statCounts[status]
              const pct    = totalTickets ? Math.round((count / totalTickets) * 100) : 0
              const sample = tickets.filter(t => t.status === status).slice(0, 3)
              return (
                <div key={status} className="status-lane"
                  style={{ '--lane-color': meta.color, '--lane-dim': meta.dim }}
                  onClick={() => navigate(`/dashboard/tickets?status=${status}`)}>
                  <div className="status-lane__header">
                    <span className="status-lane__dot" />
                    <span className="status-lane__label">{meta.label}</span>
                    <span className="status-lane__pct">{pct}%</span>
                    <span className="status-lane__count">{count}</span>
                  </div>
                  <div className="status-lane__bar">
                    <div className="status-lane__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="status-lane__tickets">
                    {sample.map(t => (
                      <div key={t.id} className="status-lane__ticket">
                        <span className="status-lane__ticket-id">#{t.id}</span>
                        <span className="status-lane__ticket-title">{t.title}</span>
                      </div>
                    ))}
                    {count > 3 && <span className="status-lane__more">+{count - 3} more</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── USER SUMMARY ── */}
      <div className="admin-block">
        <div className="admin-block__header">
          <h2>User Summary</h2>
        </div>

        <div className="ticket-summary-strip">
          <SummaryCard label="Pending Auth"       value={loadingPending ? '—' : pendingUsers.length}                                          accent="var(--yellow)" />
          <SummaryCard label="Unverified"         value={loadingPending ? '—' : pendingUsers.filter(u => u.status === 'UNVERIFIED').length}   accent="var(--orange)" />
          <SummaryCard label="Active w/ Requests" value={loadingPending ? '—' : pendingUsers.filter(u => u.status === 'ACTIVE').length}       accent="var(--accent)" />
        </div>

        {loadingPending ? (
          <div className="admin-skeletons">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton-row" style={{ height: 72, animationDelay: `${i * 0.07}s` }} />)}
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="admin-empty">
            <span>✓</span>
            <p>No pending authorisation requests.</p>
          </div>
        ) : (
          <div className="pending-grid">
            {pendingUsers.map(u => {
              const decisions = roleDecisions[u.userId] || {}
              const isSubmitting = submitting[u.userId]
              const actionableRoles = u.roleList.filter(r => !isAdminRole(r.roleName))
              const adminRoles      = u.roleList.filter(r => isAdminRole(r.roleName))

              return (
                <div key={u.userId} className="pending-card">
                  <div className="pending-card__top">
                    <div className="pending-card__avatar">{initials(u.userName)}</div>
                    <div className="pending-card__info">
                      <span className="pending-card__name">{u.userName}</span>
                      <span className={`user-status user-status--${u.status.toLowerCase()}`}>
                        {u.status}
                      </span>
                    </div>
                  </div>

                  {/* Actionable roles — admin can approve/reject */}
                  {actionableRoles.length > 0 && (
                    <div className="pending-card__roles-section">
                      <span className="pending-card__roles-label">Role Requests</span>
                      <div className="pending-role-list">
                        {actionableRoles.map(r => (
                          <div key={r.roleId} className="pending-role-row">
                            <span className={roleBadgeClass(r.roleName)}>{roleShort(r.roleName)}</span>
                            <div className="role-decision-btns">
                              <button
                                className={`role-decision-btn role-decision-btn--approve${decisions[r.roleId] === 'APPROVED' ? ' active' : ''}`}
                                title="Approve"
                                onClick={() => setDecision(u.userId, r.roleId,
                                  decisions[r.roleId] === 'APPROVED' ? null : 'APPROVED'
                                )}
                                disabled={isSubmitting}
                              >✓</button>
                              <button
                                className={`role-decision-btn role-decision-btn--reject${decisions[r.roleId] === 'REJECTED' ? ' active' : ''}`}
                                title="Reject"
                                onClick={() => setDecision(u.userId, r.roleId,
                                  decisions[r.roleId] === 'REJECTED' ? null : 'REJECTED'
                                )}
                                disabled={isSubmitting}
                              >✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin role requests — read-only notice */}
                  {adminRoles.length > 0 && (
                    <div className="pending-card__admin-notice">
                      <span className="role-badge role-badge--admin">
                        {adminRoles.map(r => roleShort(r.roleName)).join(', ')}
                      </span>
                      <span className="admin-role-note">Requires superadmin</span>
                    </div>
                  )}

                  <button
                    className="pending-submit-btn"
                    onClick={() => handleSubmit(u)}
                    disabled={isSubmitting || !canSubmit(u)}
                  >
                    {isSubmitting
                      ? <><span className="spinner--sm" /> Submitting…</>
                      : 'Submit Decision'
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="summary-card">
      <span className="summary-card__value" style={{ color: accent }}>{value}</span>
      <span className="summary-card__label">{label}</span>
    </div>
  )
}


function SuccessToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null

  return (
    <div className="success-toast fade-in" role="status">
      <div className="success-toast__icon">✓</div>
      <div className="success-toast__body">
        <span className="success-toast__title">Success</span>
        <span className="success-toast__msg">{message}</span>
      </div>
      <button className="success-toast__close" onClick={onClose}>✕</button>
    </div>
  )
}