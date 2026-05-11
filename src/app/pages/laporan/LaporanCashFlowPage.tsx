import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactionStore } from '@/store/transactions'
import { useCustomerStore } from '@/store/master/customers'
import { useSupplierStore } from '@/store/master/suppliers'
import { useCategoryStore } from '@/store/master/categories'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelector } from '@/components/nq21/PeriodSelector'
import { FilterPillGroup } from '@/components/nq21/FilterPillGroup'
import { exportCSV, fmtRupiah, fmtDate } from '@/lib/csv'
import { usePeriodFilter } from '@/lib/hooks/usePeriodFilter'

const _fmt = new Intl.NumberFormat('id-ID')
const fmtRp = (n: number) => `Rp ${_fmt.format(n)}`

type TipeFilter = 'all' | 'income' | 'expense'
type MetodeFilter = 'all' | 'cash' | 'transfer' | 'qris'

const TIPE_OPTIONS = [
  { label: 'Semua', value: 'all' },
  { label: 'Pemasukan', value: 'income' },
  { label: 'Pengeluaran', value: 'expense' },
]

const METODE_OPTIONS = [
  { label: 'Semua', value: 'all' },
  { label: 'Cash', value: 'cash' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'QRIS', value: 'qris' },
]

const METODE_LABEL: Record<string, string> = {
  cash: 'CASH',
  transfer: 'TF',
  qris: 'QRIS',
}

const PAGE_SIZE = 50

function csvDateSlug(dateStr: string): string {
  const MONTHS = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des']
  const [y, m, d] = dateStr.split('-')
  return `${d}${MONTHS[parseInt(m) - 1]}${y}`
}

