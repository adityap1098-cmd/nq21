import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export interface TransactionRow {
  id: string
  no_referensi: string
  tgl: string
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
  line_id: string
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
        .order('tgl', { ascending: false })
        .order('created_at', { ascending: false })

      if (!filters.includeDeleted) query = query.is('deleted_at', null)
      if (filters.tipe) query = query.eq('tipe', filters.tipe)
      if (filters.dateFrom) query = query.gte('tgl', filters.dateFrom)
      if (filters.dateTo) query = query.lte('tgl', filters.dateTo)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as TransactionRow[]
    },
  })
}

// ── useTransactionsWithLines ──────────────────────────────────────────────────
// Fetches transactions with embedded lines, categories, mechanics, and party.
// Used by laporan pages that need per-line category breakdown.

export interface TransactionLineMechanicWithMechanic {
  id: string
  line_id: string
  mechanic_id: string
  share_percent: number
  rate_override: number | null
  mechanics: { id: string; name: string; is_active: boolean } | null
}

export interface TransactionLineWithCategory extends TransactionLineRow {
  categories: { id: string; name: string; type: string; is_jasa: boolean } | null
  transaction_line_mechanics: TransactionLineMechanicWithMechanic[]
}

export interface TransactionWithLines extends TransactionRow {
  customer: { id: string; name: string; motor_type: string | null } | null
  supplier: { id: string; name: string } | null
  transaction_lines: TransactionLineWithCategory[]
}

