interface QueryErrorPanelProps {
  errors: unknown[]
  onRetry?: () => void
  compact?: boolean
}

function errorText(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  if (typeof err === 'string' && err) return err
  return 'Terjadi kesalahan tidak dikenal.'
}

export function QueryErrorPanel({ errors, onRetry, compact }: QueryErrorPanelProps) {
  const messages = [...new Set(errors.filter(Boolean).map(errorText))]
  return (
    <div
      role="alert"
      style={{
        padding: compact ? '14px 16px' : '32px 24px',
        border: '1px solid rgba(220,38,38,0.3)',
        background: 'rgba(220,38,38,0.06)',
        borderRadius: 8,
        color: 'var(--accent)',
        textAlign: compact ? 'left' : 'center',
      }}
    >
      <div style={{ fontFamily: 'var(--display)', fontSize: compact ? 14 : 18, marginBottom: 6 }}>
        Gagal memuat data — cek koneksi lalu muat ulang
      </div>
      {messages.map((m) => (
        <div key={m} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-word' }}>
          {m}
        </div>
      ))}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ marginTop: 12, padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700 }}
        >
          ↻ Muat Ulang
        </button>
      )}
    </div>
  )
}

export function LoadingPanel({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      {label}
    </div>
  )
}
