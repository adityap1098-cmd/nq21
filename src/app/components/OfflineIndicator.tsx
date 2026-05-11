import { useState, useEffect } from 'react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div style={{
      position: 'fixed', top: 12, right: 12, zIndex: 9998,
      background: '#CA8A04', color: '#1C1917',
      padding: '6px 12px', borderRadius: 6,
      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.06em',
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: '#1C1917',
        animation: 'pulse 1.5s ease-in-out infinite',
        flexShrink: 0,
      }} />
      Offline · Data tersimpan lokal
    </div>
  )
}
