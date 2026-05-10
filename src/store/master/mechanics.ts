import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { Mechanic, CommissionRate } from '../types'

// Seed: 1 mekanik awal — owner tambah lainnya via Master Mekanik (plan.md Section 13 decision)
export const SEED_MECHANICS: Mechanic[] = [
  { id: 'mech-1', name: 'Doni', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

// Rate matrix — cat-01=Jasa, cat-02=Dyno, cat-03=Bubut Luar, cat-04=Bubut Dalam
export const SEED_RATES: CommissionRate[] = [
  { id: 'rate-01', mechanicId: 'mech-1', categoryId: 'cat-01', ratePercent: 30 },
  { id: 'rate-02', mechanicId: 'mech-1', categoryId: 'cat-02', ratePercent: 25 },
  { id: 'rate-03', mechanicId: 'mech-1', categoryId: 'cat-03', ratePercent: 20 },
  { id: 'rate-04', mechanicId: 'mech-1', categoryId: 'cat-04', ratePercent: 40 },
]

interface MechanicState {
  mechanics: Mechanic[]
  rates: CommissionRate[]
  addMechanic: (m: Omit<Mechanic, 'id' | 'createdAt'>) => void
  updateMechanic: (id: string, patch: Partial<Mechanic>) => void
  softDelete: (id: string) => void
  upsertRate: (r: Omit<CommissionRate, 'id'>) => void
}

export const useMechanicStore = create<MechanicState>()(
  devtools(
    persist(
      (set) => ({
        mechanics: SEED_MECHANICS,
        rates: SEED_RATES,
        addMechanic: (m) => set((s) => ({
          mechanics: [...s.mechanics, {
            ...m,
            id: `mech-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }],
        })),
        updateMechanic: (id, patch) => set((s) => ({
          mechanics: s.mechanics.map((m) => m.id === id ? { ...m, ...patch } : m),
        })),
        softDelete: (id) => set((s) => ({
          mechanics: s.mechanics.map((m) => m.id === id ? { ...m, isActive: false } : m),
        })),
        upsertRate: (r) => set((s) => {
          const exists = s.rates.find(
            (x) => x.mechanicId === r.mechanicId && x.categoryId === r.categoryId
          )
          return exists
            ? { rates: s.rates.map((x) => x.id === exists.id ? { ...x, ratePercent: r.ratePercent } : x) }
            : { rates: [...s.rates, { ...r, id: `rate-${Date.now()}` }] }
        }),
      }),
      { name: 'nq21-mechanics', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'MechanicStore', enabled: import.meta.env.DEV }
  )
)
