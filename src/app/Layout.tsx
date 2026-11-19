import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { CommandPalette } from '@/app/components/CommandPalette'
import { Toaster } from '@/components/ui/toaster'
import { useUiStore } from '@/store/ui'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

export default function Layout() {
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const isMobile = useIsMobile()
  const { pathname } = useLocation()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleCommandPalette, setSidebarOpen])

  // Close the mobile drawer after navigating (sidebar link, CTA, palette result)
  useEffect(() => { setSidebarOpen(false) }, [pathname, setSidebarOpen])
  // Leaving phone width with the drawer open must not leave a stuck overlay
  useEffect(() => { if (!isMobile) setSidebarOpen(false) }, [isMobile, setSidebarOpen])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {isMobile ? (
        <>
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 59 }}
            />
          )}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            aria-hidden={!sidebarOpen}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 60,
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.2s ease',
              boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.18)' : 'none',
              visibility: sidebarOpen ? 'visible' : 'hidden',
            }}
          >
            <Sidebar />
          </div>
        </>
      ) : (
        <Sidebar />
      )}
      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <Topbar />
        <div style={{ padding: isMobile ? '16px 12px 32px' : 32, maxWidth: 1400 }}>
          <Outlet />
        </div>
      </div>
      <Toaster />
      <CommandPalette />
    </div>
  )
}
