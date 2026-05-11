import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { CommissionPeriod, CommissionPayout } from './types'

// ── Date helper (local, no imports from selectors) ────────────────────────────

function addDaysToStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_PERIODS: CommissionPeriod[] = [
  { id: 'period-1', weekStart: '2026-05-04', weekEnd: '2026-05-10', status: 'open' },
  { id: 'period-2', weekStart: '2026-04-27', weekEnd: '2026-05-03', status: 'closed', closedBy: 'user-1', closedAt: '2026-05-04T08:00:00Z' },
  { id: 'period-3', weekStart: '2026-04-20', weekEnd: '2026-04-26', status: 'closed', closedBy: 'user-1', closedAt: '2026-04-27T08:00:00Z' },
]

// Seed payouts: all mechanics for closed periods, all paid
const SEED_PAYOUTS: CommissionPayout[] = [
  // ── Period 2: 27 Apr–03 Mei (closed, all paid) ──
  { id: 'pay-2a', periodId: 'period-2', mechanicId: 'mech-1', totalJobs: 8, totalBasis: 1_840_000, totalKomisi: 552_000, status: 'paid', createdAt: '2026-05-04T08:00:00Z', paidAt: '2026-05-04T10:00:00Z', paidBy: 'user-1', paidNotes: 'Cash' },
  { id: 'pay-2b', periodId: 'period-2', mechanicId: 'mech-2', totalJobs: 5, totalBasis: 1_200_000, totalKomisi: 360_000, status: 'paid', createdAt: '2026-05-04T08:00:00Z', paidAt: '2026-05-04T10:00:00Z', paidBy: 'user-1', paidNotes: 'Cash' },
  // ── Period 3: 20–26 Apr (closed, all paid) ──
  { id: 'pay-3a', periodId: 'period-3', mechanicId: 'mech-1', totalJobs: 10, totalBasis: 2_100_000, totalKomisi: 630_000, status: 'paid', createdAt: '2026-04-27T08:00:00Z', paidAt: '2026-04-27T09:00:00Z', paidBy: 'user-1', paidNotes: 'Transfer BCA' },
  { id: 'pay-3b', periodId: 'period-3', mechanicId: 'mech-2', totalJobs: 6, totalBasis: 1_440_000, totalKomisi: 432_000, status: 'paid', createdAt: '2026-04-27T08:00:00Z', paidAt: '2026-04-27T09:00:00Z', paidBy: 'user-1', paidNotes: 'Transfer BCA' },
]

// ── Store interface ───────────────────────────────────────────────────────────

interface ClosePayoutInput {
  mechanicId: string
  totalJobs: number
  totalBasis: number
  totalKomisi: number
}

interface CommissionState {
  periods: CommissionPeriod[]
  payouts: CommissionPayout[]

  openPeriod: () => string

  closeAndGeneratePayouts: (
    periodId: string,
    closedBy: string,
    payouts: ClosePayoutInput[],
  ) => { nextPeriodId?: string }

  upsertPayout: (p: Omit<CommissionPayout, 'id'>) => void

  markPaid: (
    payoutId: string,
    paidAt: string,
    paidBy: string,
    paidNotes?: string,
  ) => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

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
          const fmt = (d: Date) => d.toISOString().slice(0, 10)
          set((s) => ({
            periods: [...s.periods, {
              id,
              weekStart: fmt(weekStart),
              weekEnd: fmt(weekEnd),
              status: 'open',
            }],
          }))
          return id
        },

        closeAndGeneratePayouts: (periodId, closedBy, payouts) => {
          const now = new Date().toISOString()
          let nextPeriodId: string | undefined

          set((s) => {
            const period = s.periods.find((p) => p.id === periodId)
            if (!period || period.status !== 'open') return s

            // Close the period
            const closedPeriods = s.periods.map((p) =>
              p.id === periodId
                ? { ...p, status: 'closed' as const, closedAt: now, closedBy }
                : p
            )

            // Batch insert payouts (idempotent: skip existing mechanicId+periodId combos)
            const existingKeys = new Set(s.payouts.map((x) => `${x.periodId}:${x.mechanicId}`))
            const newPayouts: CommissionPayout[] = payouts
              .filter((p) => !existingKeys.has(`${periodId}:${p.mechanicId}`))
              .map((p, i) => ({
                id: `pay-${Date.now()}-${i}`,
                periodId,
                mechanicId: p.mechanicId,
                totalJobs: p.totalJobs,
                totalBasis: p.totalBasis,
                totalKomisi: p.totalKomisi,
                status: 'pending' as const,
                createdAt: now,
              }))

            // Auto-create next week's period (if not already present)
            const nextStart = addDaysToStr(period.weekEnd, 1)
            const nextEnd = addDaysToStr(period.weekEnd, 7)
            const alreadyExists = s.periods.some((p) => p.weekStart === nextStart)
            const newPeriodId = `period-${Date.now() + 1}`
            const nextPeriod: CommissionPeriod | null = alreadyExists ? null : {
              id: newPeriodId,
              weekStart: nextStart,
              weekEnd: nextEnd,
              status: 'open',
            }
            if (nextPeriod) nextPeriodId = nextPeriod.id

            return {
              periods: nextPeriod ? [...closedPeriods, nextPeriod] : closedPeriods,
              payouts: [...s.payouts, ...newPayouts],
            }
          })

          return { nextPeriodId }
        },

        upsertPayout: (p) => set((s) => {
          const exists = s.payouts.find(
            (x) => x.periodId === p.periodId && x.mechanicId === p.mechanicId
          )
          return exists
            ? { payouts: s.payouts.map((x) => x.id === exists.id ? { ...x, ...p } : x) }
            : { payouts: [...s.payouts, { ...p, id: `pay-${Date.now()}` }] }
        }),

        markPaid: (payoutId, paidAt, paidBy, paidNotes) => set((s) => ({
          payouts: s.payouts.map((p) =>
            p.id === payoutId
              ? { ...p, status: 'paid' as const, paidAt, paidBy, paidNotes }
              : p
          ),
        })),

      }),
      {
        name: 'nq21-commission',
        storage: createJSONStorage(() => localStorage),
        version: 2,
        migrate: (persisted, fromVersion) => {
          if (fromVersion < 2) {
            // Old payouts may lack totalJobs, createdAt, paidBy — patch with safe defaults
            const state = persisted as { periods?: CommissionPeriod[]; payouts?: Partial<CommissionPayout>[] }
            return {
              periods: state.periods ?? SEED_PERIODS,
              payouts: (state.payouts ?? []).map((p) => ({
                ...p,
                totalJobs: p.totalJobs ?? 0,
                createdAt: p.createdAt ?? new Date().toISOString(),
              })),
            }
          }
          return persisted
        },
      }
    ),
    { name: 'CommissionStore', enabled: import.meta.env.DEV }
  )
)
