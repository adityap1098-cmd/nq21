import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
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
    .single()
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const profile = await fetchProfile(session.user.id)
          if (!profile) {
            await supabase.auth.signOut()
            _setUser(null)
          } else if (!profile.isActive) {
            await supabase.auth.signOut()
            _setUser(null)
          } else {
            _setUser({ ...profile, email: session.user.email ?? '' })
          }
        } else {
          _setUser(null)
        }

        if (event === 'INITIAL_SESSION') {
          _setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <SplashScreen />

  return (
    <>
      <RouterProvider router={router} />
      <OfflineIndicator />
      <PWAUpdatePrompt />
    </>
  )
}
