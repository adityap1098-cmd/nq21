import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader, KpiCard, CurrencyDisplay } from '@/components/nq21'
import { useTransactionStore } from '@/store/transactions'
import { useCommissionStore } from '@/store/commission'
import { useCategoryStore } from '@/store/master/categories'
import { useCustomerStore } from '@/store/master/customers'
import { useSupplierStore } from '@/store/master/suppliers'
import { useMechanicStore } from '@/store/master/mechanics'
import {
  getDashboardStats, getMechanicKomisiInPeriod, getKpiDeltas, defaultRates,
  type KpiDelta,
} from '@/store/selectors'
import type { Transaction } from '@/store/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n)))
}

function fmtRpShort(n: number) {
  const a = Math.abs(n)
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt'
  if (a >= 1_000) return Math.round(n / 1_000) + 'rb'
  return String(Math.round(n))
}

function kpiChange(kd: KpiDelta, context = 'vs minggu lalu'): { value: string; up: boolean; context: string } | undefined {
  if (!kd.hasComparison || kd.delta === undefined) return undefined
  const sign = kd.delta >= 0 ? '+' : ''
  return { value: `${sign}${kd.delta.toFixed(1)}%`, up: kd.delta >= 0, context }
}

// ── Chart data builders ───────────────────────────────────────────────────────

const _MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const _PINNED = '2026-05-10'

type CashFlowDay = { day: string; date: string; in: number; out: number; today?: boolean }

function build30HData(txs: Transaction[]): CashFlowDay[] {
  const pinned = new Date(_PINNED)
  const days: CashFlowDay[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(pinned); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTx = txs.filter((t) => !t.deletedAt && t.tglTransaksi === dateStr)
    days.push({
      day: String(d.getDate()),
      date: `${d.getDate()} ${_MONTHS[d.getMonth()]}`,
      in:  dayTx.filter((t) => t.tipe === 'income' ).reduce((s, t) => s + t.totalNominal, 0),
      out: dayTx.filter((t) => t.tipe === 'expense').reduce((s, t) => s + t.totalNominal, 0),
      today: dateStr === _PINNED || undefined,
    })
  }
  return days
}

