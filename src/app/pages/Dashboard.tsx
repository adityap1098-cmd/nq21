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
import { useTransactions, type TransactionRow } from '@/features/transactions/hooks'
import { useCustomers } from '@/features/customers/hooks'
import { useSuppliers } from '@/features/suppliers/hooks'
import { useMechanics } from '@/features/mechanics/hooks'
import type { CommissionPeriod } from '@/store/types'
import { formatWeekRange } from '@/lib/format'

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

function kpiChange(delta: number | undefined): { value: string; up: boolean; context: string } | undefined {
  if (delta === undefined) return undefined
  const sign = delta >= 0 ? '+' : ''
  return { value: `${sign}${delta.toFixed(1)}%`, up: delta >= 0, context: 'vs minggu lalu' }
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTH_UPPER = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES']


// ── Chart data builders (using TransactionRow snake_case) ──────────────────────

type CashFlowDay = { day: string; date: string; in: number; out: number; today?: boolean }

function buildWeekData(txs: TransactionRow[], weekStart: string, today: string): CashFlowDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDaysToStr(weekStart, i)
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

function TopKategoriPanel({ items, subtitle }: {
  items: { name: string; amount: number; txCount: number; pct: number }[]
  subtitle: string
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>Top Kategori</h3>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
          {subtitle}
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
          Belum ada transaksi jasa periode ini.
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
      )}
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const from90 = useMemo(() => addDaysToStr(today, -90), [today])

  const { data: periods = [] }    = useCommissionPeriods()
  const { data: allPayouts = [] } = useCommissionPayouts()
  const { data: mechanics = [] }  = useMechanics()
  const { data: customers = [] }  = useCustomers()
  const { data: suppliers = [] }  = useSuppliers()
  const { data: rates = [] }      = useCommissionRates()
  const { data: allTxs = [] }     = useTransactions({ dateFrom: from90 })

  const activePeriod = useMemo((): CommissionPeriod | undefined =>
    periods.find(p => p.status === 'open') ??
    [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0],
    [periods]
  )

  const prevPeriod = useMemo((): CommissionPeriod | undefined =>
    activePeriod
      ? [...periods]
          .filter(p => p.status === 'closed' && p.weekStart < activePeriod.weekStart)
          .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
      : undefined,
    [periods, activePeriod]
  )

  const { data: periodTxs = [] } = usePeriodTransactions(
    activePeriod?.weekStart,
    activePeriod?.weekEnd,
    { enabled: !!activePeriod },
  )

  // ── KPI: pendapatan / pengeluaran / laba (current period) ──────────────────

  const kpiStats = useMemo(() => {
    if (!activePeriod) return { pendapatan: 0, pengeluaran: 0, labaKotor: 0 }
    const ptxs = allTxs.filter(t => t.tgl >= activePeriod.weekStart && t.tgl <= activePeriod.weekEnd)
    const pendapatan  = ptxs.filter(t => t.tipe === 'income' ).reduce((s, t) => s + t.total_nominal, 0)
    const pengeluaran = ptxs.filter(t => t.tipe === 'expense').reduce((s, t) => s + t.total_nominal, 0)
    return { pendapatan, pengeluaran, labaKotor: pendapatan - pengeluaran }
  }, [allTxs, activePeriod])

  const kpiDeltas = useMemo(() => {
    if (!prevPeriod) return null
    const ptxs = allTxs.filter(t => t.tgl >= prevPeriod.weekStart && t.tgl <= prevPeriod.weekEnd)
    const prevIncome  = ptxs.filter(t => t.tipe === 'income' ).reduce((s, t) => s + t.total_nominal, 0)
    const prevExpense = ptxs.filter(t => t.tipe === 'expense').reduce((s, t) => s + t.total_nominal, 0)
    const prevLaba    = prevIncome - prevExpense
    const pct = (cur: number, prev: number) => prev === 0 ? undefined : ((cur - prev) / prev) * 100
    return {
      pendapatan:  pct(kpiStats.pendapatan,  prevIncome),
      pengeluaran: pct(kpiStats.pengeluaran, prevExpense),
      labaKotor:   pct(kpiStats.labaKotor,   prevLaba),
    }
  }, [allTxs, prevPeriod, kpiStats])

  // ── Komisi per mekanik (active period) ────────────────────────────────────

  const mechKomisi = useMemo(() =>
    activePeriod
      ? computePayoutsFromRows(periodTxs, activePeriod.weekStart, activePeriod.weekEnd, rates)
      : [],
    [periodTxs, activePeriod, rates]
  )
  const totalKomisiPending = mechKomisi.reduce((s, m) => s + m.totalKomisi, 0)

  // ── Top Kategori (income lines in active period) ───────────────────────────

  const topKategori = useMemo(() => {
    const katMap: Record<string, { name: string; amount: number; txCount: number }> = {}
    for (const tx of periodTxs) {
      for (const line of tx.transaction_lines) {
        const cat = line.categories
        if (!cat) continue
        if (!katMap[cat.id]) katMap[cat.id] = { name: cat.name, amount: 0, txCount: 0 }
        katMap[cat.id].amount  += line.nominal
        katMap[cat.id].txCount += 1
      }
    }
    const sorted = Object.values(katMap).sort((a, b) => b.amount - a.amount)
    const maxAmt = sorted[0]?.amount ?? 1
    return sorted.slice(0, 6).map(k => ({ ...k, pct: k.amount / maxAmt }))
  }, [periodTxs])

  // ── Party maps for recent transactions ────────────────────────────────────

  const customerMap = useMemo(() =>
    Object.fromEntries(customers.map(c => [c.id, c.motor_type ? `${c.name} (${c.motor_type})` : c.name])),
    [customers]
  )
  const supplierMap = useMemo(() =>
    Object.fromEntries(suppliers.map(s => [s.id, s.name])),
    [suppliers]
  )

  const recentTxs = useMemo(() =>
    [...allTxs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [allTxs]
  )

  // ── Chart data ─────────────────────────────────────────────────────────────

  const [chartFilter, setChartFilter] = useState<'7H' | '30H' | '90H'>('7H')
  const chartData = useMemo(() => {
    if (chartFilter === '7H' && activePeriod) return buildWeekData(allTxs, activePeriod.weekStart, today)
    if (chartFilter === '30H') return buildDaysData(allTxs, 30, today)
    return buildWeeksData(allTxs, 13, today)
  }, [chartFilter, allTxs, activePeriod, today])

  // ── Period Komisi panel ────────────────────────────────────────────────────

  const recentPeriods = useMemo(() =>
    [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 2),
    [periods]
  )
  const activeMechanicCount = mechanics.filter(m => m.is_active).length

  // ── Loading / empty state ──────────────────────────────────────────────────

  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard Owner" />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          Memuat...
        </div>
      </>
    )
  }

  if (!activePeriod) {
    return (
      <>
        <PageHeader title="Dashboard Owner" />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          Belum ada periode aktif.
        </div>
      </>
    )
  }

  const periodSubtitle = `Snapshot bisnis minggu ini · ${formatWeekRange(activePeriod.weekStart, activePeriod.weekEnd)}`
  const chartPeriodLabel = formatWeekRange(activePeriod.weekStart, activePeriod.weekEnd)
  const topKatSubtitle = `Pemasukan · ${MONTH_UPPER[parseInt(activePeriod.weekStart.slice(5,7))-1]} ${activePeriod.weekStart.slice(0,4)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader title="Dashboard Owner" subtitle={periodSubtitle} />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard
          label="Pendapatan Minggu Ini"
          value={<CurrencyDisplay value={kpiStats.pendapatan} size="lg" />}
          change={kpiChange(kpiDeltas?.pendapatan)}
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Pengeluaran Minggu Ini"
          value={<CurrencyDisplay value={kpiStats.pengeluaran} size="lg" />}
          change={kpiChange(kpiDeltas?.pengeluaran)}
          icon={<TrendingDown size={14} />}
        />
        <KpiCard
          label="Laba Kotor"
          value={<CurrencyDisplay value={kpiStats.labaKotor} size="lg" />}
          change={kpiChange(kpiDeltas?.labaKotor)}
          icon={<DollarSign size={14} />}
        />
        <KpiCard
          label="Komisi Pending Payout"
          value={<CurrencyDisplay value={totalKomisiPending} size="lg" />}
          change={{ value: `${mechKomisi.length} mekanik`, up: true, context: 'periode aktif' }}
          icon={<Wrench size={14} />}
          accent
        />
      </div>

      {/* Chart + Top Kategori */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <CashFlowChart
          data={chartData}
          filter={chartFilter}
          onFilterChange={setChartFilter}
          periodLabel={chartPeriodLabel}
        />
        <TopKategoriPanel items={topKategori} subtitle={topKatSubtitle} />
      </div>

      {/* Recent Tx + Period Komisi */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <RecentTxPanel
          transactions={recentTxs}
          customerMap={customerMap}
          supplierMap={supplierMap}
        />

        {/* Period Komisi Panel */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>Periode Komisi</h3>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
              SENIN — MINGGU
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPeriods.map((p) => {
              const periodKomisi = p.status === 'open'
                ? totalKomisiPending
                : allPayouts.filter(po => po.periodId === p.id).reduce((s, po) => s + po.totalKomisi, 0)
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
                        {activeMechanicCount} mekanik
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

          {/* Mechanic komisi grid */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              KOMISI BERJALAN — PER MEKANIK
            </div>
            {mechKomisi.length === 0 ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                Belum ada jasa periode ini.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {mechKomisi.map((m) => (
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
        </div>
      </div>
    </div>
  )
}
