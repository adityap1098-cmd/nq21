interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 14 }}>
        <div style={{ width: 3, background: 'var(--accent)', flexShrink: 0 }} />
        <div>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: 36,
              textTransform: 'uppercase',
              lineHeight: 1.05,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}