function build90HData(txs: Transaction[]): CashFlowDay[] {
  const pinned = new Date(_PINNED)
  const weeks: CashFlowDay[] = []
  for (let w = 12; w >= 0; w--) {
    const wEnd = new Date(pinned); wEnd.setDate(wEnd.getDate() - w * 7)
    const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6)
    const s = wStart.toISOString().slice(0, 10)
    const e = wEnd.toISOString().slice(0, 10)
    const weekTx = txs.filter((t) => !t.deletedAt && t.tglTransaksi >= s && t.tglTransaksi <= e)
    weeks.push({
      day: `${_MONTHS[wStart.getMonth()]}${wStart.getDate()}`,
      date: `${wStart.getDate()}–${wEnd.getDate()} ${_MONTHS[wEnd.getMonth()]}`,
      in:  weekTx.filter((t) => t.tipe === 'income' ).reduce((s, t) => s + t.totalNominal, 0),
      out: weekTx.filter((t) => t.tipe === 'expense').reduce((s, t) => s + t.totalNominal, 0),
    })
  }
  return weeks
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CashFlowChart({ data, filter, onFilterChange }: {
  data: CashFlowDay[]
  filter: string
  onFilterChange: (f: string) => void
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
            Cash Flow Mingguan
          </h3>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
            04 — 10 MEI · IN VS OUT
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

function TopKategoriPanel({ items }: { items: { name: string; amount: number; txCount: number; pct: number }[] }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>Top Kategori</h3>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
          Pendapatan · Mei 2026
        </div>
      </div>
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
    </div>
  )
}

function RecentTxPanel({
  transactions,
  customerMap,
  supplierMap,
  lineMap,
  categoryMap,
}: {
  transactions: Transaction[]
  customerMap: Record<string, string>
  supplierMap: Record<string, string>
  lineMap: Record<string, { categoryId: string; name: string }[]>
  categoryMap: Record<string, string>
}) {
  const navigate = useNavigate()
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 0' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>Transaksi Terbaru</h3>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
            {transactions[0]?.tglTransaksi?.slice(8, 10)} MEI · {transactions.length} ENTRI
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
            <th>KATEGORI</th>
            <th>TIPE</th>
            <th style={{ textAlign: 'right' }}>NOMINAL</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const time = t.createdAt.slice(11, 16)
            const partyName = t.tipe === 'income'
              ? customerMap[t.customerId ?? ''] ?? '—'
              : supplierMap[t.supplierId ?? ''] ?? '—'
            const cats = lineMap[t.id]?.map((l) => categoryMap[l.categoryId] ?? '').filter(Boolean).join(', ') ?? '—'
            return (
              <tr key={t.id}>
                <td>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{t.noReferensi}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{time}</div>
                </td>
                <td style={{ fontSize: 13.5 }}>{partyName}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{cats}</td>
                <td>
                  <Badge variant={t.tipe === 'income' ? 'income' : 'expense'}>
                    {t.tipe === 'income' ? 'MASUK' : 'KELUAR'}
                  </Badge>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: t.tipe === 'income' ? 'var(--success)' : 'var(--accent)' }}>
                  {t.tipe === 'income' ? '+' : '−'} Rp {fmtRp(t.totalNominal)}
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
  const { transactions, lines, lineMechanics } = useTransactionStore()
  const { periods, payouts } = useCommissionStore()
  const { categories } = useCategoryStore()
  const { customers } = useCustomerStore()
  const { suppliers } = useSupplierStore()
  const { mechanics, rates } = useMechanicStore()

  const activePeriod = periods.find((p) => p.status === 'open') ?? periods[0]

  const categoryMap = useMemo(() =>
    Object.fromEntries(categories.map((c) => [c.id, { name: c.name, type: c.type }])),
    [categories]
  )
  const categoryNameMap = useMemo(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  )
  const customerMap = useMemo(() =>
    Object.fromEntries(customers.map((c) => [c.id, c.motorType ? `${c.name} (${c.motorType})` : c.name])),
    [customers]
  )
  const supplierMap = useMemo(() =>
    Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers]
  )
  const lineMap = useMemo(() => {
    const m: Record<string, { categoryId: string; name: string }[]> = {}
    for (const line of lines) {
      if (!m[line.transactionId]) m[line.transactionId] = []
      m[line.transactionId].push({ categoryId: line.categoryId, name: categoryNameMap[line.categoryId] ?? '' })
    }
    return m
  }, [lines, categoryNameMap])

  const stats = useMemo(() =>
    getDashboardStats(transactions, lines, activePeriod, categoryMap),
    [transactions, lines, activePeriod, categoryMap]
  )

  const mechKomisi = useMemo(() =>
    getMechanicKomisiInPeriod(transactions, lines, lineMechanics, rates.length ? rates : defaultRates, activePeriod),
    [transactions, lines, lineMechanics, rates, activePeriod]
  )

  const totalKomisiPending = mechKomisi.reduce((s, m) => s + m.totalKomisi, 0)

  const prevPeriod = useMemo(() =>
    [...periods]
      .filter((p) => p.status === 'closed' && p.weekStart < activePeriod.weekStart)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0],
    [periods, activePeriod]
  )

  const prevKomisi = useMemo(() =>
    prevPeriod
      ? payouts.filter((po) => po.periodId === prevPeriod.id).reduce((s, po) => s + po.totalKomisi, 0)
      : 0,
    [prevPeriod, payouts]
  )

  const kpiDeltas = useMemo(() =>
    getKpiDeltas(transactions, activePeriod, prevPeriod, totalKomisiPending, prevKomisi),
    [transactions, activePeriod, prevPeriod, totalKomisiPending, prevKomisi]
  )

  const [chartFilter, setChartFilter] = useState('7H')
  const chartData = useMemo(() => {
    if (chartFilter === '30H') return build30HData(transactions)
    if (chartFilter === '90H') return build90HData(transactions)
    return stats.cashflowByDay
  }, [chartFilter, transactions, stats.cashflowByDay])

  const recentPeriods = [...periods]
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader
        title="Dashboard Owner"
        subtitle={`Snapshot bisnis minggu ini · ${activePeriod.weekStart.slice(8, 10)} — ${activePeriod.weekEnd.slice(8, 10)} Mei 2026`}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard
          label="Pendapatan Minggu Ini"
          value={<CurrencyDisplay value={stats.pendapatan} size="lg" />}
          change={kpiChange(kpiDeltas.pendapatan)}
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Pengeluaran Minggu Ini"
          value={<CurrencyDisplay value={stats.pengeluaran} size="lg" />}
          change={kpiChange(kpiDeltas.pengeluaran)}
          icon={<TrendingDown size={14} />}
        />
        <KpiCard
          label="Laba Kotor"
          value={<CurrencyDisplay value={stats.labaKotor} size="lg" />}
          change={kpiChange(kpiDeltas.labaKotor)}
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
        <CashFlowChart data={chartData} filter={chartFilter} onFilterChange={setChartFilter} />
        <TopKategoriPanel items={stats.topKategori} />
      </div>

      {/* Recent Tx + Period Komisi */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <RecentTxPanel
          transactions={stats.recentTransactions}
          customerMap={customerMap}
          supplierMap={supplierMap}
          lineMap={lineMap}
          categoryMap={categoryNameMap}
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
            {recentPeriods.map((p) => (
              <div key={p.id} style={{
                border: `1px solid ${p.status === 'open' ? 'var(--border-strong)' : 'var(--border)'}`,
                borderRadius: 8, padding: '14px 16px',
                background: p.status === 'open' ? 'var(--surface-alt)' : 'transparent',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em' }}>
                    {p.weekStart.slice(8, 10)} – {p.weekEnd.slice(8, 10)} {['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'][parseInt(p.weekEnd.slice(5, 7)) - 1]} {p.weekEnd.slice(0, 4)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Badge variant={p.status === 'open' ? 'open' : 'closed'}>
                      {p.status === 'open' ? 'AKTIF' : 'CLOSED'}
                    </Badge>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {mechanics.filter((m) => m.isActive).length} mekanik
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--text)' }}>
                    Rp {p.status === 'open' ? fmtRp(totalKomisiPending) : fmtRp(
                      payouts.filter((po) => po.periodId === p.id).reduce((s, po) => s + po.totalKomisi, 0)
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                    {p.status === 'open' ? 'BERJALAN' : 'TOTAL KOMISI'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mechanic mini grid */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              KOMISI BERJALAN — PER MEKANIK
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {mechKomisi.map((m) => (
                <div key={m.mechanicId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontSize: 14, color: 'var(--text)', flexShrink: 0 }}>
                    {m.initial}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{m.name.split(' ')[0]}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--success)', fontWeight: 600 }}>
                      Rp {fmtRp(m.totalKomisi)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
