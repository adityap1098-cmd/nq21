import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader, KpiCard, CurrencyDisplay } from '@/components/nq21'
import {
  useCommissionPeriods,
  useCommissionPayouts,
  usePeriodTransactions,
  useCommissionRates,
  computePayoutsFromRows,
} from '@/features/komisi/hooks'
import { useTransactions, useTransactionsWithLines, type TransactionRow } from '@/features/transactions/hooks'
import { useCustomers } from '@/features/customers/hooks'
import { useSuppliers } from '@/features/suppliers/hooks'
import { useAuthStore } from '@/store/auth'
import { getPeriodRange, getPrevPeriodRange } from '@/store/selectors'
import type { CommissionPeriod } from '@/store/types'
import { formatWeekRange, todayLocal } from '@/lib/format'
import { QueryErrorPanel, LoadingPanel } from './laporan/QueryState'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n)))
}

function fmtRpShort(n: number) {
  if (isNaN(n)) return '0'
  const a = Math.abs(n)
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt'
  if (a >= 1_000) return Math.round(n / 1_000) + 'rb'
  return String(Math.round(n))
}

function addDaysToStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Week-over-week % change. A zero or negative previous value has no meaningful
// percentage (division flips sign or explodes), so the delta is hidden.
function pctChange(cur: number, prev: number): number | undefined {
  if (prev <= 0) return undefined
  const pct = ((cur - prev) / prev) * 100
  return Number.isFinite(pct) ? pct : undefined
}

function kpiChange(delta: number | undefined): { value: string; up: boolean; context: string } | undefined {
  if (delta === undefined) return undefined
  const sign = delta >= 0 ? '+' : ''
  return { value: `${sign}${delta.toFixed(1)}%`, up: delta >= 0, context: 'vs minggu lalu' }
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

// "28 Apr – 4 Mei 2026" / "4–10 Mei 2026"
function fmtRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  if (sy === ey && sm === em) return `${sd}–${ed} ${MONTH_SHORT[em - 1]} ${ey}`
  if (sy === ey) return `${sd} ${MONTH_SHORT[sm - 1]} – ${ed} ${MONTH_SHORT[em - 1]} ${ey}`
  return `${sd} ${MONTH_SHORT[sm - 1]} ${sy} – ${ed} ${MONTH_SHORT[em - 1]} ${ey}`
}

type ChartRange = '7H' | '30H' | '90H'

const CHART_DAYS: Record<ChartRange, number> = { '7H': 7, '30H': 30, '90H': 91 }

// ── Chart data builders (using TransactionRow snake_case) ──────────────────────

type CashFlowDay = { day: string; date: string; in: number; out: number; today?: boolean }

function buildDaysData(txs: TransactionRow[], nDays: number, today: string): CashFlowDay[] {
  return Array.from({ length: nDays }, (_, i) => {
    const dateStr = addDaysToStr(today, -(nDays - 1 - i))
    const d = new Date(dateStr + 'T00:00:00')
    const dayTx = txs.filter(t => t.tgl === dateStr)
    return {
      day: String(d.getDate()),
      date: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
      in:  dayTx.filter(t => t.tipe === 'income' ).reduce((s, t) => s + t.total_nominal, 0),
      out: dayTx.filter(t => t.tipe === 'expense').reduce((s, t) => s + t.total_nominal, 0),
      today: dateStr === today || undefined,
    }
  })
}

