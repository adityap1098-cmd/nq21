import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { CommandPalette } from '@/app/components/CommandPalette'
import { Toaster } from '@/components/ui/toaster'
import { useUiStore } from '@/store/ui'

export default function Layout() {
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleCommandPalette])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <Topbar />
        <div style={{ padding: 32, maxWidth: 1400 }}>
          <Outlet />
        </div>
      </div>
      <Toaster />
      <CommandPalette />
    </div>
  )
}
