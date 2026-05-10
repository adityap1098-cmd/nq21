import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { CommissionPeriod, CommissionPayout } from './types'

const SEED_PERIODS: CommissionPeriod[] = [
  { id: 'period-1', weekStart: '2026-05-04', weekEnd: '2026-05-10', status: 'open' },
  { id: 'period-2', weekStart: '2026-04-27', weekEnd: '2026-05-03', status: 'closed', closedBy: 'user-1', closedAt: '2026-05-04T08:00:00Z' },
  { id: 'period-3', weekStart: '2026-04-20', weekEnd: '2026-04-26', status: 'closed', closedBy: 'user-1', closedAt: '2026-04-27T08:00:00Z' },
]

const SEED_PAYOUTS: CommissionPayout[] = [
  // Period 2 payouts (closed, paid) — Doni only
  { id: 'pay-1', periodId: 'period-2', mechanicId: 'mech-1', totalBasis: 8_500_000, totalKomisi: 1_980_000, status: 'paid', paidAt: '2026-05-04T10:00:00Z' },
  // Period 3 payouts (closed, paid) — Doni only
  { id: 'pay-2', periodId: 'period-3', mechanicId: 'mech-1', totalBasis: 9_100_000, totalKomisi: 2_340_000, status: 'paid', paidAt: '2026-04-27T09:00:00Z' },
]

interface CommissionState {
  periods: CommissionPeriod[]
  payouts: CommissionPayout[]
  openPeriod: () => string
  closePeriod: (id: string, closedBy: string) => void
  upsertPayout: (p: Omit<CommissionPayout, 'id'>) => void
  markPaid: (payoutId: string, paidAt: string, paidNotes?: string) => void
}

export const useCommissionStore = create<CommissionState>()(
  devtools(
    persist(
      (set) => ({
        periods: SEED_PERIODS,
        payouts: SEED_PAYOUTS,

        openPeriod: () => {
          const id = `period-${Date.now()}`
          const now = new Date()
          const day = now.getDay()
          const diff = day === 0 ? -6 : 1 - day
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() + diff)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          set((s) => ({
            periods: [...s.periods, {
              id,
              weekStart: weekStart.toISOString().slice(0, 10),
              weekEnd: weekEnd.toISOString().slice(0, 10),
              status: 'open',
            }],
          }))
          return id
        },

        closePeriod: (id, closedBy) => set((s) => ({
          periods: s.periods.map((p) =>
            p.id === id ? { ...p, status: 'closed', closedBy, closedAt: new Date().toISOString() } : p
          ),
        })),

        upsertPayout: (p) => set((s) => {
          const exists = s.payouts.find(
            (x) => x.periodId === p.periodId && x.mechanicId === p.mechanicId
          )
          return exists
            ? { payouts: s.payouts.map((x) => x.id === exists.id ? { ...x, ...p } : x) }
            : { payouts: [...s.payouts, { ...p, id: `pay-${Date.now()}` }] }
        }),

        markPaid: (payoutId, paidAt, paidNotes) => set((s) => ({
          payouts: s.payouts.map((p) =>
            p.id === payoutId ? { ...p, status: 'paid', paidAt, paidNotes } : p
          ),
        })),
      }),
      { name: 'nq21-commission', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'CommissionStore', enabled: import.meta.env.DEV }
  )
)
