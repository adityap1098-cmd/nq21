import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { SplashScreen } from '@/app/components/SplashScreen'

export default function ProtectedRoute() {
  const loading = useAuthStore((s) => s.loading)
  const user = useAuthStore((s) => s.user)
  if (loading) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