function buildWeeksData(txs: TransactionRow[], nWeeks: number, today: string): CashFlowDay[] {
  return Array.from({ length: nWeeks }, (_, i) => {
    const wEnd   = addDaysToStr(today, -((nWeeks - 1 - i) * 7))
    const wStart = addDaysToStr(wEnd, -6)
    const weekTx = txs.filter(t => t.tgl >= wStart && t.tgl <= wEnd)
    const dS = new Date(wStart + 'T00:00:00')
    const dE = new Date(wEnd   + 'T00:00:00')
    return {
      day: `${MONTH_SHORT[dS.getMonth()]}${dS.getDate()}`,
      date: `${dS.getDate()}–${dE.getDate()} ${MONTH_SHORT[dE.getMonth()]}`,
      in:  weekTx.filter(t => t.tipe === 'income' ).reduce((s, t) => s + t.total_nominal, 0),
      out: weekTx.filter(t => t.tipe === 'expense').reduce((s, t) => s + t.total_nominal, 0),
    }
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CashFlowChart({ data, filter, onFilterChange, periodLabel }: {
  data: CashFlowDay[]
  filter: string
  onFilterChange: (f: '7H' | '30H' | '90H') => void
  periodLabel: string
}) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: '#0A0908', borderRadius: 6, padding: '10px 14px',
        fontSize: 12, color: '#fff',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, background: '#0A0908', border: '2px solid #fff', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>IN</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, marginLeft: 'auto' }}>
              Rp {fmtRp(payload[0]?.value ?? 0)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, background: '#C8102E', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>OUT</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, marginLeft: 'auto' }}>
              Rp {fmtRp(payload[1]?.value ?? 0)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>
            Cash Flow
          </h3>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
            {periodLabel} · IN VS OUT
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['7H', '30H', '90H'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onFilterChange(t)}
              style={{
                padding: '5px 10px', borderRadius: 6,
                border: '1px solid var(--border)',
                background: filter === t ? 'var(--text)' : 'transparent',
                color: filter === t ? '#fff' : 'var(--text-muted)',
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <XAxis
            dataKey="day"
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: '#8B857A', letterSpacing: 1 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={fmtRpShort}
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: '#8B857A' }}
            axisLine={false} tickLine={false} width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(10,9,8,0.04)' }} />
          <Bar dataKey="in" name="Masuk" fill="#0A0908" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.date} fill={entry.today ? '#1a1917' : '#0A0908'} />
            ))}
          </Bar>
          <Bar dataKey="out" name="Keluar" fill="#C8102E" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        {[{ color: '#0A0908', label: 'PEMASUKAN' }, { color: '#C8102E', label: 'PENGELUARAN' }].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, background: color, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ● HARI INI
        </div>
      </div>
    </div>
  )
}

