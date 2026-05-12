import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface AuthProfile {
  id: string
  name: string
  role: 'owner' | 'kasir'
  isActive: boolean
  email: string
}

interface AuthState {
  user: AuthProfile | null
  loading: boolean
  loadSession: () => Promise<void>
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  _setUser: (user: AuthProfile | null) => void
  _setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,

  loadSession: async () => {
    console.log('[auth] loadSession start')
    try {
      // Race getSession against 8s timeout — gives SDK enough time on cold/multi-tab start.
      // 3s was too aggressive: fresh tab on slow connection reliably hit the timeout.
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('getSession_timeout')), 8000)
        ),
      ])

      const { data: { session }, error } = result
      console.log('[auth] getSession result:', { hasSession: !!session, error: error?.message ?? null })
      if (error || !session) {
        if (!error) {
          const hasStoredToken = Object.keys(localStorage).some(
            k => k.startsWith('sb-') && localStorage.getItem(k)
          )
          // Token present = SDK hydration delay, NOT a real logout.
          // Don't signOut — would cascade to other tabs.
          if (hasStoredToken) {
            console.log('[auth] no session but token exists — hydration delay, staying logged out')
            set({ user: null, loading: false })
            return
          }
        }
        console.log('[auth] no session, setting user null')
        set({ user: null, loading: false })
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle()

      console.log('[auth] profile fetch result:', { hasData: !!data, profileError: profileError?.message ?? null, isActive: data?.is_active })
      if (profileError) {
        // Network/transient error — don't signOut (would cascade to other tabs), just clear local state
        set({ user: null, loading: false })
        return
      }
      if (!data || !data.is_active) {
        // Profile genuinely missing or deactivated — force signOut across all tabs
        await supabase.auth.signOut().catch(() => {})
        set({ user: null, loading: false })
        return
      }
      set({
        user: {
          id: data.id as string,
          name: data.name as string,
          role: data.role as 'owner' | 'kasir',
          isActive: data.is_active as boolean,
          email: session.user.email ?? '',
        },
        loading: false,
      })
    } catch (err) {
      // CRITICAL: Do NOT purge localStorage on timeout.
      // localStorage is shared across same-origin tabs — removing sb-* tokens here
      // broadcasts SIGNED_OUT to all tabs (root cause of cascade logout bug, 2026-05-12).
      // Just fall back to logged-out UI; token stays intact for retry on next mount.
      console.log('[auth] loadSession CATCH:', (err as Error)?.message)
      set({ user: null, loading: false })
    }
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    return null
    // success: onAuthStateChange SIGNED_IN in App.tsx handles profile fetch + _setUser
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  _setUser: (user) => set({ user }),
  _setLoading: (loading) => set({ loading }),
}))
