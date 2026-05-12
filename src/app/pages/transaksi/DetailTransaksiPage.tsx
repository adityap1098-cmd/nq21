import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/nq21/PageHeader'
import { CurrencyDisplay } from '@/components/nq21/CurrencyDisplay'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { useTransaction, type TransactionLineMechanicRow } from '@/features/transactions/hooks'
import { useCategories } from '@/features/categories/hooks'
import { useMechanics, useCommissionRates } from '@/features/mechanics/hooks'
import { useUserStore } from '@/store/master/users'
import { useAuthStore } from '@/store/auth'
import { useAuditStore } from '@/store/audit'
import { useCommissionStore } from '@/store/commission'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import type { CommissionPeriod, AuditLog } from '@/store/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTgl(tgl: string, style: 'long' | 'short' = 'long') {
  try {
    const d = parseISO(tgl + 'T00:00:00')
    return format(d, style === 'long' ? 'EEEE, d MMMM yyyy' : 'd MMM yyyy', { locale: localeId })
  } catch {
    return tgl
  }
}

function fmtTs(iso: string) {
  try {
    return format(parseISO(iso), 'd MMM yyyy · HH:mm', { locale: localeId })
  } catch {
    return iso
  }
}

interface MechKomisiRow {
  mechanic_id: string
  share: number
  masterRate: number
  effectiveRate: number
  hasOverride: boolean
  komisi: number
}

function computeLineKomisi(
  line: { nominal: number; biaya_material: number; category_id: string; mechanics: TransactionLineMechanicRow[] },
  rates: { mechanic_id: string; category_id: string; rate_percent: number }[],
): MechKomisiRow[] {
  const basis = Math.max(0, line.nominal - line.biaya_material)
  return line.mechanics.map((lm) => {
    const masterRate = rates.find((r) => r.mechanic_id === lm.mechanic_id && r.category_id === line.category_id)?.rate_percent ?? 0
    const effectiveRate = lm.rate_override !== null ? lm.rate_override : masterRate
    const komisi = Math.round(basis * (lm.share_percent / 100) * (effectiveRate / 100))
    return { mechanic_id: lm.mechanic_id, share: lm.share_percent, masterRate, effectiveRate, hasOverride: lm.rate_override !== null, komisi }
  })
}

function getPeriodForDate(tgl: string, periods: CommissionPeriod[]): CommissionPeriod | null {
  return periods.find((p) => tgl >= p.weekStart && tgl <= p.weekEnd) ?? null
}