export function useTransactionsWithLines(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions-with-lines', filters],
    staleTime: STALE_5MIN,
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          customers(id, name, motor_type),
          suppliers(id, name),
          transaction_lines(
            id, transaction_id, category_id, nominal, biaya_material, item_name, notes,
            categories(id, name, type, is_jasa),
            transaction_line_mechanics(id, line_id, mechanic_id, share_percent, rate_override, mechanics(id, name, is_active))
          )
        `)
        .order('tgl', { ascending: false })
        .order('created_at', { ascending: false })

      if (!filters.includeDeleted) query = query.is('deleted_at', null)
      if (filters.tipe) query = query.eq('tipe', filters.tipe)
      if (filters.dateFrom) query = query.gte('tgl', filters.dateFrom)
      if (filters.dateTo) query = query.lte('tgl', filters.dateTo)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as TransactionWithLines[]
    },
  })
}

export function useNextNoReferensi(tipe: 'income' | 'expense', tgl: string) {
  return useQuery({
    queryKey: ['next-no-referensi', tipe, tgl],
    staleTime: 30_000,
    queryFn: async () => {
      const prefix = tipe === 'income' ? 'TRX' : 'EXP'
      const compact = tgl.replace(/-/g, '')
      const { data, error } = await supabase
        .from('transactions')
        .select('no_referensi')
        .ilike('no_referensi', `${prefix}-${compact}-%`)
        .not('no_referensi', 'ilike', '%-VENDOR')
      if (error) throw error
      const existing = (data ?? [])
        .map((r: { no_referensi: string }) => parseInt(r.no_referensi.slice(-3), 10))
        .filter((n: number) => !isNaN(n))
      const max = existing.length > 0 ? Math.max(...existing) : 0
      return `${prefix}-${compact}-${String(max + 1).padStart(3, '0')}`
    },
  })
}

export interface TransactionCreateInput {
  no_referensi: string
  tgl: string
  tipe: 'income' | 'expense'
  customer_id?: string | null
  supplier_id?: string | null
  payment_method: 'cash' | 'transfer' | 'qris'
  notes?: string | null
  created_by: string
  lines: Array<{
    category_id: string
    nominal: number
    biaya_material: number
    item_name?: string | null
    notes?: string | null
    mechanics: Array<{
      mechanic_id: string
      share_percent: number
      rate_override?: number | null
    }>
    bubut_vendor?: {
      supplier_id: string
      vendor_cost: number
      bayar_vendor_category_id: string
    } | null
  }>
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TransactionCreateInput): Promise<{ txId: string; expenseTxId: string | null }> => {
      const insertedTxIds: string[] = []
      const insertedLineIds: string[] = []
      const insertedMechanicIds: string[] = []
      const insertedBubutLinkIds: string[] = []

      async function rollback() {
        if (insertedBubutLinkIds.length > 0)
          await supabase.from('bubut_luar_links').delete().in('id', insertedBubutLinkIds)
        if (insertedMechanicIds.length > 0)
          await supabase.from('transaction_line_mechanics').delete().in('id', insertedMechanicIds)
        if (insertedLineIds.length > 0)
          await supabase.from('transaction_lines').delete().in('id', insertedLineIds)
        if (insertedTxIds.length > 0)
          await supabase.from('transactions').delete().in('id', insertedTxIds)
      }

      try {
        const totalNominal = input.lines.reduce((s, l) => s + l.nominal, 0)

        const { data: tx, error: txErr } = await supabase
          .from('transactions')
          .insert({
            no_referensi: input.no_referensi,
            tgl: input.tgl,
            tipe: input.tipe,
            customer_id: input.customer_id ?? null,
            supplier_id: input.supplier_id ?? null,
            payment_method: input.payment_method,
            total_nominal: totalNominal,
            notes: input.notes ?? null,
            created_by: input.created_by,
          })
          .select('id')
          .single()
        if (txErr) throw txErr
        insertedTxIds.push(tx.id as string)

        let expenseTxId: string | null = null

        for (let i = 0; i < input.lines.length; i++) {
          const line = input.lines[i]
          const { data: lineRow, error: lineErr } = await supabase
            .from('transaction_lines')
            .insert({
              transaction_id: tx.id,
              category_id: line.category_id,
              nominal: line.nominal,
              biaya_material: line.biaya_material,
              item_name: line.item_name ?? null,
              notes: line.notes ?? null,
              line_order: i,
            })
            .select('id')
            .single()
          if (lineErr) throw lineErr
          insertedLineIds.push(lineRow.id as string)

          if (line.mechanics.length > 0) {
            const { data: mechRows, error: mechErr } = await supabase
              .from('transaction_line_mechanics')
              .insert(
                line.mechanics.map((m) => ({
                  line_id: lineRow.id,
                  mechanic_id: m.mechanic_id,
                  share_percent: m.share_percent,
                  rate_override: m.rate_override ?? null,
                })),
              )
              .select('id')
            if (mechErr) throw mechErr
            insertedMechanicIds.push(...(mechRows ?? []).map((r: { id: string }) => r.id))
          }

          if (line.bubut_vendor) {
            const { supplier_id: vendorSupplierId, vendor_cost, bayar_vendor_category_id } = line.bubut_vendor

            const { data: expTx, error: expTxErr } = await supabase
              .from('transactions')
              .insert({
                no_referensi: `${input.no_referensi}-VENDOR`,
                tgl: input.tgl,
                tipe: 'expense' as const,
                supplier_id: vendorSupplierId,
                payment_method: input.payment_method,
                total_nominal: vendor_cost,
                notes: `Auto-linked ke ${input.no_referensi}`,
                created_by: input.created_by,
              })
              .select('id')
              .single()
            if (expTxErr) throw expTxErr
            insertedTxIds.push(expTx.id as string)
            expenseTxId = expTx.id as string

            const { data: expLine, error: expLineErr } = await supabase
              .from('transaction_lines')
              .insert({
                transaction_id: expTx.id,
                category_id: bayar_vendor_category_id,
                nominal: vendor_cost,
                biaya_material: 0,
                item_name: null,
                notes: null,
                line_order: 0,
              })
              .select('id')
              .single()
            if (expLineErr) throw expLineErr
            insertedLineIds.push(expLine.id as string)

            const { data: bubutLink, error: bubutLinkErr } = await supabase
              .from('bubut_luar_links')
              .insert({
                revenue_line_id: lineRow.id,
                expense_transaction_id: expTx.id,
                vendor_cost,
              })
              .select('id')
              .single()
            if (bubutLinkErr) throw bubutLinkErr
            insertedBubutLinkIds.push(bubutLink.id as string)
          }
        }

        return { txId: tx.id as string, expenseTxId }
      } catch (err) {
        await rollback()
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['next-no-referensi'] })
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
        .order('line_order')
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

type OldLineShape = { id: string; bubut_luar_links?: { expense_transaction_id: string }[] }
type ExistingTxShape = { tgl: string; transaction_lines?: OldLineShape[] }

async function fetchExistingForMutation(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, tgl, transaction_lines(id, bubut_luar_links(expense_transaction_id))')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error || !data) throw new Error('Transaksi tidak ditemukan')
  return data as ExistingTxShape
}

async function checkPeriodClosed(tgl: string) {
  const { data } = await supabase
    .from('commission_periods')
    .select('id')
    .eq('status', 'closed')
    .lte('week_start', tgl)
    .gte('week_end', tgl)
    .maybeSingle()
  if (data) throw new Error('Tidak bisa edit/delete transaksi di periode yang sudah close')
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionCreateInput }): Promise<{ txId: string; expenseTxId: string | null }> => {
      const existing = await fetchExistingForMutation(id)
      await checkPeriodClosed(existing.tgl)

      const oldLines = (existing.transaction_lines ?? []) as OldLineShape[]
      const oldLineIds = oldLines.map((l) => l.id)
      const pairedExpenseIds = oldLines
        .flatMap((l) => l.bubut_luar_links ?? [])
        .map((b) => b.expense_transaction_id)
        .filter(Boolean)

      const insertedIds = { lines: [] as string[], mechanics: [] as string[], bubutLinks: [] as string[], expenseTrx: [] as string[] }

      try {
        // Hard-delete old child records (bottom-up)
        if (oldLineIds.length) {
          await supabase.from('bubut_luar_links').delete().in('revenue_line_id', oldLineIds)
          await supabase.from('transaction_line_mechanics').delete().in('line_id', oldLineIds)
        }
        // Hard-delete old vendor expense lines + transactions (avoids noRef uniqueness conflict on re-insert)
        if (pairedExpenseIds.length) {
          await supabase.from('transaction_lines').delete().in('transaction_id', pairedExpenseIds)
          await supabase.from('transactions').delete().in('id', pairedExpenseIds)
        }
        await supabase.from('transaction_lines').delete().eq('transaction_id', id)

        // Re-insert lines + mechanics + bubut (same pattern as create)
        const totalNominal = input.lines.reduce((s, l) => s + l.nominal, 0)
        let expenseTxId: string | null = null

        for (let i = 0; i < input.lines.length; i++) {
          const line = input.lines[i]
          const { data: lineRow, error: lineErr } = await supabase
            .from('transaction_lines')
            .insert({ transaction_id: id, category_id: line.category_id, nominal: line.nominal, biaya_material: line.biaya_material, item_name: line.item_name ?? null, notes: line.notes ?? null, line_order: i })
            .select('id').single()
          if (lineErr) throw lineErr
          insertedIds.lines.push(lineRow.id as string)

          if (line.mechanics.length > 0) {
            const { data: mechRows, error: mechErr } = await supabase
              .from('transaction_line_mechanics')
              .insert(line.mechanics.map((m) => ({ line_id: lineRow.id, mechanic_id: m.mechanic_id, share_percent: m.share_percent, rate_override: m.rate_override ?? null })))
              .select('id')
            if (mechErr) throw mechErr
            insertedIds.mechanics.push(...(mechRows ?? []).map((r: { id: string }) => r.id))
          }

          if (line.bubut_vendor) {
            const { supplier_id: vendorSupplierId, vendor_cost, bayar_vendor_category_id } = line.bubut_vendor
            const { data: expTx, error: expTxErr } = await supabase
              .from('transactions')
              .insert({ no_referensi: `${input.no_referensi}-VENDOR`, tgl: input.tgl, tipe: 'expense' as const, supplier_id: vendorSupplierId, payment_method: input.payment_method, total_nominal: vendor_cost, notes: `Auto-linked ke ${input.no_referensi}`, created_by: input.created_by })
              .select('id').single()
            if (expTxErr) throw expTxErr
            insertedIds.expenseTrx.push(expTx.id as string)
            expenseTxId = expTx.id as string

            const { data: expLine, error: expLineErr } = await supabase
              .from('transaction_lines')
              .insert({ transaction_id: expTx.id, category_id: bayar_vendor_category_id, nominal: vendor_cost, biaya_material: 0, item_name: null, notes: null, line_order: 0 })
              .select('id').single()
            if (expLineErr) throw expLineErr
            insertedIds.lines.push(expLine.id as string)

            const { data: bubutLink, error: bubutLinkErr } = await supabase
              .from('bubut_luar_links')
              .insert({ revenue_line_id: lineRow.id, expense_transaction_id: expTx.id, vendor_cost })
              .select('id').single()
            if (bubutLinkErr) throw bubutLinkErr
            insertedIds.bubutLinks.push(bubutLink.id as string)
          }
        }

        // Update header (no_referensi stays unchanged)
        const { error: updErr } = await supabase
          .from('transactions')
          .update({ tgl: input.tgl, customer_id: input.customer_id ?? null, supplier_id: input.supplier_id ?? null, payment_method: input.payment_method, total_nominal: totalNominal, notes: input.notes ?? null })
          .eq('id', id)
        if (updErr) throw updErr

        supabase.from('audit_logs').insert({ user_id: user?.id ?? 'unknown', action: 'update_transaction', entity_type: 'transaction', entity_id: id, source: 'edit-transaksi' }).then(() => {}, () => {})

        return { txId: id, expenseTxId }
      } catch (err) {
        if (insertedIds.bubutLinks.length) await supabase.from('bubut_luar_links').delete().in('id', insertedIds.bubutLinks)
        if (insertedIds.mechanics.length) await supabase.from('transaction_line_mechanics').delete().in('id', insertedIds.mechanics)
        if (insertedIds.lines.length) await supabase.from('transaction_lines').delete().in('id', insertedIds.lines)
        if (insertedIds.expenseTrx.length) await supabase.from('transactions').delete().in('id', insertedIds.expenseTrx)
        throw err
      }
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction', id] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const existing = await fetchExistingForMutation(id)
      await checkPeriodClosed(existing.tgl)

      const oldLines = (existing.transaction_lines ?? []) as OldLineShape[]
      const pairedExpenseIds = oldLines
        .flatMap((l) => l.bubut_luar_links ?? [])
        .map((b) => b.expense_transaction_id)
        .filter(Boolean)

      const deletedAt = new Date().toISOString()
      if (pairedExpenseIds.length) {
        await supabase.from('transactions').update({ deleted_at: deletedAt }).in('id', pairedExpenseIds)
      }
      const { error } = await supabase.from('transactions').update({ deleted_at: deletedAt }).eq('id', id)
      if (error) throw error

      supabase.from('audit_logs').insert({ user_id: user?.id ?? 'unknown', action: 'delete_transaction', entity_type: 'transaction', entity_id: id, source: 'detail-transaksi' }).then(() => {}, () => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
