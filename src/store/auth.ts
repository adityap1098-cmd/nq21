import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  name: string
  role: 'owner' | 'kasir'
}

interface AuthState {
  user: User | null
  login: (username: string) => void
  logout: () => void
}

const MOCK_USERS: Record<string, User> = {
  owner: { name: 'Pak Nanang', role: 'owner' },
  kasir: { name: 'Adit', role: 'kasir' },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (username) => {
        const user = MOCK_USERS[username.toLowerCase()]
        if (user) set({ user })
      },
      logout: () => set({ user: null }),
    }),
    {
      name: 'nq21-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
