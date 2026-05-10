import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { AppUser } from '../types'

const SEED: AppUser[] = [
  { id: 'user-1', name: 'Pak Nanang', username: 'owner', role: 'owner', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'user-2', name: 'Adit',       username: 'kasir', role: 'kasir', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

interface UserState {
  users: AppUser[]
  add: (u: Omit<AppUser, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<AppUser>) => void
  softDelete: (id: string) => void
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        users: SEED,
        add: (u) => set((s) => ({
          users: [...s.users, {
            ...u,
            id: `user-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }],
        })),
        update: (id, patch) => set((s) => ({
          users: s.users.map((u) => u.id === id ? { ...u, ...patch } : u),
        })),
        softDelete: (id) => set((s) => ({
          users: s.users.map((u) => u.id === id ? { ...u, isActive: false } : u),
        })),
      }),
      { name: 'nq21-users', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'UserStore', enabled: import.meta.env.DEV }
  )
)
