import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Shows a banner when a new version is deployed. The page reloads only when the user
 * clicks "Muat ulang", so unsaved form input is never thrown away by an auto-reload.
 */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) setInterval(() => r.update(), UPDATE_CHECK_INTERVAL_MS)
    },
    onRegisterError(error) { console.error('SW registration error:', error) },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
        background: 'var(--text)', color: '#fff',
        padding: '10px 14px', borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span>Versi baru tersedia. Simpan pekerjaanmu dulu, lalu muat ulang.</span>
      <button
        type="button"
        onClick={() => { void updateServiceWorker(true) }}
        style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6,
          padding: '6px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Muat ulang
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        aria-label="Nanti"
        style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', opacity: 0.7 }}
      >
        Nanti
      </button>
    </div>
  )
}
