interface EmptyStateProps {
  icon?: React.ReactNode
  message: string
  action?: React.ReactNode
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}
    >
      {icon && (
        <div style={{ marginBottom: 12, opacity: 0.35 }}>{icon}</div>
      )}
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{message}</div>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}
