import { useState, useCallback, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CreateTicketModal from '../components/CreateTicketModal'
import { pings } from '../api/client'
import ErrorToast from '../components/ErrorToast'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.roles?.includes('ROLE_ADMIN')

  // ── Keep-alive: ping backend every 15 minutes ──
  useEffect(() => {
    pings() // immediate ping on mount
    const interval = setInterval(pings,  60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const [showCreate, setShowCreate]   = useState(false)
  const [refreshKey, setRefreshKey]   = useState(0)
  const [toast, setToast]             = useState(null)
  const [errorMsg, setErrorMsg]       = useState('')

  const handleLogout = () => { logout(); navigate('/') }

  const handleTicketCreated = useCallback((createdTicket) => {
    setShowCreate(false)
    setRefreshKey(k => k + 1)
    setToast({ id: createdTicket?.id, title: createdTicket?.title })
    setTimeout(() => setToast(null), 5000)
  }, [])

  // ── Nav items — admin sees Overview first, others see All Tickets ──
  const navItems = [
    // Admin overview — only for admins
    ...(isAdmin ? [{ to: '/dashboard', label: 'Overview', icon: IconGrid2, end: true }] : []),
    // All Tickets — admin uses a sub-route so Overview stays the default
    { to: isAdmin ? '/dashboard/tickets' : '/dashboard',
      label: 'All Tickets', icon: IconGrid,
      end: !isAdmin },
    { to: '/dashboard/my-tickets',       label: 'My Tickets',       icon: IconUser },
    { to: '/dashboard/reported-tickets', label: 'Reported Tickets',  icon: IconFlag },
  ]

  return (
    <div className="dashboard">

      {/* Success toast */}
      {toast && (
        <div className="toast toast--success fade-in">
          <span className="toast__icon">✓</span>
          <div className="toast__body">
            <span className="toast__title">Ticket created</span>
            <span className="toast__sub">#{toast.id} — {toast.title}</span>
          </div>
          <button className="toast__close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <ErrorToast message={errorMsg} onClose={() => setErrorMsg('')} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__top">
          <div className="sidebar__brand">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="#4a86c8" fillOpacity="0.15" />
              <path d="M10 26L18 10L26 26" stroke="#4a86c8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 21h10" stroke="#4a86c8" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span>Trackr</span>
          </div>

          <button className="sidebar__create-btn" onClick={() => setShowCreate(true)}>
            <span>+</span> New Ticket
          </button>

          <nav className="sidebar__nav">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}>
                <Icon />{label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar__bottom">
          <div className="sidebar__user">
            <div className="sidebar__avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.username}</span>
              <span className="sidebar__user-role">
                {isAdmin ? 'Admin' : user?.roles?.[0]?.replace('ROLE_', '') || 'Member'}
              </span>
            </div>
          </div>
          <button className="sidebar__logout" onClick={handleLogout} title="Sign out">
            <IconLogout />
          </button>
        </div>
      </aside>

      <main className="dashboard__main">
        <Outlet context={{ refreshKey }} />
      </main>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={handleTicketCreated}
          onError={msg => setErrorMsg(msg)}
        />
      )}
    </div>
  )
}

const IconGrid = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IconGrid2 = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="5" rx="1"/>
    <rect x="3" y="11" width="8" height="10" rx="1"/>
    <rect x="14" y="11" width="7" height="10" rx="1"/>
  </svg>
)
const IconUser = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const IconFlag = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)
const IconLogout = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
)