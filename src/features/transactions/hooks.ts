import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

// PostgREST caps every response at 1000 rows (Supabase default max-rows).
const PAGE_SIZE = 1000

interface PageResult {
  data: unknown[] | null
  error: unknown
}

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<T[]> {
  let rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as T[]
    rows = rows.concat(page)
    if (page.length < PAGE_SIZE) return rows
  }
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    staleTime: STALE_5MIN,
    queryFn: () =>
      fetchAllPages<TransactionRow>((from, to) => {
        let query = supabase
          .from('transactions')
          .select('*')
          .order('tgl', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })

        if (!filters.includeDeleted) query = query.is('deleted_at', null)
        if (filters.tipe) query = query.eq('tipe', filters.tipe)
        if (filters.dateFrom) query = query.gte('tgl', filters.dateFrom)
        if (filters.dateTo) query = query.lte('tgl', filters.dateTo)

        return query.range(from, to)
      }),
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
    queryFn: () =>
      fetchAllPages<TransactionWithLines>((from, to) => {
        let query = supabase
          .from('transactions')
          .select(`
            *,
            customer:customers(id, name, motor_type),
            supplier:suppliers(id, name),
            transaction_lines(
              id, transaction_id, category_id, nominal, biaya_material, item_name, notes,
              categories(id, name, type, is_jasa),
              transaction_line_mechanics(id, line_id, mechanic_id, share_percent, rate_override, mechanics(id, name, is_active))
            )
          `)
          .order('tgl', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })

        if (!filters.includeDeleted) query = query.is('deleted_at', null)
        if (filters.tipe) query = query.eq('tipe', filters.tipe)
        if (filters.dateFrom) query = query.gte('tgl', filters.dateFrom)
        if (filters.dateTo) query = query.lte('tgl', filters.dateTo)

        return query.range(from, to)
      }),
  })
}

export function useNextNoReferensi(tipe: 'income' | 'expense', tgl: string) {
  return useQuery({
    queryKey: ['next-no-referensi', tipe, tgl],
    staleTime: 30_000,
    queryFn: async () => {
      const prefix = tipe === 'income' ? 'TRX' : 'EXP'
      const compact = tgl.replace(/-/g, '')
      // `___` = exactly 3 chars, so `<asli>-VENDOR` rows never match.
      // Soft-deleted rows are included on purpose: no_referensi is unique globally.
      const { data, error } = await supabase
        .from('transactions')
        .select('no_referensi')
        .like('no_referensi', `${prefix}-${compact}-___`)
        .order('no_referensi', { ascending: false })
        .limit(1)
      if (error) throw error
      const last = (data ?? [])[0] as { no_referensi: string } | undefined
      const parsed = last ? parseInt(last.no_referensi.slice(-3), 10) : 0
      const max = isNaN(parsed) ? 0 : parsed
      return `${prefix}-${compact}-${String(max + 1).padStart(3, '0')}`
    },
  })
}

// ── Mutation errors ───────────────────────────────────────────────────────────

export type TransactionErrorKind =
  | 'duplicate_no_ref'
  | 'period_closed'
  | 'validation'
  | 'not_found'
  | 'forbidden'
  | 'network'
  | 'unknown'

export class TransactionMutationError extends Error {
  readonly kind: TransactionErrorKind
  readonly original: unknown

  constructor(kind: TransactionErrorKind, message: string, original: unknown) {
    super(message)
    this.name = 'TransactionMutationError'
    this.kind = kind
    this.original = original
  }
}

interface DbErrorLike {
  code?: string
  message?: string
  details?: string
  hint?: string
}

const NETWORK_ERROR_RE = /failed to fetch|networkerror|network request failed|load failed|fetcherror|aborterror|timeout/i
const RLS_GENERIC_RE = /row-level security|permission denied/i

export function toTransactionError(err: unknown): TransactionMutationError {
  if (err instanceof TransactionMutationError) return err

  const e = (typeof err === 'object' && err !== null ? err : {}) as DbErrorLike
  const code = e.code ?? ''
  const message = e.message ?? (err instanceof Error ? err.message : '')

  if (message.startsWith('Periode sudah ditutup')) {
    return new TransactionMutationError('period_closed', message, err)
  }
  if (code === '23505') {
    return new TransactionMutationError('duplicate_no_ref', 'No referensi sudah dipakai', err)
  }
  if (code === 'NQ422') {
    return new TransactionMutationError('validation', message, err)
  }
  if (code === 'NQ404') {
    return new TransactionMutationError('not_found', message, err)
  }
  if (code === '23503') {
    return new TransactionMutationError(
      'validation',
      'Customer, supplier, kategori atau mekanik yang dipilih tidak ditemukan',
      err,
    )
  }
  if (code === '42501') {
    const detail = message && !RLS_GENERIC_RE.test(message) ? `: ${message}` : ''
    return new TransactionMutationError('forbidden', `Akses ditolak${detail}`, err)
  }
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline || (!code && NETWORK_ERROR_RE.test(message))) {
    return new TransactionMutationError('network', 'Koneksi bermasalah, data belum tersimpan', err)
  }
  return new TransactionMutationError(
    'unknown',
    message ? `Terjadi kesalahan: ${message}` : 'Terjadi kesalahan. Coba lagi.',
    err,
  )
}

function invalidateTransactionQueries(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: ['transactions-with-lines'] })
  queryClient.invalidateQueries({ queryKey: ['period-transactions'] })
  queryClient.invalidateQueries({ queryKey: ['next-no-referensi'] })
  if (id) queryClient.invalidateQueries({ queryKey: ['transaction', id] })
}

interface TransactionRpcResult {
  tx_id: string
  expense_tx_id: string | null
}

async function callTransactionRpc(
  fn: 'create_transaction' | 'update_transaction',
  args: Record<string, unknown>,
): Promise<{ txId: string; expenseTxId: string | null }> {
  try {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw error
    const result = data as TransactionRpcResult | null
    if (!result?.tx_id) throw new Error('Respons server tidak valid')
    return { txId: result.tx_id, expenseTxId: result.expense_tx_id ?? null }
  } catch (err) {
    throw toTransactionError(err)
  }
}

// Payload of public.create_transaction / public.update_transaction (see
// supabase/migrations/20261119_transaction_rpc.sql). created_by is ignored:
// the server always uses auth.uid().
export interface TransactionCreateInput {
  no_referensi: string
  tgl: string
  tipe: 'income' | 'expense'
  customer_id?: string | null
  supplier_id?: string | null
  payment_method: 'cash' | 'transfer' | 'qris'
  notes?: string | null
  created_by?: string
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
      // Ignored by the server (looks up "Bayar Vendor Bubut" by name); kept for compatibility
      bayar_vendor_category_id?: string
    } | null
  }>
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TransactionCreateInput) =>
      callTransactionRpc('create_transaction', { p: input }),
    onSuccess: (data) => invalidateTransactionQueries(queryClient, data.txId),
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

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionCreateInput }) =>
      callTransactionRpc('update_transaction', { p_id: id, p: input }),
    onSuccess: (_data, { id }) => invalidateTransactionQueries(queryClient, id),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      try {
        const { error } = await supabase.rpc('delete_transaction', { p_id: id })
        if (error) throw error
      } catch (err) {
        throw toTransactionError(err)
      }
    },
    onSuccess: (_data, id) => invalidateTransactionQueries(queryClient, id),
  })
}
