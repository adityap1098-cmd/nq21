import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns'
import { PageHeader } from '@/components/nq21/PageHeader'
import { FilterPillGroup } from '@/components/nq21/FilterPillGroup'
import { CurrencyDisplay } from '@/components/nq21/CurrencyDisplay'
import { DateDisplay } from '@/components/nq21/DateDisplay'
import { EmptyState } from '@/components/nq21/EmptyState'
import { useTransactions, type TransactionRow } from '@/features/transactions/hooks'
import { useCustomers } from '@/features/customers/hooks'
import { useSuppliers } from '@/features/suppliers/hooks'

const PAGE_SIZE = 20

type PeriodFilter = 'today' | 'week' | 'month' | 'all'
type TipeFilter = 'all' | 'income' | 'expense'
type SortKey = 'no_referensi' | 'tgl_transaksi' | 'tipe' | 'party' | 'payment_method' | 'total_nominal'
type SortDir = 'asc' | 'desc'

function getInterval(period: PeriodFilter): { start: Date; end: Date } | null {
  const now = new Date()
  if (period === 'today')  return { start: startOfDay(now),   end: endOfDay(now) }
  if (period === 'week')   return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
  if (period === 'month')  return { start: startOfMonth(now), end: endOfMonth(now) }
  return null
}

const TIPE_OPTIONS = [
  { label: 'Semua', value: 'all' },
  { label: 'Masuk',  value: 'income' },
  { label: 'Keluar', value: 'expense' },
]

const PERIOD_OPTIONS = [
  { label: 'Hari Ini',    value: 'today' },
  { label: 'Minggu Ini',  value: 'week' },
  { label: 'Bulan Ini',   value: 'month' },
  { label: 'Semua',       value: 'all' },
]

function TipeBadge({ tipe }: { tipe: TransactionRow['tipe'] }) {
  const isIncome = tipe === 'income'
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.1em', padding: '3px 7px', borderRadius: 4,
      background: isIncome ? 'rgba(16,185,129,0.12)' : 'rgba(200,16,46,0.12)',
      color: isIncome ? 'var(--success)' : 'var(--accent)',
      border: `1px solid ${isIncome ? 'rgba(16,185,129,0.3)' : 'rgba(200,16,46,0.3)'}`,
    }}>
      {isIncome ? 'MASUK' : 'KELUAR'}
    </span>
  )
}

function PaymentBadge({ method }: { method: TransactionRow['payment_method'] }) {
  const labels: Record<TransactionRow['payment_method'], string> = {
    cash: 'Cash', transfer: 'Transfer', qris: 'QRIS',
  }
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
      letterSpacing: '0.08em', padding: '2px 6px', borderRadius: 3,
      background: 'var(--surface-alt)', color: 'var(--text-secondary)',
    }}>
      {labels[method]}
    </span>
  )
}