function fmtShortDate(iso: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const [, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`
}

function fmtTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface TableRow {
  id: string
  noReferensi: string
  tglTransaksi: string
  createdAt: string
  tipe: 'income' | 'expense'
  customerId?: string
  supplierId?: string
  paymentMethod: string
  totalNominal: number
  delta: number
  saldoRunning: number
  categoryNames: string[]
}

// ── Method badge ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    cash:     { bg: 'rgba(22,163,74,0.12)',  color: '#16a34a' },
    transfer: { bg: 'rgba(37,99,235,0.12)',  color: '#2563eb' },
    qris:     { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed' },
  }
  const style = colors[method] ?? { bg: 'var(--surface-alt)', color: 'var(--text-muted)' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 4,
        fontSize: 10,
        fontFamily: 'var(--mono)',
        fontWeight: 700,
        letterSpacing: '0.06em',
        background: style.bg,
        color: style.color,
      }}
    >
      {METODE_LABEL[method] ?? method.toUpperCase()}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LaporanCashFlowPage() {
  const navigate = useNavigate()
  const { transactions, lines } = useTransactionStore()
  const { customers } = useCustomerStore()
  const { suppliers } = useSupplierStore()
  const { categories } = useCategoryStore()

  const { preset, range, setPreset } = usePeriodFilter('week')
  const [tipeFilter, setTipeFilter] = useState<TipeFilter>('all')
  const [metodeFilter, setMetodeFilter] = useState<MetodeFilter>('all')
  const [page, setPage] = useState(1)

  // Reset page on filter/period change
  const resetPage = () => setPage(1)

  const customerMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c.name])),
    [customers],
  )
  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  )
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  )
  const linesByCat = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const l of lines) {
      if (!m[l.transactionId]) m[l.transactionId] = []
      const name = categoryMap[l.categoryId]
      if (name && !m[l.transactionId].includes(name)) m[l.transactionId].push(name)
    }
    return m
  }, [lines, categoryMap])

  // Base filtered list (period + tipe + metode), ascending for saldo
  const filteredTx = useMemo(() => {
    let result = transactions.filter(
      (t) =>
        !t.deletedAt &&
        t.tglTransaksi >= range.start &&
        t.tglTransaksi <= range.end,
    )
    if (tipeFilter !== 'all') result = result.filter((t) => t.tipe === tipeFilter)
    if (metodeFilter !== 'all') result = result.filter((t) => t.paymentMethod === metodeFilter)
    return result.sort((a, b) => {
      const dateCmp = a.tglTransaksi.localeCompare(b.tglTransaksi)
      return dateCmp !== 0 ? dateCmp : a.createdAt.localeCompare(b.createdAt)
    })
  }, [transactions, range, tipeFilter, metodeFilter])

  // Saldo running computed over full filtered set
  const tableData = useMemo<TableRow[]>(() => {
    let saldo = 0
    return filteredTx.map((t) => {
      const delta = t.tipe === 'income' ? t.totalNominal : -t.totalNominal
      saldo += delta
      return {
        id: t.id,
        noReferensi: t.noReferensi,
        tglTransaksi: t.tglTransaksi,
        createdAt: t.createdAt,
        tipe: t.tipe,
        customerId: t.customerId,
        supplierId: t.supplierId,
        paymentMethod: t.paymentMethod,
        totalNominal: t.totalNominal,
        delta,
        saldoRunning: saldo,
        categoryNames: linesByCat[t.id] ?? [],
      }
    })
  }, [filteredTx, linesByCat])

  const summary = useMemo(() => {
    const totalMasuk = filteredTx
      .filter((t) => t.tipe === 'income')
      .reduce((s, t) => s + t.totalNominal, 0)
    const totalKeluar = filteredTx
      .filter((t) => t.tipe === 'expense')
      .reduce((s, t) => s + t.totalNominal, 0)
    const saldoBersih = tableData.length > 0 ? tableData[tableData.length - 1].saldoRunning : 0
    return { totalMasuk, totalKeluar, saldoBersih, countMasuk: filteredTx.filter((t) => t.tipe === 'income').length, countKeluar: filteredTx.filter((t) => t.tipe === 'expense').length }
  }, [filteredTx, tableData])

  const totalPages = Math.ceil(tableData.length / PAGE_SIZE)
  const pagedData = tableData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = tipeFilter !== 'all' || metodeFilter !== 'all'

  function handleExport() {
    type ExRow = { tgl: string; jam: string; noRef: string; party: string; kategori: string; tipe: string; metode: string; nominal: string; delta: string; saldo: string }
    const rows: ExRow[] = tableData.map((r) => ({
      tgl: r.tglTransaksi,
      jam: fmtTime(r.createdAt),
      noRef: r.noReferensi,
      party: r.customerId ? (customerMap[r.customerId] ?? '—') : r.supplierId ? (supplierMap[r.supplierId] ?? '—') : '—',
      kategori: r.categoryNames.join(', '),
      tipe: r.tipe === 'income' ? 'MASUK' : 'KELUAR',
      metode: r.paymentMethod.toUpperCase(),
      nominal: fmtRupiah(r.totalNominal),
      delta: (r.delta >= 0 ? '+' : '') + fmtRupiah(r.delta),
      saldo: fmtRupiah(r.saldoRunning),
    }))
    exportCSV(
      rows,
      [
        { key: 'tgl',      label: 'Tanggal' },
        { key: 'jam',      label: 'Jam' },
        { key: 'noRef',    label: 'No Referensi' },
        { key: 'party',    label: 'Customer / Supplier' },
        { key: 'kategori', label: 'Kategori' },
        { key: 'tipe',     label: 'Tipe' },
        { key: 'metode',   label: 'Metode' },
        { key: 'nominal',  label: 'Nominal (Rp)' },
        { key: 'delta',    label: 'Delta' },
        { key: 'saldo',    label: 'Saldo Berjalan' },
      ],
      `nq21-laporan-cashflow-${csvDateSlug(range.start)}-${csvDateSlug(range.end)}`,
    )
  }

  const saldoPositif = summary.saldoBersih >= 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>
      {/* Header */}
      <PageHeader
        title="Cash Flow"
        subtitle={`LAPORAN #2 · Aliran kas kronologis dengan saldo berjalan · ${fmtDate(range.start)} – ${fmtDate(range.end)}`}
        action={
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            ↓ EXPORT CSV
          </button>
        }
      />

      {/* Period filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          PERIODE
        </span>
        <PeriodSelector
          value={preset}
          onChange={(v) => { setPreset(v as typeof preset); resetPage() }}
        />
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
          {fmtDate(range.start)} → {fmtDate(range.end)}
        </span>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TIPE</span>
          <FilterPillGroup
            options={TIPE_OPTIONS}
            value={tipeFilter}
            onChange={(v) => { setTipeFilter(v as TipeFilter); resetPage() }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>METODE</span>
          <FilterPillGroup
            options={METODE_OPTIONS}
            value={metodeFilter}
            onChange={(v) => { setMetodeFilter(v as MetodeFilter); resetPage() }}
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setTipeFilter('all'); setMetodeFilter('all'); resetPage() }}
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--text-muted)',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 5,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            ↺ Reset Filter
          </button>
        )}
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Total Masuk */}
        <div
          style={{
            background: 'rgba(22,163,74,0.06)',
            border: '1px solid rgba(22,163,74,0.2)',
            borderRadius: 8,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.12em', color: '#16a34a', marginBottom: 6 }}>
            TOTAL MASUK
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: '#16a34a' }}>
            {fmtRp(summary.totalMasuk)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {summary.countMasuk} transaksi
          </div>
        </div>

        {/* Total Keluar */}
        <div
          style={{
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 8,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: 6 }}>
            TOTAL KELUAR
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--accent)' }}>
            {fmtRp(summary.totalKeluar)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {summary.countKeluar} transaksi
          </div>
        </div>

        {/* Saldo Bersih */}
        <div
          style={{
            background: saldoPositif ? 'var(--text)' : 'rgba(220,38,38,0.08)',
            border: saldoPositif ? 'none' : '1px solid rgba(220,38,38,0.3)',
            borderRadius: 8,
            padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.12em', color: saldoPositif ? 'rgba(255,255,255,0.55)' : 'var(--accent)', marginBottom: 6 }}>
            SALDO BERSIH
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 28, color: saldoPositif ? '#4ade80' : 'var(--accent)' }}>
            {saldoPositif ? '' : '−'}{fmtRp(Math.abs(summary.saldoBersih))}
          </div>
          <div style={{ fontSize: 11, color: saldoPositif ? 'rgba(255,255,255,0.5)' : 'var(--accent)', marginTop: 4 }}>
            {saldoPositif ? '▲ Surplus' : '▼ Defisit'} periode ini
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '0.04em' }}>
            RINCIAN KRONOLOGIS
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--surface-alt)',
              fontSize: 10,
              fontFamily: 'var(--mono)',
              color: 'var(--text-muted)',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            {tableData.length} ENTRI
          </span>
        </div>

        {tableData.length === 0 ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>💸</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
              {hasFilters ? 'Tidak Ada Transaksi' : 'Belum Ada Cash Flow'}
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              {hasFilters
                ? 'Tidak ada transaksi yang cocok dengan filter.'
                : 'Belum ada cash flow di periode ini.'}
            </div>
            {hasFilters ? (
              <button
                onClick={() => { setTipeFilter('all'); setMetodeFilter('all') }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'var(--mono)',
                }}
              >
                ↺ Reset Filter
              </button>
            ) : (
              <button
                onClick={() => navigate('/transaksi/baru')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                }}
              >
                + Input Transaksi
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {(['TGL', 'JAM', 'NO REFERENSI', 'PARTY', 'KATEGORI', 'METODE', 'NOMINAL', 'SALDO'] as const).map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: h === 'TGL' ? '10px 12px 10px 20px' : h === 'SALDO' ? '10px 20px 10px 12px' : '10px 12px',
                          textAlign: ['NOMINAL', 'SALDO'].includes(h) ? 'right' : 'left',
                          fontFamily: 'var(--mono)',
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((row) => {
                    const partyName = row.customerId
                      ? (customerMap[row.customerId] ?? '—')
                      : row.supplierId
                      ? (supplierMap[row.supplierId] ?? '—')
                      : '—'
                    const isIncome = row.tipe === 'income'
                    const saldoNeg = row.saldoRunning < 0
                    const cats = row.categoryNames
                    return (
                      <tr
                        key={row.id}
                        onClick={() => navigate(`/transaksi/${row.id}`)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          borderLeft: `3px solid ${isIncome ? '#16a34a' : 'var(--accent)'}`,
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        {/* TGL */}
                        <td style={{ padding: '11px 12px 11px 20px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtShortDate(row.tglTransaksi)}</div>
                        </td>
                        {/* JAM */}
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                            {fmtTime(row.createdAt)}
                          </div>
                        </td>
                        {/* NO REFERENSI */}
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--text)',
                            }}
                          >
                            {row.noReferensi}
                          </span>
                        </td>
                        {/* PARTY */}
                        <td style={{ padding: '11px 12px', maxWidth: 160 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, fontSize: 12.5 }}>
                            {partyName}
                          </div>
                        </td>
                        {/* KATEGORI */}
                        <td style={{ padding: '11px 12px' }}>
                          {cats.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-secondary, var(--text-muted))' }}>
                              {cats[0]}{cats.length > 1 && (
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
                                  +{cats.length - 1}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        {/* METODE */}
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <MethodBadge method={row.paymentMethod} />
                        </td>
                        {/* NOMINAL */}
                        <td style={{ padding: '11px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: 12,
                              fontWeight: 700,
                              color: isIncome ? '#16a34a' : 'var(--accent)',
                            }}
                          >
                            {isIncome ? '+' : '−'} {fmtRp(row.totalNominal)}
                          </span>
                        </td>
                        {/* SALDO */}
                        <td style={{ padding: '11px 20px 11px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: 12,
                              fontWeight: saldoNeg ? 700 : 500,
                              color: saldoNeg ? 'var(--accent)' : 'var(--text)',
                            }}
                          >
                            {saldoNeg ? '−' : ''}{fmtRp(Math.abs(row.saldoRunning))}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tableData.length)} dari {tableData.length} entri
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    style={{
                      padding: '5px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      background: 'var(--surface)',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.4 : 1,
                      fontSize: 12,
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    style={{
                      padding: '5px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      background: 'var(--surface)',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.4 : 1,
                      fontSize: 12,
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Saldo negative warning */}
      {!saldoPositif && tableData.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 16px',
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⚠</span>
          <span>Saldo bersih negatif di periode ini. Total pengeluaran melebihi pemasukan sebesar {fmtRp(Math.abs(summary.saldoBersih))}.</span>
        </div>
      )}
    </div>
  )
}
