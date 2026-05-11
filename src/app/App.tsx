import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { router } from './router'
import { SplashScreen } from './components/SplashScreen'
import { OfflineIndicator } from './components/OfflineIndicator'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { supabase } from '@/lib/supabase'
import { useAuthStore, type AuthProfile } from '@/store/auth'

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, is_active')
    .eq('id', userId)
    .maybeSingle()  // single() throws PGRST116 on 0 rows; maybeSingle() returns null
  if (error || !data) return null
  return {
    id: data.id as string,
    name: data.name as string,
    role: data.role as 'owner' | 'kasir',
    isActive: data.is_active as boolean,
    email: '',
  }
}

export default function App() {
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    const { _setUser, _setLoading } = useAuthStore.getState()

    // Safety timeout: if INITIAL_SESSION never fires or hangs, dismiss splash after 5s
    const safetyTimer = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn('[auth] INITIAL_SESSION timeout — forcing loading=false')
        _setLoading(false)
      }
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session) {
            const profile = await fetchProfile(session.user.id)
            if (!profile || !profile.isActive) {
              await supabase.auth.signOut().catch(() => {})
              _setUser(null)
            } else {
              _setUser({ ...profile, email: session.user.email ?? '' })
            }
          } else {
            _setUser(null)
          }
        } catch {
          _setUser(null)
        } finally {
          if (event === 'INITIAL_SESSION') {
            _setLoading(false)
          }
        }
      }
    )

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <SplashScreen />

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <OfflineIndicator />
      <PWAUpdatePrompt />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
