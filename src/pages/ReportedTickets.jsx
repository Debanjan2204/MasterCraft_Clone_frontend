import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReportedTickets } from '../api/client'
import { useAuth } from '../context/AuthContext'
import TicketCard from '../components/TicketCard'
import './PageLayout.css'

export default function ReportedTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    getReportedTickets()
      .then(data => setTickets(Array.isArray(data) ? data : data?.content ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="page fade-in">
      <div className="page__header">
        <div>
          <h1 className="page__title"> Reported Tickets</h1>
          <p className="page__sub">{tickets.length} reported by you</p>
        </div>
      </div>

      {error && <div className="page__error">{error}</div>}

      {loading ? (
        <div className="page__loading">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.07}s` }} />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="page__empty">
          <span>✅</span>
          <p>No tickets reported by you</p>
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