function SummaryStrip({ filtered }: { filtered: TransactionRow[] }) {
  const income  = filtered.filter(t => t.tipe === 'income').reduce((s, t) => s + t.total_nominal, 0)
  const expense = filtered.filter(t => t.tipe === 'expense').reduce((s, t) => s + t.total_nominal, 0)
  const net = income - expense

  const cards = [
    { label: 'PEMASUKAN', value: income, color: 'var(--success)' },
    { label: 'PENGELUARAN', value: expense, color: 'var(--accent)' },
    { label: 'NET', value: net, color: net >= 0 ? 'var(--success)' : 'var(--accent)' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
      {cards.map(({ label, value, color }) => (
        <div key={label} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em',
            color: 'var(--text-muted)', marginBottom: 6,
          }}>
            {label}
          </div>
          <span style={{ color }}>
            <CurrencyDisplay value={Math.abs(value)} size="md" />
            {label === 'NET' && value < 0 && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, marginLeft: 4, color: 'var(--accent)' }}>−</span>
            )}
          </span>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
            {label === 'NET'
              ? `${filtered.length} total`
              : `${filtered.filter(t => t.tipe === (label === 'PEMASUKAN' ? 'income' : 'expense')).length} transaksi`
            }
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DaftarTransaksiPage() {
  const navigate = useNavigate()
  const { data: transactions = [], isLoading } = useTransactions({ includeDeleted: false })
  const { data: customers = [] } = useCustomers()
  const { data: suppliers = [] } = useSuppliers()

  const [search, setSearch]   = useState('')
  const [tipe, setTipe]       = useState<TipeFilter>('all')
  const [period, setPeriod]   = useState<PeriodFilter>('week')
  const [page, setPage]       = useState(1)
  const [sortBy, setSortBy]   = useState<SortKey>('tgl_transaksi')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    const interval = getInterval(period)
    const q = search.trim().toLowerCase()

    return transactions.filter(t => {
      if (tipe !== 'all' && t.tipe !== tipe) return false

      if (interval) {
        const d = parseISO(t.tgl_transaksi + 'T00:00:00')
        if (!isWithinInterval(d, interval)) return false
      }

      if (q) {
        const noRef = t.no_referensi.toLowerCase()
        const party = t.tipe === 'income'
          ? (customers.find(c => c.id === t.customer_id)?.name ?? '').toLowerCase()
          : (suppliers.find(s => s.id === t.supplier_id)?.name ?? '').toLowerCase()
        if (!noRef.includes(q) && !party.includes(q)) return false
      }

      return true
    })
  }, [transactions, tipe, period, search, customers, suppliers])

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp: number
      if (sortBy === 'party') {
        const aName = (a.tipe === 'income'
          ? (customers.find((c) => c.id === a.customer_id)?.name ?? '')
          : (suppliers.find((s) => s.id === a.supplier_id)?.name ?? '')).toLowerCase()
        const bName = (b.tipe === 'income'
          ? (customers.find((c) => c.id === b.customer_id)?.name ?? '')
          : (suppliers.find((s) => s.id === b.supplier_id)?.name ?? '')).toLowerCase()
        cmp = aName < bName ? -1 : aName > bName ? 1 : 0
      } else if (sortBy === 'total_nominal') {
        cmp = a.total_nominal - b.total_nominal
      } else {
        const aVal = a[sortBy as 'no_referensi' | 'tgl_transaksi' | 'tipe' | 'payment_method']
        const bVal = b[sortBy as 'no_referensi' | 'tgl_transaksi' | 'tipe' | 'payment_method']
        cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortBy, sortDir, customers, suppliers])

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageSlice  = sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(1)
  }
  function handleTipeChange(val: string) {
    setTipe(val as TipeFilter)
    setPage(1)
  }
  function handlePeriodChange(val: string) {
    setPeriod(val as PeriodFilter)
    setPage(1)
  }

  const colStyle: CSSProperties = {
    padding: '10px 14px', fontSize: 12,
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  }
  const headStyle: CSSProperties = {
    ...colStyle,
    fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.14em', color: 'var(--text-muted)',
    background: 'var(--surface-alt)',
    textTransform: 'uppercase',
  }

  return (
    <>
      <PageHeader
        title="DAFTAR TRANSAKSI"
        subtitle={isLoading ? 'Memuat...' : `${transactions.length} total transaksi tersimpan`}
        action={
          <button
            onClick={() => navigate('/transaksi/baru')}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', padding: '8px 16px',
              borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              cursor: 'pointer',
            }}
          >
            + INPUT BARU
          </button>
        }
      />

      {/* ── Filter bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        marginBottom: 20,
      }}>
        <input
          type="text"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Cari no. referensi atau nama..."
          style={{
            fontFamily: 'var(--mono)', fontSize: 12,
            padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            width: 240, outline: 'none',
          }}
        />
        <FilterPillGroup options={TIPE_OPTIONS}   value={tipe}   onChange={handleTipeChange} />
        <FilterPillGroup options={PERIOD_OPTIONS} value={period} onChange={handlePeriodChange} />
        {filtered.length > 0 && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} hasil
          </span>
        )}
      </div>

      {/* ── Summary strip ── */}
      <SummaryStrip filtered={filtered} />

      {/* ── Loading state ── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          Memuat transaksi...
        </div>
      )}

      {/* ── Table ── */}
      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          message={search || tipe !== 'all' || period !== 'all'
            ? 'Tidak ada transaksi yang cocok dengan filter ini.'
            : 'Belum ada transaksi. Mulai dengan input transaksi baru.'}
          action={
            <button
              onClick={() => navigate('/transaksi/baru')}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', padding: '8px 16px',
                borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff',
                cursor: 'pointer',
              }}
            >
              Input Transaksi Baru
            </button>
          }
        />
      ) : !isLoading && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {(
                  [
                    { label: 'NO. REFERENSI', col: 'no_referensi' as SortKey, align: 'left' },
                    { label: 'TANGGAL',       col: 'tgl_transaksi' as SortKey, align: 'left' },
                    { label: 'TIPE',          col: 'tipe' as SortKey, align: 'center' },
                    { label: 'CUSTOMER / SUPPLIER', col: 'party' as SortKey, align: 'left' },
                    { label: 'METODE',        col: 'payment_method' as SortKey, align: 'center' },
                    { label: 'TOTAL',         col: 'total_nominal' as SortKey, align: 'right' },
                  ] as const
                ).map(({ label, col, align }) => {
                  const isActive = sortBy === col
                  return (
                    <th
                      key={col}
                      style={{ ...headStyle, textAlign: align as CSSProperties['textAlign'], cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort(col)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {label}
                        {isActive && (
                          <span style={{ color: 'var(--accent)', fontSize: 7, lineHeight: 1 }}>
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
                <th style={{ ...headStyle, width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {pageSlice.map(tx => {
                const partyName = tx.tipe === 'income'
                  ? (customers.find(c => c.id === tx.customer_id)?.name ?? '—')
                  : (suppliers.find(s => s.id === tx.supplier_id)?.name ?? '—')

                return (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/transaksi/${tx.id}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={colStyle}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>
                        {tx.no_referensi}
                      </span>
                    </td>
                    <td style={colStyle}>
                      <DateDisplay value={tx.tgl_transaksi + 'T00:00:00'} format="short" />
                    </td>
                    <td style={{ ...colStyle, textAlign: 'center' }}>
                      <TipeBadge tipe={tx.tipe} />
                    </td>
                    <td style={colStyle}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {partyName}
                      </span>
                    </td>
                    <td style={{ ...colStyle, textAlign: 'center' }}>
                      <PaymentBadge method={tx.payment_method} />
                    </td>
                    <td style={{ ...colStyle, textAlign: 'right' }}>
                      <CurrencyDisplay value={tx.total_nominal} size="sm" />
                    </td>
                    <td style={{ ...colStyle, textAlign: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/transaksi/${tx.id}`) }}
                        style={{
                          fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                          letterSpacing: '0.06em', padding: '4px 8px',
                          borderRadius: 4, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        DETAIL
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderTop: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                Halaman {safePage} / {totalPages} · {filtered.length} transaksi
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1
                  const isActivePage = p === safePage
                  if (totalPages > 7 && Math.abs(p - safePage) > 2 && p !== 1 && p !== totalPages) {
                    if (p === safePage - 3 || p === safePage + 3) return <span key={p} style={{ color: 'var(--text-muted)', padding: '0 2px' }}>…</span>
                    return null
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                        width: 28, height: 28, borderRadius: 4,
                        border: `1px solid ${isActivePage ? 'var(--text)' : 'var(--border)'}`,
                        background: isActivePage ? 'var(--text)' : 'transparent',
                        color: isActivePage ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
