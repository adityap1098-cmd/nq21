import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TransactionRow {
  id: string
  no_referensi: string
  tgl_transaksi: string
  tipe: 'income' | 'expense'
  customer_id: string | null
  supplier_id: string | null
  payment_method: 'cash' | 'transfer' | 'qris'
  total_nominal: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TransactionLineRow {
  id: string
  transaction_id: string
  category_id: string
  nominal: number
  biaya_material: number
  item_name: string | null
  notes: string | null
}

export interface TransactionLineMechanicRow {
  id: string
  transaction_line_id: string
  mechanic_id: string
  share_percent: number
  rate_override: number | null
}

export interface BubutLuarLinkRow {
  id: string
  revenue_line_id: string
  expense_transaction_id: string
  vendor_cost: number
}

export interface TransactionLineDetail extends TransactionLineRow {
  mechanics: TransactionLineMechanicRow[]
}

export interface TransactionDetail extends TransactionRow {
  lines: TransactionLineDetail[]
  bubut_luar_links: BubutLuarLinkRow[]
  customer: { id: string; name: string; motor_type: string | null } | null
  supplier: { id: string; name: string; phone: string | null } | null
}

export interface TransactionFilters {
  tipe?: 'income' | 'expense'
  dateFrom?: string
  dateTo?: string
  includeDeleted?: boolean
}

const STALE_5MIN = 5 * 60 * 1000

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    staleTime: STALE_5MIN,
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('tgl_transaksi', { ascending: false })
        .order('created_at', { ascending: false })

      if (!filters.includeDeleted) query = query.is('deleted_at', null)
      if (filters.tipe) query = query.eq('tipe', filters.tipe)
      if (filters.dateFrom) query = query.gte('tgl_transaksi', filters.dateFrom)
      if (filters.dateTo) query = query.lte('tgl_transaksi', filters.dateTo)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as TransactionRow[]
    },
  })
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transaction', id],
    enabled: !!id,
    staleTime: STALE_5MIN,
    queryFn: async () => {
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (txErr) throw txErr
      if (!tx) return null

      const { data: linesRaw, error: linesErr } = await supabase
        .from('transaction_lines')
        .select('*, transaction_line_mechanics(*)')
        .eq('transaction_id', id!)
        .order('created_at')
      if (linesErr) throw linesErr

      const lineIds = (linesRaw ?? []).map((l) => l.id as string)

      const [bubutRes, customerRes, supplierRes] = await Promise.all([
        lineIds.length > 0
          ? supabase.from('bubut_luar_links').select('*').in('revenue_line_id', lineIds)
          : Promise.resolve({ data: [] as BubutLuarLinkRow[], error: null }),
        (tx as TransactionRow).customer_id
          ? supabase.from('customers').select('id, name, motor_type').eq('id', (tx as TransactionRow).customer_id!).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        (tx as TransactionRow).supplier_id
          ? supabase.from('suppliers').select('id, name, phone').eq('id', (tx as TransactionRow).supplier_id!).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (bubutRes.error) throw bubutRes.error

      const lines: TransactionLineDetail[] = (linesRaw ?? []).map((l) => ({
        id: l.id as string,
        transaction_id: l.transaction_id as string,
        category_id: l.category_id as string,
        nominal: l.nominal as number,
        biaya_material: l.biaya_material as number,
        item_name: l.item_name as string | null,
        notes: l.notes as string | null,
        mechanics: (l.transaction_line_mechanics as TransactionLineMechanicRow[]) ?? [],
      }))

      return {
        ...(tx as TransactionRow),
        lines,
        bubut_luar_links: (bubutRes.data ?? []) as BubutLuarLinkRow[],
        customer: customerRes.data as { id: string; name: string; motor_type: string | null } | null,
        supplier: supplierRes.data as { id: string; name: string; phone: string | null } | null,
      } as TransactionDetail
    },
  })
}
