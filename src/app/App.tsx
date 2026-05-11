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

async function fetchProfile(userId: string, email: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, is_active')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data || !data.is_active) return null
  return {
    id: data.id as string,
    name: data.name as string,
    role: data.role as 'owner' | 'kasir',
    isActive: data.is_active as boolean,
    email,
  }
}

export default function App() {
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    const { loadSession, _setUser } = useAuthStore.getState()

    // Proactive session restore — no dependency on INITIAL_SESSION event timing
    loadSession()

    // Listener for subsequent auth changes only (login, logout, token refresh, multi-tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip INITIAL_SESSION — loadSession() already handles initial state
        if (event === 'INITIAL_SESSION') return

        try {
          if (!session || event === 'SIGNED_OUT') {
            _setUser(null)
            return
          }
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            const profile = await fetchProfile(session.user.id, session.user.email ?? '')
            if (profile) {
              _setUser(profile)
            } else {
              await supabase.auth.signOut().catch(() => {})
              _setUser(null)
            }
          }
        } catch {
          _setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
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
