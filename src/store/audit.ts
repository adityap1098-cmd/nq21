import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { AuditLog } from './types'

interface AuditState {
  logs: AuditLog[]
  log: (entry: Omit<AuditLog, 'id' | 'createdAt'>) => void
  clear: () => void
}

export const useAuditStore = create<AuditState>()(
  devtools(
    persist(
      (set) => ({
        logs: [],
        log: (entry) => set((s) => ({
          logs: [...s.logs, {
            ...entry,
            id: `log-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }],
        })),
        clear: () => set({ logs: [] }),
      }),
      { name: 'nq21-audit', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'AuditStore', enabled: import.meta.env.DEV }
  )
)
