import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { CommissionPeriod, CommissionPayout, CommissionRate } from '@/store/types'
import type { PayoutComputed, PayoutLine } from '@/store/selectors'

// ── Date helper ───────────────────────────────────────────────────────────────

function addDaysToStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// ── Supabase row types (with embedded joins) ──────────────────────────────────

export type PeriodTxRow = {
  id: string
  no_referensi: string
  tgl: string
  customer_id: string | null
  customers: { id: string; name: string; motor_type: string | null } | null
  transaction_lines: Array<{
    id: string
    category_id: string
    nominal: number
    biaya_material: number
    item_name: string | null
    categories: { id: string; name: string; is_jasa: boolean } | null
    transaction_line_mechanics: Array<{
      mechanic_id: string
      share_percent: number
      rate_override: number | null
      mechanics: { id: string; name: string; is_active: boolean } | null
    }>
  }>
}

// ── Payout computation (Supabase rows + Supabase rates → PayoutComputed[]) ───

export function computePayoutsFromRows(
  txRows: PeriodTxRow[],
  weekStart: string,
  weekEnd: string,
  rates: CommissionRate[],
): PayoutComputed[] {
  const byMechanic = new Map<string, PayoutLine[]>()

  for (const tx of txRows) {
    const tgl = tx.tgl.slice(0, 10)
    const customerName = tx.customers?.name ?? '—'
    const customerMotor = tx.customers?.motor_type ?? undefined

    for (const line of tx.transaction_lines) {
      const cat = line.categories
      if (!cat?.is_jasa) continue

      const basis = Math.max(0, line.nominal - line.biaya_material)

      for (const lm of line.transaction_line_mechanics) {
        const masterRate = rates.find(
          r => r.mechanicId === lm.mechanic_id && r.categoryId === line.category_id
        )?.ratePercent ?? 0
        const effectiveRate = lm.rate_override !== null ? lm.rate_override : masterRate
        const komisi = Math.round(basis * (lm.share_percent / 100) * (effectiveRate / 100))

        const payoutLine: PayoutLine = {
          transactionId: tx.id,
          noReferensi: tx.no_referensi,
          tgl,
          isBackdated: tgl < weekStart || tgl > weekEnd,
          customerName,
          customerMotor,
          categoryId: line.category_id,
          categoryName: cat.name,
          itemName: line.item_name ?? undefined,
          nominal: line.nominal,
          biayaMaterial: line.biaya_material,
          basis,
          sharePercent: lm.share_percent,
          rate: effectiveRate,
          rateOverride: lm.rate_override !== null ? lm.rate_override : undefined,
          komisi,
        }

        const prev = byMechanic.get(lm.mechanic_id) ?? []
        byMechanic.set(lm.mechanic_id, [...prev, payoutLine])
      }
    }
  }

  // Build mechanic lookup from embedded join data
  const mechLookup = new Map<string, { name: string; is_active: boolean }>()
  for (const tx of txRows) {
    for (const line of tx.transaction_lines) {
      for (const lm of line.transaction_line_mechanics) {
        if (lm.mechanics && !mechLookup.has(lm.mechanic_id)) {
          mechLookup.set(lm.mechanic_id, lm.mechanics)
        }
      }
    }
  }

  const result: PayoutComputed[] = []
  for (const [mechId, mechLines] of byMechanic.entries()) {
    const mechInfo = mechLookup.get(mechId)
    const totalBasis = mechLines.reduce((a, l) => a + Math.round(l.basis * l.sharePercent / 100), 0)
    const totalKomisi = mechLines.reduce((a, l) => a + l.komisi, 0)
    result.push({
      mechanicId: mechId,
      mechanicName: mechInfo?.name ?? mechId,
      isActive: mechInfo?.is_active ?? true,
      totalJobs: mechLines.length,
      totalBasis,
      totalKomisi,
      lines: mechLines.sort((a, b) => a.tgl.localeCompare(b.tgl)),
    })
  }

  return result.sort((a, b) => b.totalKomisi - a.totalKomisi)
}

// ── useMechanics ──────────────────────────────────────────────────────────────

export type MechanicRow = { id: string; name: string; is_active: boolean }

