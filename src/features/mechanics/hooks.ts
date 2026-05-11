import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

const MECHANICS_KEY = 'mechanics'
const RATES_KEY = 'commission_rates'

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

export function useCommissionRates() {
  return useQuery({
    queryKey: [RATES_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_rates')
        .select('*')
      if (error) throw error
      return data as CommissionRate[]
    },
  })
}
