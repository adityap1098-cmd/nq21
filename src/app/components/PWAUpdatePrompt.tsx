import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) setInterval(() => r.update(), 60 * 60 * 1000)
    },
    onRegisterError(error) { console.error('SW registration error:', error) },
  })

  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true)
      setTimeout(() => window.location.reload(), 100)
    }
  }, [needRefresh, updateServiceWorker])

  return null
}