// ── Micro-components ───────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 4,
      border: `1px solid ${color}`, color, background: bg,
    }}>
      {label}
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '18px 20px', ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DetailTransaksiPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: tx, isLoading } = useTransaction(id)
  const { data: categories = [] } = useCategories(true)
  const { data: mechanics = [] } = useMechanics(true)
  const { data: rates = [] } = useCommissionRates()
  const { users } = useUserStore()
  const { user } = useAuthStore()
  const { logs, log: auditLog } = useAuditStore()
  const { periods } = useCommissionStore()

  const [showDelete, setShowDelete] = useState(false)
  const [auditExpanded, setAuditExpanded] = useState(false)

  // ── Counterpart tx for bubut luar ───────────────────────────────────────────
  const bubutLink = tx?.bubut_luar_links?.[0] ?? null
  const isVendorAuto = !!(tx?.no_referensi?.endsWith('-VENDOR'))

  const { data: vendorLinkForExpense } = useQuery({
    queryKey: ['bubut-vendor-link', tx?.id],
    enabled: !!tx && isVendorAuto,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubut_luar_links')
        .select('expense_transaction_id, revenue_line_id, transaction_lines!inner(transaction_id)')
        .eq('expense_transaction_id', tx!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const counterpartId = bubutLink?.expense_transaction_id
    ?? (vendorLinkForExpense ? (vendorLinkForExpense as { transaction_lines?: { transaction_id?: string } }).transaction_lines?.transaction_id : null)

  const { data: counterpartTx } = useQuery({
    queryKey: ['transaction-counterpart', counterpartId],
    enabled: !!counterpartId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, no_referensi, supplier_id')
        .eq('id', counterpartId!)
        .maybeSingle()
      if (error) throw error
      return data as { id: string; no_referensi: string; supplier_id: string | null } | null
    },
  })

  // ── Derived state ────────────────────────────────────────────────────────────

  const period = useMemo(() => {
    if (!tx) return null
    return getPeriodForDate(tx.tgl, periods)
  }, [tx, periods])

  const hasJasaLine = useMemo(() => {
    if (!tx) return false
    return tx.lines.some((l) => {
      const cat = categories.find((c) => c.id === l.category_id)
      return cat?.is_jasa
    })
  }, [tx, categories])

  const komisiByMechanic = useMemo(() => {
    const map = new Map<string, { amount: number; hasOverride: boolean }>()
    if (!tx) return map
    for (const line of tx.lines) {
      const cat = categories.find((c) => c.id === line.category_id)
      if (!cat?.is_jasa) continue
      const rows = computeLineKomisi(line, rates)
      for (const row of rows) {
        const prev = map.get(row.mechanic_id) ?? { amount: 0, hasOverride: false }
        map.set(row.mechanic_id, { amount: prev.amount + row.komisi, hasOverride: prev.hasOverride || row.hasOverride })
      }
    }
    return map
  }, [tx, categories, rates])

  const totalKomisi = useMemo(() => {
    let t = 0; komisiByMechanic.forEach((v) => { t += v.amount }); return t
  }, [komisiByMechanic])

  const auditEntries = useMemo(() => {
    return logs
      .filter((l) => l.entityId === tx?.id || l.entityId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [logs, tx, id])

  const canEdit = useMemo(() => {
    if (!tx || tx.deleted_at) return false
    if (tx.no_referensi.endsWith('-VENDOR')) return false
    if (hasJasaLine && period?.status === 'closed') return false
    return true
  }, [tx, hasJasaLine, period])

  const editDisabledReason = useMemo(() => {
    if (!tx) return ''
    if (tx.deleted_at) return 'Transaksi sudah dihapus'
    if (tx.no_referensi.endsWith('-VENDOR')) {
      return `Edit dari transaksi induk: ${counterpartTx?.no_referensi ?? '...'}`
    }
    if (hasJasaLine && period?.status === 'closed') return 'Transaksi di periode yang sudah ditutup. Hubungi owner untuk override.'
    return ''
  }, [tx, counterpartTx, hasJasaLine, period])

  const deletedByName = useMemo(() => {
    if (!tx?.deleted_at) return null
    const entry = logs.find((l) => l.entityId === tx.id && l.action === 'delete')
    return entry ? (users.find((u) => u.id === entry.userId)?.name ?? null) : null
  }, [tx, logs, users])

  const deleteMessage = useMemo(() => {
    if (!tx) return ''
    const parts: string[] = []
    if (bubutLink) parts.push(`Akan menghapus 2 transaksi: income ${tx.no_referensi} + expense ${tx.no_referensi}-VENDOR.`)
    else if (hasJasaLine) parts.push('Komisi mekanik di transaksi ini juga ke-affected.')
    parts.push('Lanjut?')
    return parts.join(' ')
  }, [tx, bubutLink, hasJasaLine])

  async function handleDelete() {
    if (!tx) return
    const now = new Date().toISOString()

    await supabase.from('transactions').update({ deleted_at: now }).eq('id', tx.id)
    if (bubutLink) {
      await supabase.from('transactions').update({ deleted_at: now }).eq('id', bubutLink.expense_transaction_id)
    }

    const userId = users.find((u) => u.name === user?.name)?.id ?? 'unknown'
    auditLog({ userId, action: 'delete', entityType: 'transaction', entityId: tx.id, source: 'detail-page', beforeData: { no_referensi: tx.no_referensi } })
    toast('Transaksi dihapus', { description: tx.no_referensi })
    await queryClient.invalidateQueries({ queryKey: ['transactions'] })
    navigate('/transaksi')
  }

  // ── Loading / Not Found ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <>
        <PageHeader title="DETAIL TRANSAKSI" />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          Memuat...
        </div>
      </>
    )
  }

  if (!tx) {
    return (
      <>
        <PageHeader title="DETAIL TRANSAKSI" />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>🔍</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>Transaksi tidak ditemukan.</div>
          <button
            onClick={() => navigate('/transaksi')}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', padding: '9px 18px', borderRadius: 8,
              border: '1.5px solid var(--border)', background: 'transparent',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            ← Kembali ke Daftar
          </button>
        </div>
      </>
    )
  }

  // ── Resolved data ────────────────────────────────────────────────────────────

  const isIncome = tx.tipe === 'income'
  const isDeleted = !!tx.deleted_at
  const partyName = tx.customer?.name ?? tx.supplier?.name ?? '—'
  const partySub = isIncome ? (tx.customer?.motor_type ?? null) : (tx.supplier?.phone ?? null)
  const creatorName = users.find((u) => u.id === tx.created_by)?.name ?? tx.created_by
  const paymentLabel = tx.payment_method === 'cash' ? 'Cash' : tx.payment_method === 'transfer' ? 'Transfer' : 'QRIS'
  const isOwner = user?.role === 'owner'
  const hasNotes = !!(tx.notes?.trim())

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="DETAIL TRANSAKSI"
        subtitle={tx.no_referensi}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => navigate('/transaksi')}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', padding: '8px 14px', borderRadius: 8,
                border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              ← KEMBALI
            </button>
            {isOwner && !isDeleted && (
              <button
                onClick={() => setShowDelete(true)}
                style={{
                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', padding: '8px 14px', borderRadius: 8,
                  border: '1.5px solid rgba(200,16,46,0.35)', background: 'transparent',
                  color: 'var(--accent)', cursor: 'pointer',
                }}
              >
                HAPUS
              </button>
            )}
            <button
              onClick={() => canEdit && navigate(`/transaksi/${tx.id}/edit`)}
              disabled={!canEdit}
              title={!canEdit ? editDisabledReason : undefined}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', padding: '8px 14px', borderRadius: 8,
                border: 'none',
                background: canEdit ? 'var(--text)' : 'var(--surface-alt)',
                color: canEdit ? '#fff' : 'var(--text-muted)',
                cursor: canEdit ? 'pointer' : 'not-allowed',
              }}
            >
              EDIT
            </button>
          </div>
        }
      />

      <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Deleted banner ── */}
        {isDeleted && (
          <div style={{
            background: 'rgba(200,16,46,0.08)', border: '1px solid rgba(200,16,46,0.25)',
            borderRadius: 8, padding: '10px 16px',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
            letterSpacing: '0.04em',
          }}>
            Transaksi ini telah dihapus pada {fmtTs(tx.deleted_at!)}{deletedByName ? ` oleh ${deletedByName}` : ''}.
          </div>
        )}

        {/* ── Vendor auto-link banner ── */}
        {isVendorAuto && counterpartTx && (
          <div style={{
            background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.2)',
            borderRadius: 8, padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
              Auto-link dari transaksi induk
            </span>
            <button
              onClick={() => navigate(`/transaksi/${counterpartTx.id}`)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer',
              }}
            >
              {counterpartTx.no_referensi} →
            </button>
          </div>
        )}

        {/* ── Status strip ── */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge
            label={isIncome ? 'PEMASUKAN' : 'PENGELUARAN'}
            color={isIncome ? 'var(--success)' : 'var(--accent)'}
            bg={isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(200,16,46,0.1)'}
          />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            {fmtTgl(tx.tgl)}
          </span>
          {isDeleted
            ? <Badge label="DIHAPUS" color="var(--accent)" bg="rgba(200,16,46,0.1)" />
            : <Badge label="AKTIF" color="var(--success)" bg="rgba(16,185,129,0.1)" />
          }
          {(bubutLink || isVendorAuto) && (
            <Badge label="BUBUT LUAR" color="rgba(200,16,46,0.8)" bg="rgba(200,16,46,0.08)" />
          )}
        </div>

        {/* ── Info card ── */}
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px' }}>
            <div>
              <SectionLabel>{isIncome ? 'CUSTOMER' : 'SUPPLIER'}</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--text)',
                }}>
                  {partyName[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{partyName}</div>
                  {partySub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{partySub}</div>}
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>METODE PEMBAYARAN</SectionLabel>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                padding: '4px 10px', borderRadius: 4,
                background: 'var(--surface-alt)', color: 'var(--text)',
              }}>
                {paymentLabel}
              </span>
            </div>

            <div>
              <SectionLabel>DIBUAT OLEH</SectionLabel>
              <div style={{ fontSize: 12 }}>{creatorName}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {fmtTs(tx.created_at)}
              </div>
            </div>
          </div>

          {hasNotes && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--border)' }}>
              <SectionLabel>CATATAN</SectionLabel>
              <div style={{ fontSize: 12, color: 'var(--text)', fontStyle: 'italic' }}>
                {tx.notes}
              </div>
            </div>
          )}
        </Card>

        {/* ── Line items ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tx.lines.map((line, i) => {
            const cat = categories.find((c) => c.id === line.category_id)
            const isJasa = cat?.is_jasa ?? false
            const isBubutLuar = cat?.name === 'Bubut Luar'
            const basis = Math.max(0, line.nominal - line.biaya_material)
            const mechRows = isJasa ? computeLineKomisi(line, rates) : []
            const lineLink = tx.bubut_luar_links.find((bl) => bl.revenue_line_id === line.id)

            return (
              <Card key={line.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
                    LINE {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                    {cat?.name ?? line.category_id}
                    {line.item_name && (
                      <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> — {line.item_name}</span>
                    )}
                  </span>
                  {isJasa && <Badge label="JASA" color="var(--text)" bg="var(--surface-alt)" />}
                  {isBubutLuar && <Badge label="BUBUT LUAR" color="rgba(200,16,46,0.8)" bg="rgba(200,16,46,0.08)" />}
                  {!cat?.is_active && <Badge label="KATEGORI DIHAPUS" color="var(--text-muted)" bg="var(--surface-alt)" />}
                </div>

                {isJasa ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 16px', marginBottom: mechRows.length ? 14 : 0 }}>
                    <div>
                      <SectionLabel>NOMINAL</SectionLabel>
                      <CurrencyDisplay value={line.nominal} size="sm" />
                    </div>
                    <div>
                      <SectionLabel>BIAYA MATERIAL</SectionLabel>
                      <CurrencyDisplay value={line.biaya_material} size="sm" />
                    </div>
                    <div>
                      <SectionLabel>BASIS KOMISI</SectionLabel>
                      <CurrencyDisplay value={basis} size="sm" />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <SectionLabel>NOMINAL</SectionLabel>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700 }}>
                      Rp {line.nominal.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}

                {!isJasa && line.notes && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {line.notes}
                  </div>
                )}

                {isJasa && mechRows.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {mechRows.map((row) => {
                      const mech = mechanics.find((m) => m.id === row.mechanic_id)
                      return (
                        <div key={row.mechanic_id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'var(--surface-alt)', borderRadius: 7, padding: '8px 10px',
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: '#fff',
                          }}>
                            {mech?.name[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>
                              {mech?.name ?? row.mechanic_id}
                            </span>
                            {!mech?.is_active && (
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 6 }}>NONAKTIF</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                              {row.share}%
                            </span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: row.hasOverride ? 'var(--accent)' : 'var(--text-muted)' }}>
                              {row.hasOverride && <span style={{ marginRight: 2 }}>⚠</span>}
                              {row.effectiveRate}%
                              {row.hasOverride && (
                                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginLeft: 4, fontSize: 9 }}>
                                  {row.masterRate}%
                                </span>
                              )}
                            </span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600 }}>
                              Rp {row.komisi.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isBubutLuar && lineLink && (
                  <div style={{
                    marginTop: 12, background: 'rgba(200,16,46,0.06)',
                    border: '1px solid rgba(200,16,46,0.2)', borderRadius: 7, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 16px', marginBottom: 10 }}>
                      <div>
                        <SectionLabel>BIAYA VENDOR</SectionLabel>
                        <CurrencyDisplay value={lineLink.vendor_cost} size="sm" />
                      </div>
                      <div>
                        <SectionLabel>MARGIN</SectionLabel>
                        <span style={{ color: line.nominal >= lineLink.vendor_cost ? 'var(--success)' : 'var(--accent)' }}>
                          <CurrencyDisplay value={Math.abs(line.nominal - lineLink.vendor_cost)} size="sm" />
                          {line.nominal < lineLink.vendor_cost && ' ⚠'}
                        </span>
                      </div>
                      {counterpartTx && (
                        <div>
                          <SectionLabel>EXPENSE AUTO-LINK</SectionLabel>
                          <button
                            onClick={() => navigate(`/transaksi/${counterpartTx.id}`)}
                            style={{
                              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                              letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 4,
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--text)', cursor: 'pointer',
                            }}
                          >
                            {counterpartTx.no_referensi} →
                          </button>
                        </div>
                      )}
                    </div>
                    {counterpartTx && tx.supplier && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                        Vendor: {tx.supplier.name}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* ── Summary footer ── */}
        <Card style={{ borderTop: '3px solid var(--text)', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: komisiByMechanic.size > 0 ? 16 : 0 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
              TOTAL
            </span>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, lineHeight: 1 }}>
              {tx.total_nominal.toLocaleString('id-ID')}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', marginLeft: 4 }}>IDR</span>
            </span>
          </div>

          {komisiByMechanic.size > 0 && (
            <div style={{
              background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.2)',
              borderRadius: 8, padding: '12px 14px', marginBottom: period ? 14 : 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: komisiByMechanic.size > 1 ? 8 : 0 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
                  TOTAL KOMISI MEKANIK
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  Rp {totalKomisi.toLocaleString('id-ID')}
                </span>
              </div>
              {komisiByMechanic.size > 1 && [...komisiByMechanic.entries()].map(([mechId, data]) => {
                const mech = mechanics.find((m) => m.id === mechId)
                return (
                  <div key={mechId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    <span>
                      {data.hasOverride && <span style={{ color: 'var(--accent)', marginRight: 4 }}>⚠</span>}
                      {mech?.name ?? mechId}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)' }}>Rp {data.amount.toLocaleString('id-ID')}</span>
                  </div>
                )
              })}
            </div>
          )}

          {period && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
                PERIODE KOMISI
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                {fmtTgl(period.weekStart, 'short')} – {fmtTgl(period.weekEnd, 'short')}
              </span>
              <Badge
                label={period.status === 'open' ? 'OPEN' : 'CLOSED'}
                color={period.status === 'open' ? 'var(--success)' : 'var(--text-muted)'}
                bg={period.status === 'open' ? 'rgba(16,185,129,0.1)' : 'var(--surface-alt)'}
              />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                · {period.status === 'open' ? 'Komisi akan masuk slip mingguan' : 'Periode ditutup, komisi sudah dibayarkan'}
              </span>
            </div>
          )}
        </Card>

        {/* ── Audit timeline ── */}
        <Card style={{ padding: 0 }}>
          <button
            onClick={() => setAuditExpanded((v) => !v)}
            style={{
              width: '100%', padding: '14px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text)' }}>
              RIWAYAT PERUBAHAN ({auditEntries.length} entri)
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.15s', display: 'inline-block', transform: auditExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>

          {auditExpanded && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
              {auditEntries.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada riwayat.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {auditEntries.map((entry) => (
                    <AuditEntry key={entry.id} entry={entry} users={users} />
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={`Hapus transaksi ${tx.no_referensi}?`}
        message={deleteMessage}
        confirmLabel="Ya, Hapus"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}

// ── Audit entry component ──────────────────────────────────────────────────────

function AuditEntry({ entry, users }: { entry: AuditLog; users: { id: string; name: string }[] }) {
  const userName = users.find((u) => u.id === entry.userId)?.name ?? entry.userId
  const actionLabel = entry.action === 'create' ? 'membuat transaksi'
    : entry.action === 'delete' ? 'menghapus transaksi'
    : 'memperbarui transaksi'

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: '#fff',
      }}>
        {userName[0]?.toUpperCase() ?? '?'}
      </div>
      <div>
        <div style={{ fontSize: 12 }}>
          <strong>{userName}</strong> {actionLabel}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            {entry.createdAt ? entry.createdAt.replace('T', ' · ').slice(0, 19) : '—'}
          </span>
          {entry.source && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.08em',
              padding: '1px 5px', borderRadius: 3,
              background: 'var(--surface-alt)', color: 'var(--text-muted)',
            }}>
              {entry.source}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
