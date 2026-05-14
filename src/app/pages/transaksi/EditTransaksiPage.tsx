import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/nq21/PageHeader'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import type { TransactionFormInitialData } from '@/features/transactions/components/TransactionForm'
import { useTransaction } from '@/features/transactions/hooks'
import { useCommissionStore } from '@/store/commission'
import { supabase } from '@/lib/supabase'
import type { Line } from '@/features/transactions/types'

export default function EditTransaksiPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: tx, isLoading } = useTransaction(id)
  const { periods } = useCommissionStore()

  const [isDirty, setIsDirty] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // All hooks must run unconditionally
  const txPeriod = useMemo(() => {
    if (!tx) return null
    return periods.find((p) => tx.tgl >= p.weekStart && tx.tgl <= p.weekEnd) ?? null
  }, [tx, periods])

  // Fetch vendor expense supplier for bubut_luar pre-fill
  const bubutLink = (tx?.bubut_luar_links ?? [])[0] ?? null
  const vendorExpenseId = bubutLink?.expense_transaction_id ?? null
  const { data: vendorExpense } = useQuery({
    queryKey: ['vendor-expense-supplier', vendorExpenseId],
    enabled: !!vendorExpenseId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('supplier_id')
        .eq('id', vendorExpenseId!)
        .single()
      if (error) throw error
      return data as { supplier_id: string | null }
    },
  })

  const initialData = useMemo((): TransactionFormInitialData | null => {
    if (!tx) return null

    const initialLines: Line[] = tx.lines.map((l) => {
      const link = tx.bubut_luar_links.find((b) => b.revenue_line_id === l.id)
      return {
        id: l.id,
        categoryId: l.category_id,
        nominal: l.nominal,
        biayaMaterial: l.biaya_material,
        notes: l.notes ?? undefined,
        itemName: l.item_name ?? undefined,
        mechanics: l.mechanics.map((m) => ({
          mechanicId: m.mechanic_id,
          sharePercent: m.share_percent,
          rateOverride: m.rate_override ?? undefined,
        })),
        bubutVendor: link
          ? { supplierId: vendorExpense?.supplier_id ?? null, vendorCost: link.vendor_cost }
          : undefined,
      }
    })

    return {
      header: {
        noReferensi: tx.no_referensi,
        tglTransaksi: tx.tgl.slice(0, 10),
        tipe: tx.tipe,
        customerId: tx.customer_id ?? undefined,
        supplierId: tx.supplier_id ?? undefined,
        paymentMethod: tx.payment_method,
        notes: tx.notes ?? undefined,
      },
      lines: initialLines,
    }
  }, [tx, vendorExpense])

  // ── Guards (after all hooks) ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <>
        <PageHeader title="EDIT TRANSAKSI" />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          Memuat...
        </div>
      </>
    )
  }

  if (!tx) return <Navigate to="/transaksi" replace />
  if (tx.deleted_at) return <Navigate to={`/transaksi/${id}`} replace />
  if (tx.no_referensi.endsWith('-VENDOR')) return <Navigate to="/transaksi" replace />
  if (txPeriod?.status === 'closed') return <Navigate to={`/transaksi/${id}`} replace />

  // ── Render ──────────────────────────────────────────────────────────────────

  function handleBackClick() {
    if (isDirty) setShowCancelConfirm(true)
    else navigate(`/transaksi/${id}`)
  }

  return (
    <>
      <PageHeader
        title="EDIT TRANSAKSI"
        subtitle={tx.no_referensi}
        action={
          <button
            onClick={handleBackClick}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', padding: '8px 16px',
              borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ← BATAL
          </button>
        }
      />

      <TransactionForm
        mode="edit"
        transactionId={id}
        initialData={initialData!}
        onSuccess={(txId) => navigate(`/transaksi/${txId}`)}
        onDirtyChange={setIsDirty}
      />

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Batalkan perubahan?"
        message="Ada perubahan yang belum disimpan. Kembali ke detail transaksi?"
        confirmLabel="Ya, Batalkan"
        variant="destructive"
        onConfirm={() => navigate(`/transaksi/${id}`)}
      />
    </>
  )
}
