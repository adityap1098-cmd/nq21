import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/nq21/PageHeader'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import type { TransactionFormInitialData } from '@/features/transactions/components/TransactionForm'
import { useTransaction } from '@/features/transactions/hooks'
import { useCommissionPeriods } from '@/features/komisi/hooks'
import { isInClosedPeriod } from '@/features/transactions/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { Line } from '@/features/transactions/types'

function StatusMessage({ text, onBack }: { text: string; onBack?: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      <div style={{ marginBottom: onBack ? 16 : 0 }}>{text}</div>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', padding: '9px 18px', borderRadius: 8,
            border: '1.5px solid var(--border)', background: 'transparent',
            color: 'var(--text)', cursor: 'pointer',
          }}
        >
          ← Kembali ke Daftar
        </button>
      )}
    </div>
  )
}

export default function EditTransaksiPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const { data: tx, isLoading, isError: txError, error: txErrorObj } = useTransaction(id)
  const { data: periods = [], isLoading: periodsLoading, isError: periodsError } = useCommissionPeriods()

  const [isDirty, setIsDirty] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // All hooks must run unconditionally
  const isLocked = useMemo(() => (tx ? isInClosedPeriod(tx.tgl, periods) : false), [tx, periods])

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
          ? { supplierId: link.expense?.supplier_id ?? null, vendorCost: link.vendor_cost }
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
  }, [tx])

  // ── Guards (after all hooks) ────────────────────────────────────────────────

  if (isLoading || periodsLoading) {
    return (
      <>
        <PageHeader title="EDIT TRANSAKSI" />
        <StatusMessage text="Memuat..." />
      </>
    )
  }

  if (txError || periodsError) {
    const detail = txErrorObj instanceof Error ? txErrorObj.message : ''
    return (
      <>
        <PageHeader title="EDIT TRANSAKSI" />
        <StatusMessage
          text={`Gagal memuat transaksi${detail ? `: ${detail}` : ''}. Periksa koneksi lalu muat ulang halaman.`}
          onBack={() => navigate('/transaksi')}
        />
      </>
    )
  }

  if (!tx) {
    return (
      <>
        <PageHeader title="EDIT TRANSAKSI" />
        <StatusMessage text="Transaksi tidak ditemukan." onBack={() => navigate('/transaksi')} />
      </>
    )
  }
  if (tx.deleted_at) return <Navigate to={`/transaksi/${id}`} replace />
  if (tx.no_referensi.endsWith('-VENDOR')) return <Navigate to={`/transaksi/${id}`} replace />
  if (isLocked) return <Navigate to={`/transaksi/${id}`} replace />

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
              ...(isMobile && { minHeight: 40 }),
            }}
          >
            ← BATAL
          </button>
        }
      />

      <TransactionForm
        key={tx.id}
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
