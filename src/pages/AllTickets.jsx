import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom' // ✏️ added useSearchParams
import { getTickets } from '../api/client'
import TicketCard from '../components/TicketCard'
import { STATUSES, PRIORITIES } from '../constants'
import './PageLayout.css'
import { useApi } from '../hooks/useApi'
export default function AllTickets() {
  const { refreshKey = 0 } = useOutletContext() ?? {}

  // ✏️ read ?status= from URL on first mount (e.g. when navigating from admin dashboard)
  const [searchParams, setSearchParams] = useSearchParams()

  const [tickets, setTickets]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [search, setSearch]                 = useState('')
  // ✏️ initialise filterStatus from URL param if present
  const [filterStatus, setFilterStatus]     = useState(() => searchParams.get('status') || '')
  const [filterPriority, setFilterPriority] = useState('')
  const navigate = useNavigate()

  // ✏️ keep URL in sync when filter changes
  const handleStatusChange = (value) => {
    setFilterStatus(value)
    if (value) setSearchParams({ status: value })
    else setSearchParams({})
  }

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterPriority('')
    setSearchParams({})
  }

  const api = useApi()
  const fetchTickets = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {}
      if (search)         params.title    = search
      if (filterStatus)   params.status   = filterStatus
      if (filterPriority) params.priority = filterPriority
      const data = await api(getTickets,params)
      setTickets(Array.isArray(data) ? data : data?.content ?? [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [search, filterStatus, filterPriority])

  useEffect(() => {
    const t = setTimeout(fetchTickets, 300)
    return () => clearTimeout(t)
  }, [fetchTickets, refreshKey])

  return (
    <div className="page fade-in">
      <div className="page__header">
        <div>
          <h1 className="page__title">All Tickets</h1>
          <p className="page__sub">{tickets.length} issue{tickets.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="page__filters">
        <div className="search-box">
          <IconSearch />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets..."
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
        </div>

        {/* ✏️ uses handleStatusChange to keep URL in sync */}
        <select value={filterStatus} onChange={e => handleStatusChange(e.target.value)} className="filter-select">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-select">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {(filterStatus || filterPriority || search) && (
          <button className="filter-clear" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      {/* Content */}
      {error && <div className="page__error">{error}</div>}

      {loading ? (
        <div className="page__loading">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.07}s` }} />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="page__empty">
          <span>🎉</span>
          <p>No tickets found</p>
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map(t => (
            <TicketCard key={t.id} ticket={t} onClick={() => navigate(`/dashboard/tickets/${t.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

const IconSearch = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)