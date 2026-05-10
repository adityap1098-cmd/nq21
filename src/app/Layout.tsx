import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Toaster } from '@/components/ui/toaster'

export default function Layout() {
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
    </div>
  )
}
