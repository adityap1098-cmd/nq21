import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { SplashScreen } from '@/app/components/SplashScreen'
import { AccessDenied } from '@/components/nq21/AccessDenied'

export default function ProtectedRoute() {
  const loading = useAuthStore((s) => s.loading)
  const user = useAuthStore((s) => s.user)
  if (loading) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/**
 * Owner-only pages (Komisi, Master Kategori / Mekanik & Rate / User).
 * UI gate only — the database enforces the same rules through RLS.
 */
export function RequireOwner() {
  const role = useAuthStore((s) => s.user?.role)
  if (role !== 'owner') {
    return (
      <AccessDenied
        title="Akses Terbatas"
        message="Halaman ini hanya untuk Owner."
      />
    )
  }
  return <Outlet />
}
