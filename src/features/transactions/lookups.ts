import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const STALE_1MIN = 60 * 1000
const ITEM_NAME_TX_LIMIT = 50

// ── Audit trail (owner only — RLS returns nothing to kasir) ──────────────────

export interface TransactionAuditEntry {
  id: string
  action: string
  user_id: string
  user_name: string | null
  source: string | null
  created_at: string
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  create_transaction: 'membuat transaksi',
  update_transaction: 'mengubah transaksi',
  delete_transaction: 'menghapus transaksi',
  create: 'membuat transaksi',
  update: 'mengubah transaksi',
  delete: 'menghapus transaksi',
}

export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

export function isDeleteAuditAction(action: string): boolean {
  return action === 'delete_transaction' || action === 'delete'
}

export function useTransactionAuditLogs(transactionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['transaction-audit', transactionId],
    enabled: enabled && !!transactionId,
    staleTime: STALE_1MIN,
    queryFn: async (): Promise<TransactionAuditEntry[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, user_id, source, created_at, user:profiles!audit_logs_user_id_fkey(name)')
        .eq('entity_id', transactionId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      const rows = (data ?? []) as unknown as Array<Omit<TransactionAuditEntry, 'user_name'> & { user: { name: string } | null }>
      return rows.map(({ user, ...r }) => ({ ...r, user_name: user?.name ?? null }))
    },
  })
}

// ── Smart pre-fill mekanik (CLAUDE.md Decision G) ────────────────────────────

/**
 * Mechanic ids of the jasa line on the given user's most recent non-deleted income
 * transaction that has one. Empty array when there is no such transaction.
 */
export function useLastJasaMechanicIds(userId: string | undefined) {
  return useQuery({
    queryKey: ['last-jasa-mechanics', userId],
    enabled: !!userId,
    staleTime: STALE_1MIN,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_lines!inner(
            line_order,
            categories!inner(is_jasa),
            transaction_line_mechanics!inner(mechanic_id)
          )
        `)
        .eq('created_by', userId!)
        .eq('tipe', 'income')
        .is('deleted_at', null)
        .eq('transaction_lines.categories.is_jasa', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      const tx = (data ?? [])[0] as unknown as {
        transaction_lines: Array<{ line_order: number; transaction_line_mechanics: Array<{ mechanic_id: string }> }>
      } | undefined
      if (!tx) return []
      const firstLine = [...tx.transaction_lines].sort((a, b) => a.line_order - b.line_order)[0]
      return [...new Set((firstLine?.transaction_line_mechanics ?? []).map((m) => m.mechanic_id))]
    },
  })
}

// ── Item name suggestions ────────────────────────────────────────────────────

/** Distinct item names used for a category, most recent first. */
export function useItemNameSuggestions(categoryId: string | null) {
  return useQuery({
    queryKey: ['item-name-suggestions', categoryId],
    enabled: !!categoryId,
    staleTime: 5 * STALE_1MIN,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('created_at, transaction_lines!inner(item_name)')
        .eq('transaction_lines.category_id', categoryId!)
        .not('transaction_lines.item_name', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(ITEM_NAME_TX_LIMIT)
      if (error) throw error
      const rows = (data ?? []) as unknown as Array<{ transaction_lines: Array<{ item_name: string | null }> }>
      const seen = new Map<string, string>()
      for (const row of rows) {
        for (const line of row.transaction_lines) {
          const name = line.item_name?.trim()
          if (!name) continue
          const key = name.toLowerCase()
          if (!seen.has(key)) seen.set(key, name)
        }
      }
      return [...seen.values()]
    },
  })
}
