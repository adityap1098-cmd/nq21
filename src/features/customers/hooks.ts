import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export interface Customer {
  id: string
  name: string
  motor_type: string | null
  phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface CustomerInput {
  name: string
  motor_type?: string | null
  phone?: string | null
  notes?: string | null
}

const QUERY_KEY = 'customers'

export function useCustomers(showInactive = false) {
  return useQuery({
    queryKey: [QUERY_KEY, showInactive],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (!showInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Customer[]
    },
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(input)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'create',
          entity_type: 'customer',
          entity_id: data.id,
          source: 'master-customer',
          after_data: data,
        })
      }
      return data as Customer
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CustomerInput> & { is_active?: boolean } }) => {
      const { data: before } = await supabase.from('customers').select('*').eq('id', id).single()

      const { data, error } = await supabase
        .from('customers')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'update',
          entity_type: 'customer',
          entity_id: id,
          source: 'master-customer',
          before_data: before,
          after_data: data,
        })
      }
      return data as Customer
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: before } = await supabase.from('customers').select('*').eq('id', id).single()

      const { data, error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'delete',
          entity_type: 'customer',
          entity_id: id,
          source: 'master-customer',
          before_data: before,
        })
      }
      return data as Customer
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
