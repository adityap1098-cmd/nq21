import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/nq21/PageHeader'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import type { TransactionFormInitialData } from '@/features/transactions/components/TransactionForm'
import { useTransactionStore } from '@/store/transactions'
import { useCategoryStore } from '@/store/master/categories'
import { useCommissionStore } from '@/store/commission'
import type { Line } from '@/features/transactions/types'

export default function EditTransaksiPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { transactions, lines: allLines, lineMechanics, bubutLuarLinks } = useTransactionStore()
  const { categories } = useCategoryStore()
  const { periods } = useCommissionStore()

  const [isDirty, setIsDirty] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // All hooks must run unconditionally — guards are below
  const tx = useMemo(() => transactions.find((t) => t.id === id), [transactions, id])

  const txLines = useMemo(
    () => (tx ? allLines.filter((l) => l.transactionId === tx.id) : []),
    [tx, allLines],
  )

  const hasJasaLine = useMemo(
    () => txLines.some((l) => categories.find((c) => c.id === l.categoryId)?.isJasa),
    [txLines, categories],
  )

  const txPeriod = useMemo(
    () => tx && hasJasaLine
      ? periods.find((p) => tx.tglTransaksi >= p.weekStart && tx.tglTransaksi <= p.weekEnd) ?? null
      : null,
    [tx, hasJasaLine, periods],
  )

  const initialData = useMemo((): TransactionFormInitialData | null => {
    if (!tx) return null

    const initialLines: Line[] = txLines.map((l) => {
      const lm = lineMechanics.filter((m) => m.transactionLineId === l.id)
      const bubutLink = bubutLuarLinks.find((bl) => bl.revenueLineId === l.id)
      const expTx = bubutLink ? transactions.find((t) => t.id === bubutLink.expenseTransactionId) : null

      return {
        id: l.id,
        categoryId: l.categoryId,
        nominal: l.nominal,
        biayaMaterial: l.biayaMaterial,
        notes: l.notes,
        jasaName: l.jasaName,
        mechanics: lm.map((m) => ({
          mechanicId: m.mechanicId,
          sharePercent: m.sharePercent,
          rateOverride: m.rateOverride,
        })),
        bubutVendor: bubutLink
          ? { supplierId: expTx?.supplierId ?? null, vendorCost: bubutLink.vendorCost }
          : undefined,
      }
    })

    return {
      header: {
        noReferensi: tx.noReferensi,
        tglTransaksi: tx.tglTransaksi,
        tipe: tx.tipe,
        customerId: tx.customerId,
        supplierId: tx.supplierId,
        paymentMethod: tx.paymentMethod,
        notes: tx.notes,
      },
      lines: initialLines,
    }
  }, [tx, txLines, lineMechanics, bubutLuarLinks, transactions])

  // ── Guards (after all hooks) ────────────────────────────────────────────────

  if (!tx) return <Navigate to="/transaksi" replace />

  if (tx.deletedAt) return <Navigate to={`/transaksi/${id}`} replace />

  if (tx.noReferensi.endsWith('-VENDOR')) {
    const link = bubutLuarLinks.find((bl) => bl.expenseTransactionId === tx.id)
    const revLine = link ? allLines.find((l) => l.id === link.revenueLineId) : null
    return <Navigate to={revLine ? `/transaksi/${revLine.transactionId}` : '/transaksi'} replace />
  }

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
        subtitle={tx.noReferensi}
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
