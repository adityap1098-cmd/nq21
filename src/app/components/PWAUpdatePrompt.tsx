import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) { if (import.meta.env.DEV) console.log('SW registered:', r) },
    onRegisterError(error) { console.error('SW registration error:', error) },
  })

  if (!needRefresh) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9998,
      background: 'var(--surface)', border: '1px solid var(--border)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      borderRadius: 10, padding: '16px 20px',
      maxWidth: 300, fontFamily: 'var(--sans)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
        Update Tersedia
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Versi baru NQ21 siap dipasang.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setNeedRefresh(false)}
          style={{
            padding: '6px 12px', borderRadius: 6,
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          Nanti
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          style={{
            padding: '6px 14px', borderRadius: 6,
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
            background: 'var(--text)', border: '1px solid var(--text)',
            color: '#fff', cursor: 'pointer',
          }}
        >
          Update
        </button>
      </div>
    </div>
  )
}
