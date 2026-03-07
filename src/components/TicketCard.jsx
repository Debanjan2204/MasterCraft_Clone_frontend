import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'
import './TicketCard.css'

export default function TicketCard({ ticket, onClick }) {
  return (
    <div className="ticket-card" onClick={onClick}>
      <div className="ticket-card__left">
        <span className="ticket-card__id">#{ticket.id}</span>
        <div className="ticket-card__info">
          <span className="ticket-card__title">{ticket.title}</span>
          <span className="ticket-card__meta">
            {ticket.project?.name && <span className="ticket-card__project">{ticket.project.name}</span>}
            {ticket.type && <span className="ticket-card__type">{ticket.type}</span>}
          </span>
        </div>
      </div>
      <div className="ticket-card__right">
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} />
        {ticket.assignee && (
          <div className="ticket-card__avatar" title={ticket.assignee.userName}>
            {ticket.assignee.userName?.[0]?.toUpperCase()}
          </div>
        )}
        <span className="ticket-card__due">
  {ticket.dueDate
    ? new Date(ticket.dueDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })
    : '-----'}
</span>
      </div>
    </div>
  )
}