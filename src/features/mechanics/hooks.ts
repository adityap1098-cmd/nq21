import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export interface Mechanic {
  id: string
  name: string
  is_active: boolean
  created_at: string
  notes: string | null
}

export interface CommissionRate {
  id: string
  mechanic_id: string
  category_id: string
  rate_percent: number
}

export interface MechanicInput {
  name: string
  notes: string | null
  is_active: boolean
}

export interface RateInput {
  mechanic_id: string
  category_id: string
  rate_percent: number
}

const MECHANICS_KEY = 'mechanics'
const RATES_KEY = 'commission_rates'
const JOB_COUNTS_KEY = 'mechanic-job-counts'
const AUDIT_SOURCE = 'master-mekanik'

export function useMechanics(showInactive = false) {
  return useQuery({
    queryKey: [MECHANICS_KEY, showInactive],
    queryFn: async () => {
      let query = supabase
        .from('mechanics')
        .select('*')
        .order('name')
      if (!showInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Mechanic[]
    },
  })
}

/** Owner-only data (RLS). Pass enabled: false for kasir so the query never runs. */
export function useCommissionRates(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [RATES_KEY],
    enabled: opts?.enabled !== false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_rates')
        .select('*')
      if (error) throw error
      return data as CommissionRate[]
    },
  })
}

/** Number of jasa line assignments per mechanic (head counts, not limited by the 1000-row cap). */
export function useMechanicJobCounts(mechanicIds: string[]) {
  return useQuery({
    queryKey: [JOB_COUNTS_KEY, mechanicIds],
    enabled: mechanicIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        mechanicIds.map(async (id) => {
          const { count, error } = await supabase
            .from('transaction_line_mechanics')
            .select('id', { count: 'exact', head: true })
            .eq('mechanic_id', id)
          if (error) throw error
          return [id, count ?? 0] as const
        })
      )
      return Object.fromEntries(entries) as Record<string, number>
    },
  })
}

function invalidateMechanicData(qc: ReturnType<typeof useQueryClient>): void {
  qc.invalidateQueries({ queryKey: [MECHANICS_KEY] })
  qc.invalidateQueries({ queryKey: [RATES_KEY] })
  // komisi/hooks.ts caches rates under its own key
  qc.invalidateQueries({ queryKey: ['commission-rates'] })
}

export function useCreateMechanic() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async ({ input, defaultRates }: { input: MechanicInput; defaultRates: Omit<RateInput, 'mechanic_id'>[] }) => {
      const { data, error } = await supabase
        .from('mechanics')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      const mechanic = data as Mechanic

      if (defaultRates.length > 0) {
        const { error: ratesError } = await supabase
          .from('commission_rates')
          .insert(defaultRates.map(r => ({ ...r, mechanic_id: mechanic.id })))
        if (ratesError) throw new Error(`Mekanik tersimpan, tapi default rate gagal: ${ratesError.message}`)
      }

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'create',
          entity_type: 'mechanic',
          entity_id: mechanic.id,
          source: AUDIT_SOURCE,
          after_data: { ...mechanic, default_rates: defaultRates },
        })
      }
      return mechanic
    },
    onSettled: () => invalidateMechanicData(qc),
  })
}

export function useUpdateMechanic() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<MechanicInput> }) => {
      const { data: before } = await supabase.from('mechanics').select('*').eq('id', id).single()

      const { data, error } = await supabase
        .from('mechanics')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: input.is_active === false ? 'delete' : 'update',
          entity_type: 'mechanic',
          entity_id: id,
          source: AUDIT_SOURCE,
          before_data: before,
          after_data: data,
        })
      }
      return data as Mechanic
    },
    onSuccess: () => invalidateMechanicData(qc),
  })
}

export function useUpsertCommissionRate() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async (input: RateInput) => {
      const { data: before } = await supabase
        .from('commission_rates')
        .select('*')
        .eq('mechanic_id', input.mechanic_id)
        .eq('category_id', input.category_id)
        .maybeSingle()

      const { data, error } = await supabase
        .from('commission_rates')
        .upsert(input, { onConflict: 'mechanic_id,category_id' })
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: before ? 'update' : 'create',
          entity_type: 'commission_rate',
          entity_id: data.id,
          source: AUDIT_SOURCE,
          before_data: before,
          after_data: data,
        })
      }
      return data as CommissionRate
    },
    onSuccess: () => invalidateMechanicData(qc),
  })
}
