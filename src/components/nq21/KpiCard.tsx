interface KpiCardChange {
  value: string
  up: boolean
  context?: string
}

interface KpiCardProps {
  label: string
  value: React.ReactNode
  change?: KpiCardChange
  accent?: boolean
  icon?: React.ReactNode
}

export function KpiCard({ label, value, change, accent, icon }: KpiCardProps) {
  return (
    <div
      className="kpi-card"
      style={
        accent
          ? { borderTop: '3px solid var(--accent)', paddingTop: 19 }
          : undefined
      }
    >
      {icon && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: accent ? 'var(--accent-tint)' : 'var(--surface-alt)',
            color: accent ? 'var(--accent)' : 'var(--text-secondary)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 14,
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--display)',
          fontSize: 36,
          lineHeight: 1,
          color: 'var(--text)',
          marginTop: 18,
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
      {change && (
        <div
          style={{
            display: 'flex',
            gap: 5,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 600,
            color: change.up ? 'var(--success)' : 'var(--accent)',
            marginTop: 12,
          }}
        >
          <span>{change.up ? '▲' : '▼'}</span>
          <span>{change.value}</span>
          {change.context && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              · {change.context}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
