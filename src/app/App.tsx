import { useState, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { SplashScreen } from './components/SplashScreen'
import { OfflineIndicator } from './components/OfflineIndicator'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'

export default function App() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 300)
    return () => clearTimeout(timer)
  }, [])

  if (!hydrated) return <SplashScreen />

  return (
    <>
      <RouterProvider router={router} />
      <OfflineIndicator />
      <PWAUpdatePrompt />
    </>
  )
}
