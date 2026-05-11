import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export interface Supplier {
  id: string
  name: string
  phone: string | null
  notes: string | null
  is_vendor_bubut: boolean
  is_active: boolean
  created_at: string
}

export interface SupplierInput {
  name: string
  phone?: string | null
  notes?: string | null
  is_vendor_bubut: boolean
}

const QUERY_KEY = 'suppliers'

export function useSuppliers(showInactive = false, vendorOnly = false) {
  return useQuery({
    queryKey: [QUERY_KEY, showInactive, vendorOnly],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })
      if (!showInactive) query = query.eq('is_active', true)
      if (vendorOnly) query = query.eq('is_vendor_bubut', true)
      const { data, error } = await query
      if (error) throw error
      return data as Supplier[]
    },
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async (input: SupplierInput) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(input)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'create',
          entity_type: 'supplier',
          entity_id: data.id,
          source: 'master-supplier',
          after_data: data,
        })
      }
      return data as Supplier
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<SupplierInput> & { is_active?: boolean } }) => {
      const { data: before } = await supabase.from('suppliers').select('*').eq('id', id).single()

      const { data, error } = await supabase
        .from('suppliers')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: 'supplier',
          entity_id: id,
          source: 'master-supplier',
          before_data: before,
          after_data: data,
        })
      }
      return data as Supplier
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: before } = await supabase.from('suppliers').select('*').eq('id', id).single()

      const { data, error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'delete',
          entity_type: 'supplier',
          entity_id: id,
          source: 'master-supplier',
          before_data: before,
        })
      }
      return data as Supplier
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
