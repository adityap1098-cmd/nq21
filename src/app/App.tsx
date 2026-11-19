import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { router } from './router'
import { SplashScreen } from './components/SplashScreen'
import { OfflineIndicator } from './components/OfflineIndicator'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore, type AuthProfile } from '@/store/auth'
import { toast } from '@/hooks/use-toast'

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
    const channel = new BroadcastChannel('nq21-tab-detect')
    channel.postMessage({ type: 'tab-open', id: Date.now() })
    channel.onmessage = (e) => {
      if (e.data.type === 'tab-open') {
        toast('App terbuka di tab lain', { description: 'Tutup tab ini untuk hindari conflict.' })
      }
    }
    return () => channel.close()
  }, [])

  useEffect(() => {
    const { loadSession, _setUser } = useAuthStore.getState()

    // Proactive session restore — no dependency on INITIAL_SESSION event timing
    loadSession()

    // Listener for subsequent auth changes only (login, logout, token refresh, multi-tab).
    // The callback runs while supabase-js holds its auth lock; awaiting another Supabase call
    // inside it (profile fetch, signOut) deadlocks every later request — the app hangs on
    // "Memuat..." after TOKEN_REFRESHED. Defer that work until the callback has returned.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip INITIAL_SESSION — loadSession() already handles initial state
        if (event === 'INITIAL_SESSION') return
        setTimeout(() => { void handleAuthChange(event, session) }, 0)
      }
    )

    async function handleAuthChange(event: AuthChangeEvent, session: Session | null): Promise<void> {
        try {
          if (!session || event === 'SIGNED_OUT') {
            // Defensive: if SIGNED_OUT arrives but a token still exists in localStorage,
            // this is a spurious broadcast from a tab that timed out on getSession.
            // Do NOT clear our valid session — ignore the event.
            if (event === 'SIGNED_OUT') {
              const hasToken = Object.keys(localStorage).some(
                k => k.startsWith('sb-') && localStorage.getItem(k)
              )
              if (hasToken) return
            }
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