export function useMechanics() {
  return useQuery({
    queryKey: ['mechanics'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MechanicRow[]> => {
      const { data, error } = await supabase
        .from('mechanics')
        .select('id, name, is_active')
        .order('name')
      if (error) throw error
      return (data ?? []) as MechanicRow[]
    },
  })
}

// ── useCommissionPeriods ──────────────────────────────────────────────────────

export function useCommissionPeriods() {
  return useQuery({
    queryKey: ['commission-periods'],
    staleTime: 30_000,
    queryFn: async (): Promise<CommissionPeriod[]> => {
      const { data, error } = await supabase
        .from('commission_periods')
        .select('id, week_start, week_end, status, closed_by, closed_at')
        .order('week_start', { ascending: false })
      if (error) throw error
      return (data ?? []).map(r => ({
        id: r.id as string,
        weekStart: (r.week_start as string).slice(0, 10),
        weekEnd: (r.week_end as string).slice(0, 10),
        status: r.status as 'open' | 'closed',
        closedBy: (r.closed_by as string | null) ?? undefined,
        closedAt: (r.closed_at as string | null) ?? undefined,
      }))
    },
  })
}

// ── useCommissionPayouts ──────────────────────────────────────────────────────

export function useCommissionPayouts(periodId?: string) {
  return useQuery({
    queryKey: ['commission-payouts', periodId ?? 'all'],
    staleTime: 30_000,
    queryFn: async (): Promise<CommissionPayout[]> => {
      let q = supabase
        .from('commission_payouts')
        .select('id, period_id, mechanic_id, total_jobs, total_basis, total_komisi, status, created_at, paid_at, paid_by, paid_notes')
        .order('created_at', { ascending: false })
      if (periodId) q = q.eq('period_id', periodId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(r => ({
        id: r.id as string,
        periodId: r.period_id as string,
        mechanicId: r.mechanic_id as string,
        totalJobs: r.total_jobs as number,
        totalBasis: r.total_basis as number,
        totalKomisi: r.total_komisi as number,
        status: r.status as 'pending' | 'paid',
        createdAt: r.created_at as string,
        paidAt: (r.paid_at as string | null) ?? undefined,
        paidBy: (r.paid_by as string | null) ?? undefined,
        paidNotes: (r.paid_notes as string | null) ?? undefined,
      }))
    },
  })
}

// ── useCommissionRates ────────────────────────────────────────────────────────

export function useCommissionRates() {
  return useQuery({
    queryKey: ['commission-rates'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CommissionRate[]> => {
      const { data, error } = await supabase
        .from('commission_rates')
        .select('id, mechanic_id, category_id, rate_percent')
      if (error) throw error
      return (data ?? []).map(r => ({
        id: r.id as string,
        mechanicId: r.mechanic_id as string,
        categoryId: r.category_id as string,
        ratePercent: r.rate_percent as number,
      }))
    },
  })
}

// ── usePeriodTransactions ─────────────────────────────────────────────────────

export function usePeriodTransactions(
  weekStart?: string,
  weekEnd?: string,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['period-transactions', weekStart, weekEnd],
    enabled: opts?.enabled !== false && !!weekStart && !!weekEnd,
    staleTime: 30_000,
    queryFn: async (): Promise<PeriodTxRow[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, no_referensi, tgl, customer_id,
          customers(id, name, motor_type),
          transaction_lines(
            id, category_id, nominal, biaya_material, item_name,
            categories(id, name, is_jasa),
            transaction_line_mechanics(
              mechanic_id, share_percent, rate_override,
              mechanics(id, name, is_active)
            )
          )
        `)
        .eq('tipe', 'income')
        .is('deleted_at', null)
        .gte('tgl', weekStart!)
        .lte('tgl', weekEnd!)
      if (error) throw error
      return (data ?? []) as unknown as PeriodTxRow[]
    },
  })
}

// ── useClosePeriod ────────────────────────────────────────────────────────────

export interface ClosePeriodResult {
  payouts: number
  total_komisi: number
}

/**
 * Closes a period atomically in the database (supabase/migrations/20261119_period_lock_and_close_rpc.sql):
 * backfills period_id, computes payouts from fresh DB data, inserts them, marks the period
 * closed and opens the next week — all or nothing. Owner-only (enforced in the function).
 */
export function useClosePeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ periodId }: { periodId: string }): Promise<ClosePeriodResult> => {
      const { data, error } = await supabase.rpc('close_period', { p_period_id: periodId })
      if (error) throw error
      return data as ClosePeriodResult
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] })
      queryClient.invalidateQueries({ queryKey: ['commission-payouts'] })
      queryClient.invalidateQueries({ queryKey: ['period-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

// ── useOpenNewPeriod ─────────────────────────────────────────────────────────

function getMondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay() // 0=Sun
  const offset = day === 0 ? -6 : 1 - day
  date.setDate(d + offset)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function getCurrentWeek(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const weekStart = getMondayOf(today)
  const weekEnd = addDaysToStr(weekStart, 6)
  return { weekStart, weekEnd }
}

export function useOpenNewPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: latest } = await supabase
        .from('commission_periods')
        .select('week_end')
        .order('week_end', { ascending: false })
        .limit(1)
        .maybeSingle()
      const nextStart = latest?.week_end ? addDaysToStr(latest.week_end, 1) : getCurrentWeek().weekStart
      const nextEnd = latest?.week_end ? addDaysToStr(latest.week_end, 7) : getCurrentWeek().weekEnd
      const { error } = await supabase
        .from('commission_periods')
        .insert({ week_start: nextStart, week_end: nextEnd, status: 'open' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] })
    },
  })
}

// ── useMarkPaid ───────────────────────────────────────────────────────────────

export function useMarkPaid() {
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)
  return useMutation({
    mutationFn: async ({ payoutId, paidNotes }: { payoutId: string; paidNotes?: string }): Promise<void> => {
      // Only a pending payout may become paid: a second click / second tab must not
      // overwrite paid_at, paid_by and paid_notes.
      const { data, error } = await supabase
        .from('commission_payouts')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: user?.id ?? null,
          paid_notes: paidNotes ?? null,
        })
        .eq('id', payoutId)
        .eq('status', 'pending')
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Payout sudah ditandai dibayar sebelumnya, atau kamu tidak punya akses.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payouts'] })
    },
  })
}