function TopKategoriPanel({ items, subtitle, status }: {
  items: { name: string; amount: number; txCount: number; pct: number }[]
  subtitle: string
  status?: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>Top Kategori</h3>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
          {subtitle}
        </div>
      </div>
      {status ?? (items.length === 0 ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
          Belum ada pemasukan minggu ini.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((c, i) => (
            <div key={c.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', letterSpacing: '0.06em', minWidth: 22 }}>
                    0{i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{c.txCount} transaksi</div>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  Rp {fmtRp(c.amount)}
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--surface-alt)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${c.pct * 100}%`, background: i === 0 ? 'var(--accent)' : 'var(--text)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function RecentTxPanel({
  transactions,
  customerMap,
  supplierMap,
}: {
  transactions: TransactionRow[]
  customerMap: Record<string, string>
  supplierMap: Record<string, string>
}) {
  const navigate = useNavigate()
  const METODE: Record<string, string> = { cash: 'CASH', transfer: 'TRF', qris: 'QRIS' }
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 0' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>Transaksi Terbaru</h3>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
            {transactions.length} ENTRI TERBARU
          </div>
        </div>
        <button
          onClick={() => navigate('/transaksi')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}
        >
          LIHAT SEMUA →
        </button>
      </div>
      <table className="nq21-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th>NO REFERENSI</th>
            <th>CUSTOMER / SUPPLIER</th>
            <th>METODE</th>
            <th>TIPE</th>
            <th style={{ textAlign: 'right' }}>NOMINAL</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 11, padding: '24px 0' }}>
                Belum ada transaksi.
              </td>
            </tr>
          ) : transactions.map((t) => {
            const time = t.created_at.slice(11, 16)
            const partyName = t.tipe === 'income'
              ? customerMap[t.customer_id ?? ''] ?? '—'
              : supplierMap[t.supplier_id ?? ''] ?? '—'
            return (
              <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/transaksi/${t.id}`)}>
                <td>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{t.no_referensi}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{time}</div>
                </td>
                <td style={{ fontSize: 13.5 }}>{partyName}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {METODE[t.payment_method] ?? t.payment_method}
                </td>
                <td>
                  <Badge variant={t.tipe === 'income' ? 'income' : 'expense'}>
                    {t.tipe === 'income' ? 'MASUK' : 'KELUAR'}
                  </Badge>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: t.tipe === 'income' ? 'var(--success)' : 'var(--accent)' }}>
                  {t.tipe === 'income' ? '+' : '−'} Rp {fmtRp(t.total_nominal)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Commission (owner only) ───────────────────────────────────────────────────
// These components are mounted only for owners, so kasir never fetches
// commission periods, rates or period transactions.

const NO_PERIODS: CommissionPeriod[] = []

function useRunningKomisi() {
  const periodsQ = useCommissionPeriods()
  const ratesQ = useCommissionRates()
  const openPeriod = useMemo(
    () => periodsQ.data?.find(p => p.status === 'open'),
    [periodsQ.data],
  )
  const ptxQ = usePeriodTransactions(openPeriod?.weekStart, openPeriod?.weekEnd, { enabled: !!openPeriod })

  const mechKomisi = useMemo(() =>
    openPeriod && ptxQ.data && ratesQ.data
      ? computePayoutsFromRows(ptxQ.data, openPeriod.weekStart, openPeriod.weekEnd, ratesQ.data)
      : [],
    [openPeriod, ptxQ.data, ratesQ.data],
  )

  return {
    periods: periodsQ.data ?? NO_PERIODS,
    openPeriod,
    mechKomisi,
    totalKomisi: mechKomisi.reduce((s, m) => s + m.totalKomisi, 0),
    errors: [periodsQ.error, ratesQ.error, ptxQ.error].filter(e => e != null),
    isLoading: periodsQ.isLoading || ratesQ.isLoading || ptxQ.isLoading,
    retry: () => {
      void periodsQ.refetch()
      void ratesQ.refetch()
      if (openPeriod) void ptxQ.refetch()
    },
  }
}

const kpiNoteStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'normal', lineHeight: 1.4,
}

function KomisiKpiCard() {
  const k = useRunningKomisi()

  let value: React.ReactNode
  let change: { value: string; context?: string } | undefined
  if (k.errors.length > 0) {
    value = <span style={{ ...kpiNoteStyle, color: 'var(--accent)' }}>Gagal memuat — cek koneksi lalu muat ulang</span>
  } else if (k.isLoading) {
    value = <span style={{ ...kpiNoteStyle, color: 'var(--text-muted)' }}>Memuat...</span>
  } else if (!k.openPeriod) {
    value = <span style={{ ...kpiNoteStyle, color: 'var(--text-muted)' }}>Belum ada periode aktif</span>
  } else {
    value = <CurrencyDisplay value={k.totalKomisi} size="lg" />
    change = {
      value: `${k.mechKomisi.length} mekanik`,
      context: fmtRange(k.openPeriod.weekStart, k.openPeriod.weekEnd),
    }
  }

  return (
    <KpiCard
      label="Komisi Berjalan · Periode Aktif"
      value={value}
      change={change}
      icon={<Wrench size={14} />}
      accent
    />
  )
}

function PeriodKomisiPanel() {
  const k = useRunningKomisi()
  const payoutsQ = useCommissionPayouts()
  const allPayouts = payoutsQ.data ?? []
  const errors = [...k.errors, payoutsQ.error].filter(e => e != null)
  const isLoading = k.isLoading || payoutsQ.isLoading

  const recentPeriods = useMemo(() =>
    [...k.periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 2),
    [k.periods],
  )

  function renderBody() {
    if (errors.length > 0) {
      return <QueryErrorPanel compact errors={errors} onRetry={() => { k.retry(); void payoutsQ.refetch() }} />
    }
    if (isLoading) {
      return <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>Memuat...</div>
    }
    return (
      <>
        {recentPeriods.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            Belum ada periode aktif.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPeriods.map((p) => {
              const isRunning = p.id === k.openPeriod?.id
              const periodPayouts = allPayouts.filter(po => po.periodId === p.id)
              const periodKomisi = isRunning
                ? k.totalKomisi
                : periodPayouts.reduce((s, po) => s + po.totalKomisi, 0)
              const mechanicCount = isRunning
                ? k.mechKomisi.length
                : new Set(periodPayouts.map(po => po.mechanicId)).size
              return (
                <div key={p.id} style={{
                  border: `1px solid ${p.status === 'open' ? 'var(--border-strong)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '14px 16px',
                  background: p.status === 'open' ? 'var(--surface-alt)' : 'transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em' }}>
                      {formatWeekRange(p.weekStart, p.weekEnd)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Badge variant={p.status === 'open' ? 'open' : 'closed'}>
                        {p.status === 'open' ? 'AKTIF' : 'CLOSED'}
                      </Badge>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {mechanicCount} mekanik
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--text)' }}>
                      Rp {fmtRp(periodKomisi)}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                      {p.status === 'open' ? 'BERJALAN' : 'TOTAL KOMISI'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            KOMISI BERJALAN — PER MEKANIK
          </div>
          {!k.openPeriod ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              Belum ada periode aktif.
            </div>
          ) : k.mechKomisi.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              Belum ada jasa periode ini.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {k.mechKomisi.map((m) => (
                <div key={m.mechanicId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--text)', flexShrink: 0 }}>
                    {m.mechanicName[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{m.mechanicName.split(' ')[0]}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--success)', fontWeight: 600 }}>
                      Rp {fmtRp(m.totalKomisi)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>Periode Komisi</h3>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
          SENIN — MINGGU
        </div>
      </div>
      {renderBody()}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const NO_TXS: TransactionRow[] = []

function sumByTipe(txs: TransactionRow[], start: string, end: string) {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.tgl < start || t.tgl > end) continue
    if (t.tipe === 'income') income += t.total_nominal
    else expense += t.total_nominal
  }
  return { income, expense, laba: income - expense }
}

export default function Dashboard() {
  const isOwner = useAuthStore(s => s.user?.role) === 'owner'
  const today = todayLocal()
  // KPIs use the calendar week (Senin–Minggu), independent of commission periods.
  const week = useMemo(() => getPeriodRange('minggu-ini'), [today])
  const prevWeek = useMemo(() => getPrevPeriodRange(week), [week])
  const from90 = useMemo(() => addDaysToStr(today, -(CHART_DAYS['90H'] - 1)), [today])

  const txQ         = useTransactions({ dateFrom: from90 })
  const weekIncomeQ = useTransactionsWithLines({ tipe: 'income', dateFrom: week.start, dateTo: week.end })
  const customersQ  = useCustomers(true)
  const suppliersQ  = useSuppliers(true)
  const allTxs = txQ.data ?? NO_TXS

  // ── KPI: pendapatan / pengeluaran / laba (this week vs last week) ─────────

  const kpiStats = useMemo(() => sumByTipe(allTxs, week.start, week.end), [allTxs, week])
  const kpiDeltas = useMemo(() => {
    const prev = sumByTipe(allTxs, prevWeek.start, prevWeek.end)
    return {
      pendapatan:  pctChange(kpiStats.income,  prev.income),
      pengeluaran: pctChange(kpiStats.expense, prev.expense),
      labaKotor:   pctChange(kpiStats.laba,    prev.laba),
    }
  }, [allTxs, prevWeek, kpiStats])

  // ── Top Kategori (income lines this week) ─────────────────────────────────

  const topKategori = useMemo(() => {
    const katMap: Record<string, { name: string; amount: number; txIds: Set<string> }> = {}
    for (const tx of weekIncomeQ.data ?? []) {
      for (const line of tx.transaction_lines) {
        const cat = line.categories
        if (!cat) continue
        if (!katMap[cat.id]) katMap[cat.id] = { name: cat.name, amount: 0, txIds: new Set() }
        katMap[cat.id].amount += line.nominal
        katMap[cat.id].txIds.add(tx.id)
      }
    }
    const sorted = Object.values(katMap)
      .map(k => ({ name: k.name, amount: k.amount, txCount: k.txIds.size }))
      .sort((a, b) => b.amount - a.amount)
    const maxAmt = sorted[0]?.amount || 1
    return sorted.slice(0, 6).map(k => ({ ...k, pct: k.amount / maxAmt }))
  }, [weekIncomeQ.data])

  // ── Party maps for recent transactions ────────────────────────────────────

  const customerMap = useMemo(() =>
    Object.fromEntries((customersQ.data ?? []).map(c => [c.id, c.motor_type ? `${c.name} (${c.motor_type})` : c.name])),
    [customersQ.data]
  )
  const supplierMap = useMemo(() =>
    Object.fromEntries((suppliersQ.data ?? []).map(s => [s.id, s.name])),
    [suppliersQ.data]
  )

  const recentTxs = useMemo(() =>
    [...allTxs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [allTxs]
  )

  // ── Chart data ─────────────────────────────────────────────────────────────

  const [chartFilter, setChartFilter] = useState<ChartRange>('7H')
  const chartData = useMemo(() =>
    chartFilter === '90H'
      ? buildWeeksData(allTxs, 13, today)
      : buildDaysData(allTxs, CHART_DAYS[chartFilter], today),
    [chartFilter, allTxs, today]
  )
  const chartStart = addDaysToStr(today, -(CHART_DAYS[chartFilter] - 1))
  const chartLabel = chartFilter === '90H'
    ? `90 HARI TERAKHIR · PER MINGGU · ${fmtRange(chartStart, today)}`
    : `${CHART_DAYS[chartFilter]} HARI TERAKHIR · ${fmtRange(chartStart, today)}`

  // ── Render ─────────────────────────────────────────────────────────────────

  const periodSubtitle = `Snapshot bisnis minggu ini · ${fmtRange(week.start, week.end)}`

  if (txQ.isError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <PageHeader title="Dashboard Owner" subtitle={periodSubtitle} />
        <QueryErrorPanel errors={[txQ.error]} onRetry={() => void txQ.refetch()} />
      </div>
    )
  }

  if (txQ.isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <PageHeader title="Dashboard Owner" subtitle={periodSubtitle} />
        <LoadingPanel />
      </div>
    )
  }

  const partyErrors = [customersQ.error, suppliersQ.error].filter(e => e != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader title="Dashboard Owner" subtitle={periodSubtitle} />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isOwner ? 4 : 3}, 1fr)`, gap: 16 }}>
        <KpiCard
          label="Pendapatan Minggu Ini"
          value={<CurrencyDisplay value={kpiStats.income} size="lg" />}
          change={kpiChange(kpiDeltas.pendapatan)}
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Pengeluaran Minggu Ini"
          value={<CurrencyDisplay value={kpiStats.expense} size="lg" />}
          change={kpiChange(kpiDeltas.pengeluaran)}
          icon={<TrendingDown size={14} />}
        />
        <KpiCard
          label="Laba Kotor Minggu Ini"
          value={<CurrencyDisplay value={kpiStats.laba} size="lg" />}
          change={kpiChange(kpiDeltas.labaKotor)}
          icon={<DollarSign size={14} />}
        />
        {isOwner && <KomisiKpiCard />}
      </div>

      {/* Chart + Top Kategori */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <CashFlowChart
          data={chartData}
          filter={chartFilter}
          onFilterChange={setChartFilter}
          periodLabel={chartLabel}
        />
        <TopKategoriPanel
          items={topKategori}
          subtitle={`Pemasukan · ${fmtRange(week.start, week.end)}`}
          status={
            weekIncomeQ.isError
              ? <QueryErrorPanel compact errors={[weekIncomeQ.error]} onRetry={() => void weekIncomeQ.refetch()} />
              : weekIncomeQ.isLoading
                ? <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Memuat...</div>
                : undefined
          }
        />
      </div>

      {/* Recent Tx + Period Komisi */}
      <div style={{ display: 'grid', gridTemplateColumns: isOwner ? '3fr 2fr' : '1fr', gap: 16 }}>
        {partyErrors.length > 0 ? (
          <QueryErrorPanel
            errors={partyErrors}
            onRetry={() => { void customersQ.refetch(); void suppliersQ.refetch() }}
          />
        ) : (
          <RecentTxPanel
            transactions={recentTxs}
            customerMap={customerMap}
            supplierMap={supplierMap}
          />
        )}

        {isOwner && <PeriodKomisiPanel />}
      </div>
    </div>
  )
}
