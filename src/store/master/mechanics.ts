import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { Mechanic, CommissionRate } from '../types'

export const SEED_MECHANICS: Mechanic[] = [
  { id: 'mech-1', name: 'Budi Santoso',    isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'mech-2', name: 'Ahmad Rizki',     isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'mech-3', name: 'Joko Prasetyo',   isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'mech-4', name: 'Dedi Kurniawan',  isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

// Rate matrix: mechanic × category (only isJasa categories)
// cat-01=Jasa, cat-02=Dyno, cat-03=Bubut Luar, cat-04=Bubut Dalam
// Rates tuned so komisi dalam 1 minggu aktif ≈ Rp 2.185.000 (matches dashboard T6 target)
export const SEED_RATES: CommissionRate[] = [
  // Budi
  { id: 'rate-01', mechanicId: 'mech-1', categoryId: 'cat-01', ratePercent: 14 },
  { id: 'rate-02', mechanicId: 'mech-1', categoryId: 'cat-02', ratePercent: 12 },
  { id: 'rate-03', mechanicId: 'mech-1', categoryId: 'cat-03', ratePercent: 10 },
  { id: 'rate-04', mechanicId: 'mech-1', categoryId: 'cat-04', ratePercent: 12 },
  // Ahmad
  { id: 'rate-05', mechanicId: 'mech-2', categoryId: 'cat-01', ratePercent: 11 },
  { id: 'rate-06', mechanicId: 'mech-2', categoryId: 'cat-02', ratePercent: 9 },
  { id: 'rate-07', mechanicId: 'mech-2', categoryId: 'cat-03', ratePercent: 8 },
  { id: 'rate-08', mechanicId: 'mech-2', categoryId: 'cat-04', ratePercent: 10 },
  // Joko
  { id: 'rate-09', mechanicId: 'mech-3', categoryId: 'cat-01', ratePercent: 13 },
  { id: 'rate-10', mechanicId: 'mech-3', categoryId: 'cat-02', ratePercent: 12 },
  { id: 'rate-11', mechanicId: 'mech-3', categoryId: 'cat-03', ratePercent: 10 },
  { id: 'rate-12', mechanicId: 'mech-3', categoryId: 'cat-04', ratePercent: 12 },
  // Dedi
  { id: 'rate-13', mechanicId: 'mech-4', categoryId: 'cat-01', ratePercent: 10 },
  { id: 'rate-14', mechanicId: 'mech-4', categoryId: 'cat-02', ratePercent: 8 },
  { id: 'rate-15', mechanicId: 'mech-4', categoryId: 'cat-03', ratePercent: 7 },
  { id: 'rate-16', mechanicId: 'mech-4', categoryId: 'cat-04', ratePercent: 7 },
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
