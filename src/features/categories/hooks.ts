import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  is_jasa: boolean
  is_active: boolean
  created_at: string
}

export interface CategoryInput {
  name: string
  type: 'income' | 'expense'
  is_jasa: boolean
  is_active?: boolean
}

/**
 * Categories that application code looks up BY NAME (Bubut Luar flow, Dyno report,
 * no-supplier expense rules). Renaming or deactivating them silently breaks those features.
 */
export const SYSTEM_CATEGORY_NAMES: ReadonlySet<string> = new Set([
  'Bubut Luar', 'Bayar Vendor Bubut', 'Dyno', 'Gaji', 'Listrik & Air', 'Sewa', 'Lain-lain',
])

const QUERY_KEY = 'categories'
const TXN_COUNTS_KEY = 'category-line-counts'
const AUDIT_SOURCE = 'master-kategori'

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

/** Number of transaction lines per category (head counts, not limited by the 1000-row cap). */
export function useCategoryLineCounts(categoryIds: string[]) {
  return useQuery({
    queryKey: [TXN_COUNTS_KEY, categoryIds],
    enabled: categoryIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        categoryIds.map(async (id) => {
          const { count, error } = await supabase
            .from('transaction_lines')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', id)
          if (error) throw error
          return [id, count ?? 0] as const
        })
      )
      return Object.fromEntries(entries) as Record<string, number>
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(input)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'create',
          entity_type: 'category',
          entity_id: data.id,
          source: AUDIT_SOURCE,
          after_data: data,
        })
      }
      return data as Category
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CategoryInput> }) => {
      const { data: before } = await supabase.from('categories').select('*').eq('id', id).single()

      const { data, error } = await supabase
        .from('categories')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: input.is_active === false ? 'delete' : 'update',
          entity_type: 'category',
          entity_id: id,
          source: AUDIT_SOURCE,
          before_data: before,
          after_data: data,
        })
      }
      return data as Category
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
