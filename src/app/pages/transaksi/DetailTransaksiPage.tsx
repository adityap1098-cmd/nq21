import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { PageHeader } from '@/components/nq21/PageHeader'
import { CurrencyDisplay } from '@/components/nq21/CurrencyDisplay'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { useTransactionStore } from '@/store/transactions'
import { useCategoryStore } from '@/store/master/categories'
import { useCustomerStore } from '@/store/master/customers'
import { useSupplierStore } from '@/store/master/suppliers'
import { useMechanicStore } from '@/store/master/mechanics'
import { useUserStore } from '@/store/master/users'
import { useAuthStore } from '@/store/auth'
import { useAuditStore } from '@/store/audit'
import { useCommissionStore } from '@/store/commission'
import { toast } from '@/hooks/use-toast'
import type {
  TransactionLine, TransactionLineMechanic,
  CommissionRate, CommissionPeriod, AuditLog,
} from '@/store/types'

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

interface LineWithMechanics extends TransactionLine {
  mechanics: TransactionLineMechanic[]
}

interface MechKomisiRow {
  mechanicId: string
  share: number
  masterRate: number
  effectiveRate: number
  hasOverride: boolean
  komisi: number
}

function computeLineKomisi(line: LineWithMechanics, rates: CommissionRate[]): MechKomisiRow[] {
  const basis = Math.max(0, line.nominal - line.biayaMaterial)
  return line.mechanics.map((lm) => {
    const masterRate = rates.find((r) => r.mechanicId === lm.mechanicId && r.categoryId === line.categoryId)?.ratePercent ?? 0
    const effectiveRate = lm.rateOverride !== undefined ? lm.rateOverride : masterRate
    const komisi = Math.round(basis * (lm.sharePercent / 100) * (effectiveRate / 100))
    return { mechanicId: lm.mechanicId, share: lm.sharePercent, masterRate, effectiveRate, hasOverride: lm.rateOverride !== undefined, komisi }
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

  const { transactions, lines: allLines, lineMechanics, bubutLuarLinks, softDelete } = useTransactionStore()
  const { categories } = useCategoryStore()
  const { customers } = useCustomerStore()
  const { suppliers } = useSupplierStore()
  const { mechanics, rates } = useMechanicStore()
  const { users } = useUserStore()
  const { user } = useAuthStore()
  const { logs, log: auditLog } = useAuditStore()
  const { periods } = useCommissionStore()

  const [showDelete, setShowDelete] = useState(false)
  const [auditExpanded, setAuditExpanded] = useState(false)

  const tx = useMemo(() => transactions.find((t) => t.id === id), [transactions, id])

  const txLines = useMemo<LineWithMechanics[]>(() => {
    if (!tx) return []
    return allLines
      .filter((l) => l.transactionId === tx.id)
      .map((l) => ({ ...l, mechanics: lineMechanics.filter((lm) => lm.transactionLineId === l.id) }))
  }, [tx, allLines, lineMechanics])

  const txBubutLink = useMemo(() => {
    if (!tx) return null
    for (const line of txLines) {
      const link = bubutLuarLinks.find((bl) => bl.revenueLineId === line.id)
      if (link) return link
    }
    return null
  }, [tx, txLines, bubutLuarLinks])

  const counterpartTx = useMemo(() => {
    if (!tx) return null
    if (txBubutLink) return transactions.find((t) => t.id === txBubutLink.expenseTransactionId) ?? null
    const expenseLink = bubutLuarLinks.find((bl) => bl.expenseTransactionId === tx.id)
    if (expenseLink) {
      const incomeLine = allLines.find((l) => l.id === expenseLink.revenueLineId)
      if (incomeLine) return transactions.find((t) => t.id === incomeLine.transactionId) ?? null
    }
    return null
  }, [tx, txBubutLink, bubutLuarLinks, transactions, allLines])

  const period = useMemo(() => {
    if (!tx) return null
    return getPeriodForDate(tx.tglTransaksi, periods)
  }, [tx, periods])

  const hasJasaLine = useMemo(() => {
    return txLines.some((l) => {
      const cat = categories.find((c) => c.id === l.categoryId)
      return cat?.isJasa
    })
  }, [txLines, categories])

  const komisiByMechanic = useMemo(() => {
    const map = new Map<string, { amount: number; hasOverride: boolean }>()
    for (const line of txLines) {
      const cat = categories.find((c) => c.id === line.categoryId)
      if (!cat?.isJasa) continue
      const rows = computeLineKomisi(line, rates)
      for (const row of rows) {
        const prev = map.get(row.mechanicId) ?? { amount: 0, hasOverride: false }
        map.set(row.mechanicId, { amount: prev.amount + row.komisi, hasOverride: prev.hasOverride || row.hasOverride })
      }
    }
    return map
  }, [txLines, categories, rates])

  const totalKomisi = useMemo(() => {
    let t = 0; komisiByMechanic.forEach((v) => { t += v.amount }); return t
  }, [komisiByMechanic])

  const auditEntries = useMemo(() => {
    return logs
      .filter((l) => l.entityId === tx?.id || l.entityId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [logs, tx, id])

  const canEdit = useMemo(() => {
    if (!tx || tx.deletedAt) return false
    if (tx.noReferensi.endsWith('-VENDOR')) return false
    if (hasJasaLine && period?.status === 'closed') return false
    return true
  }, [tx, hasJasaLine, period])

  const editDisabledReason = useMemo(() => {
    if (!tx) return ''
    if (tx.deletedAt) return 'Transaksi sudah dihapus'
    if (tx.noReferensi.endsWith('-VENDOR')) {
      const parent = counterpartTx
      return `Edit dari transaksi induk: ${parent?.noReferensi ?? '...'}`
    }
    if (hasJasaLine && period?.status === 'closed') return 'Transaksi di periode yang sudah ditutup. Hubungi owner untuk override.'
    return ''
  }, [tx, counterpartTx, hasJasaLine, period])

  const deletedByName = useMemo(() => {
    if (!tx?.deletedAt) return null
    const entry = logs.find((l) => l.entityId === tx.id && l.action === 'delete')
    return entry ? (users.find((u) => u.id === entry.userId)?.name ?? null) : null
  }, [tx, logs, users])

  const deleteMessage = useMemo(() => {
    if (!tx) return ''
    const parts: string[] = []
    if (txBubutLink) parts.push(`Akan menghapus 2 transaksi: income ${tx.noReferensi} + expense ${tx.noReferensi}-VENDOR.`)
    else if (hasJasaLine) parts.push('Komisi mekanik di transaksi ini juga ke-affected.')
    parts.push('Lanjut?')
    return parts.join(' ')
  }, [tx, txBubutLink, hasJasaLine])

  function handleDelete() {
    if (!tx) return
    const now = new Date().toISOString()
    softDelete(tx.id, now)
    if (txBubutLink) softDelete(txBubutLink.expenseTransactionId, now)
    const userId = users.find((u) => u.name === user?.name)?.id ?? 'unknown'
    auditLog({ userId, action: 'delete', entityType: 'transaction', entityId: tx.id, source: 'detail-page', beforeData: { noReferensi: tx.noReferensi } })
    toast('Transaksi dihapus', { description: tx.noReferensi })
    navigate('/transaksi')
  }

  // ── Not Found ────────────────────────────────────────────────────────────────

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
  const isDeleted = !!tx.deletedAt
  const isVendorAuto = tx.noReferensi.endsWith('-VENDOR')
  const partyName = isIncome
    ? (customers.find((c) => c.id === tx.customerId)?.name ?? '—')
    : (suppliers.find((s) => s.id === tx.supplierId)?.name ?? '—')
  const partySub = isIncome
    ? (customers.find((c) => c.id === tx.customerId)?.motorType ?? null)
    : (suppliers.find((s) => s.id === tx.supplierId)?.phone ?? null)
  const creatorName = users.find((u) => u.id === tx.createdBy)?.name ?? tx.createdBy
  const paymentLabel = tx.paymentMethod === 'cash' ? 'Cash' : tx.paymentMethod === 'transfer' ? 'Transfer' : 'QRIS'
  const isOwner = user?.role === 'owner'
  const hasNotes = !!(tx.notes?.trim())

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="DETAIL TRANSAKSI"
        subtitle={tx.noReferensi}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Ghost — escape action, lowest emphasis */}
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
            {/* Destructive outline — medium emphasis */}
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
            {/* Accent solid — primary action, highest emphasis */}
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
            Transaksi ini telah dihapus pada {fmtTs(tx.deletedAt!)}{deletedByName ? ` oleh ${deletedByName}` : ''}.
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
              {counterpartTx.noReferensi} →
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
            {fmtTgl(tx.tglTransaksi)}
          </span>
          {isDeleted
            ? <Badge label="DIHAPUS" color="var(--accent)" bg="rgba(200,16,46,0.1)" />
            : <Badge label="AKTIF" color="var(--success)" bg="rgba(16,185,129,0.1)" />
          }
          {(txBubutLink || isVendorAuto) && (
            <Badge label="BUBUT LUAR" color="rgba(200,16,46,0.8)" bg="rgba(200,16,46,0.08)" />
          )}
        </div>

        {/* ── Info card ── */}
        <Card>
          {/* Adaptive: 3-col compact when no notes, 2-col when notes present */}
          <div style={{ display: 'grid', gridTemplateColumns: hasNotes ? '1fr 1fr' : '1fr 1fr 1fr', gap: '16px 24px' }}>
            {/* Party */}
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

            {/* Payment method */}
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

            {/* Created by */}
            <div>
              <SectionLabel>DIBUAT OLEH</SectionLabel>
              <div style={{ fontSize: 12 }}>{creatorName}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {fmtTs(tx.createdAt)}
              </div>
            </div>

            {/* Notes — only rendered when has content (avoids wasted space in 2-col layout) */}
            {hasNotes && (
              <div>
                <SectionLabel>CATATAN</SectionLabel>
                <div style={{ fontSize: 12, color: 'var(--text)' }}>
                  {tx.notes}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Line items ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {txLines.map((line, i) => {
            const cat = categories.find((c) => c.id === line.categoryId)
            const isJasa = cat?.isJasa ?? false
            const isBubutLuar = cat?.name === 'Bubut Luar'
            const basis = Math.max(0, line.nominal - line.biayaMaterial)
            const mechRows = isJasa ? computeLineKomisi(line, rates) : []
            const lineLink = bubutLuarLinks.find((bl) => bl.revenueLineId === line.id)

            return (
              <Card key={line.id}>
                {/* Line header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
                    LINE {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                    {cat?.name ?? line.categoryId}
                    {line.itemName && (
                      <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> — {line.itemName}</span>
                    )}
                  </span>
                  {isJasa && <Badge label="JASA" color="var(--text)" bg="var(--surface-alt)" />}
                  {isBubutLuar && <Badge label="BUBUT LUAR" color="rgba(200,16,46,0.8)" bg="rgba(200,16,46,0.08)" />}
                  {!cat?.isActive && <Badge label="KATEGORI DIHAPUS" color="var(--text-muted)" bg="var(--surface-alt)" />}
                </div>

                {/* Line amounts grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isJasa ? 'repeat(3, 1fr)' : '1fr', gap: '8px 16px', marginBottom: isJasa && mechRows.length ? 14 : 0 }}>
                  <div>
                    <SectionLabel>NOMINAL</SectionLabel>
                    <CurrencyDisplay value={line.nominal} size="sm" />
                  </div>
                  {isJasa && (
                    <>
                      <div>
                        <SectionLabel>BIAYA MATERIAL</SectionLabel>
                        <CurrencyDisplay value={line.biayaMaterial} size="sm" />
                      </div>
                      <div>
                        <SectionLabel>BASIS KOMISI</SectionLabel>
                        <CurrencyDisplay value={basis} size="sm" />
                      </div>
                    </>
                  )}
                </div>

                {/* Jasa notes */}
                {!isJasa && line.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
                    {line.notes}
                  </div>
                )}

                {/* Mechanic chips */}
                {isJasa && mechRows.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {mechRows.map((row) => {
                      const mech = mechanics.find((m) => m.id === row.mechanicId)
                      return (
                        <div key={row.mechanicId} style={{
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
                              {mech?.name ?? row.mechanicId}
                            </span>
                            {!mech?.isActive && (
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

                {/* Bubut Luar info */}
                {isBubutLuar && lineLink && (
                  <div style={{
                    marginTop: 12, background: 'rgba(200,16,46,0.06)',
                    border: '1px solid rgba(200,16,46,0.2)', borderRadius: 7, padding: '10px 12px',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 16px', marginBottom: 10 }}>
                      <div>
                        <SectionLabel>BIAYA VENDOR</SectionLabel>
                        <CurrencyDisplay value={lineLink.vendorCost} size="sm" />
                      </div>
                      <div>
                        <SectionLabel>MARGIN</SectionLabel>
                        <span style={{ color: line.nominal >= lineLink.vendorCost ? 'var(--success)' : 'var(--accent)' }}>
                          <CurrencyDisplay value={Math.abs(line.nominal - lineLink.vendorCost)} size="sm" />
                          {line.nominal < lineLink.vendorCost && ' ⚠'}
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
                            {counterpartTx.noReferensi} →
                          </button>
                        </div>
                      )}
                    </div>
                    {counterpartTx && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                        Vendor: {suppliers.find((s) => s.id === counterpartTx.supplierId)?.name ?? '—'}
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
          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: komisiByMechanic.size > 0 ? 16 : 0 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
              TOTAL
            </span>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, lineHeight: 1 }}>
              {tx.totalNominal.toLocaleString('id-ID')}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', marginLeft: 4 }}>IDR</span>
            </span>
          </div>

          {/* Komisi breakdown */}
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

          {/* Period info */}
          {period && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <div>
                <SectionLabel>PERIODE KOMISI</SectionLabel>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {fmtTgl(period.weekStart, 'short')} – {fmtTgl(period.weekEnd, 'short')}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge
                  label={period.status === 'open' ? 'OPEN' : 'CLOSED'}
                  color={period.status === 'open' ? 'var(--success)' : 'var(--text-muted)'}
                  bg={period.status === 'open' ? 'rgba(16,185,129,0.1)' : 'var(--surface-alt)'}
                />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
                  {period.status === 'open'
                    ? 'Komisi akan masuk slip mingguan'
                    : 'Periode ditutup, komisi sudah dibayarkan'}
                </div>
              </div>
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

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={`Hapus transaksi ${tx.noReferensi}?`}
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
