import { Lock } from 'lucide-react'

interface AccessDeniedProps {
  title?: string
  message?: string
  action?: React.ReactNode
}

export function AccessDenied({
  title = 'Akses Ditolak',
  message = 'Halaman ini hanya untuk Owner.',
  action,
}: AccessDeniedProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--surface-alt)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={28} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {message}
        </div>
        {action && <div style={{ marginTop: 20 }}>{action}</div>}
      </div>
    </div>
  )
}
