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
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        set({ user: null, loading: false })
        return
      }
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle()
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
    } catch {
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
