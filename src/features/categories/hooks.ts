import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  is_jasa: boolean
  is_active: boolean
  created_at: string
}

const QUERY_KEY = 'categories'

export function useCategories(showInactive = false) {
  return useQuery({
    queryKey: [QUERY_KEY, showInactive],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('name')
      if (!showInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Category[]
    },
  })
}
