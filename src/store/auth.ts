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
    console.log('[auth] loadSession START')
    try {
      console.log('[auth] calling getSession...')
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('[auth] getSession done:', { hasSession: !!session, error: error?.message })

      if (error || !session) {
        set({ user: null, loading: false })
        return
      }

      console.log('[auth] fetching profile for', session.user.id)
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle()
      console.log('[auth] profile done:', { hasData: !!data, error: profileError?.message })

      if (profileError || !data || !data.is_active) {
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
      console.log('[auth] loadSession SUCCESS')
    } catch (err) {
      console.error('[auth] loadSession CRASHED:', err)
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
