const PRIORITY_MAP = {
    CRITICAL: { label: 'Critical', color: '#f85149', icon: '⬆⬆' },
    HIGH:     { label: 'High',     color: '#ffa657', icon: '⬆'  },
    MEDIUM:   { label: 'Medium',   color: '#d29922', icon: '➡'  },
    LOW:      { label: 'Low',      color: '#3fb950', icon: '⬇'  },
  }
  
  export default function PriorityBadge({ priority }) {
    const p = PRIORITY_MAP[priority] || { label: priority, color: '#8b949e', icon: '—' }
    return (
      <span style={{
        color: p.color,
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.2px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '10px' }}>{p.icon}</span>
        {p.label}
      </span>
    )
  }