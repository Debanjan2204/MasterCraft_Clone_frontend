const STATUS_MAP = {
    OPEN:           { label: 'Open',           color: '#58a6ff', bg: 'rgba(88,166,255,0.12)'  },
    IN_PROGRESS:    { label: 'In Progress',    color: '#ffa657', bg: 'rgba(255,166,87,0.12)'  },
    PENDING_IT:     { label: 'Pending IT',     color: '#bc8cff', bg: 'rgba(188,140,255,0.12)' },
    PENDING_USER:   { label: 'Pending User',   color: '#d29922', bg: 'rgba(210,153,34,0.12)'  },
    FIXED_IN_BAT:   { label: 'Fixed in BAT',   color: '#3fb950', bg: 'rgba(63,185,80,0.12)'   },
    REOPEN:         { label: 'Reopened',       color: '#f85149', bg: 'rgba(248,81,73,0.12)'   },
    CLOSED:         { label: 'Closed',         color: '#484f58', bg: 'rgba(72,79,88,0.3)'     },
  }
  
  export default function StatusBadge({ status }) {
    const s = STATUS_MAP[status] || { label: status, color: '#8b949e', bg: 'rgba(139,148,158,0.12)' }
    return (
      <span style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}33`,
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: '999px',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
      }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background: s.color, display:'inline-block', flexShrink:0 }} />
        {s.label}
      </span>
    )
  }