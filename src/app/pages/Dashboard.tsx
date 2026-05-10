import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  PageHeader, KpiCard, CurrencyDisplay,
} from '@/components/nq21'

// ── Mock data (M001 — swap ke Zustand store di T7) ───────────────────────────

const CASHFLOW = [
  { day: 'SEN', date: '04 Mei', in: 2_450_000, out: 1_100_000 },
  { day: 'SEL', date: '05 Mei', in: 3_220_000, out: 850_000 },
  { day: 'RAB', date: '06 Mei', in: 1_980_000, out: 420_000 },
  { day: 'KAM', date: '07 Mei', in: 4_150_000, out: 1_650_000 },
  { day: 'JUM', date: '08 Mei', in: 5_320_000, out: 1_980_000 },
  { day: 'SAB', date: '09 Mei', in: 6_780_000, out: 2_240_000 },
  { day: 'MIN', date: '10 Mei', in: 4_890_000, out: 980_000, today: true },
]

const TOP_KATEGORI = [
  { name: 'Jasa Service',  meta: '142 transaksi · komisi aktif', amount: 28_450_000, pct: 1.0 },
  { name: 'Sparepart',     meta: '89 transaksi',                  amount: 19_220_000, pct: 0.68 },
  { name: 'Oli',           meta: '156 transaksi',                 amount: 12_640_000, pct: 0.44 },
  { name: 'Dyno',          meta: '11 transaksi · owner only',     amount:  9_850_000, pct: 0.35 },
  { name: 'Bubut Dalam',   meta: '34 transaksi · komisi aktif',   amount:  7_380_000, pct: 0.26 },
]

const RECENT_TX = [
  { ref: 'TRX-20260510-018', time: '14:32', name: 'Dimas P. (Vario 150)', cat: 'Jasa, Sparepart', type: 'income',  amount: 425_000 },
  { ref: 'TRX-20260510-017', time: '14:08', name: 'Rian S. (Beat)',        cat: 'Oli',             type: 'income',  amount:  85_000 },
  { ref: 'EXP-20260510-004', time: '13:45', name: 'Bengkel Bubut Karya',   cat: 'Bayar Vendor',    type: 'expense', amount: 350_000 },
  { ref: 'TRX-20260510-016', time: '13:21', name: 'Aditya N. (R15)',       cat: 'Dyno, Jasa',      type: 'income',  amount: 950_000 },
  { ref: 'TRX-20260510-015', time: '12:54', name: 'Bagas T. (Nmax)',       cat: 'Bubut Dalam',     type: 'income',  amount: 280_000 },
]

const PERIODS = [
  { id: 1, range: '04 – 10 MEI 2026', status: 'open',   total: 2_185_000, mechanics: 4, active: true },
  { id: 2, range: '27 APR – 03 MEI',  status: 'closed', total: 1_980_000, mechanics: 4, paid: 4 },
]

const MECHANICS = [
  { initial: 'B', name: 'Budi',  komisi: 552_000 },
  { initial: 'A', name: 'Andi',  komisi: 355_000 },
  { initial: 'J', name: 'Joko',  komisi: 594_000 },
  { initial: 'R', name: 'Rizki', komisi: 268_400 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtRpShort(n: number) {
  const a = Math.abs(n)
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt'
  if (a >= 1_000) return Math.round(n / 1_000) + 'rb'
  return String(Math.round(n))
}

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n)))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CashFlowChart() {
  const [filter, setFilter] = useState('7H')

  const CustomTooltip = ({ active, payload, label }: any) => {
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
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 24,
    }}>
      {/* Header */}
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
          {(['7H', '30H', '90H'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: filter === t ? 'var(--text)' : 'transparent',
                color: filter === t ? '#fff' : 'var(--text-muted)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={CASHFLOW} barGap={4} barCategoryGap="30%">
          <XAxis
            dataKey="day"
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: '#8B857A', letterSpacing: 1 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtRpShort}
            tick={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fill: '#8B857A' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(10,9,8,0.04)' }} />
          <Bar dataKey="in" name="Masuk" fill="#0A0908" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {CASHFLOW.map((entry, i) => (
              <Cell key={i} fill={entry.today ? '#1a1917' : '#0A0908'} />
            ))}
          </Bar>
          <Bar dataKey="out" name="Keluar" fill="#C8102E" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        {[
          { color: '#0A0908', label: 'PEMASUKAN' },
          { color: '#C8102E', label: 'PENGELUARAN' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, background: color, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ● HARI INI
        </div>
      </div>
    </div>
  )
}

function TopKategoriPanel() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>
            Top Kategori
          </h3>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
            Pendapatan · Mei 2026
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {TOP_KATEGORI.map((c, i) => (
          <div key={c.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                  color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                  letterSpacing: '0.06em', minWidth: 22,
                }}>
                  0{i + 1}
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{c.meta}</div>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                Rp {fmtRp(c.amount)}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--surface-alt)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${c.pct * 100}%`,
                background: i === 0 ? 'var(--accent)' : 'var(--text)',
                borderRadius: 2,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentTransactionsPanel() {
  const navigate = useNavigate()
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 0' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>
            Transaksi Terbaru
          </h3>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
            10 MEI · {RECENT_TX.length} ENTRI
          </div>
        </div>
        <button
          onClick={() => navigate('/transaksi')}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6,
          }}
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
          {RECENT_TX.map((t) => (
            <tr key={t.ref}>
              <td>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                  {t.ref}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t.time}
                </div>
              </td>
              <td style={{ fontSize: 13.5 }}>{t.name}</td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{t.cat}</td>
              <td>
                <Badge variant={t.type === 'income' ? 'income' : 'expense'}>
                  {t.type === 'income' ? 'MASUK' : 'KELUAR'}
                </Badge>
              </td>
              <td style={{
                textAlign: 'right',
                fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600,
                color: t.type === 'income' ? 'var(--success)' : 'var(--accent)',
              }}>
                {t.type === 'income' ? '+' : '−'} Rp {fmtRp(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PeriodKomisiPanel() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 24,
    }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, textTransform: 'uppercase', margin: 0 }}>
          Periode Komisi
        </h3>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>
          SENIN — MINGGU
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PERIODS.map((p) => (
          <div key={p.id} style={{
            border: `1px solid ${p.active ? 'var(--border-strong)' : 'var(--border)'}`,
            borderRadius: 8,
            padding: '14px 16px',
            background: p.active ? 'var(--surface-alt)' : 'transparent',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em' }}>
                {p.range}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Badge variant={p.status === 'open' ? 'open' : 'closed'}>
                  {p.status === 'open' ? 'AKTIF' : 'CLOSED'}
                </Badge>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.mechanics} mekanik{p.paid ? ` · ${p.paid} dibayar` : ''}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--text)' }}>
                Rp {fmtRp(p.total)}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                {p.status === 'open' ? 'BERJALAN' : 'TOTAL KOMISI'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mekanik mini grid */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12,
        }}>
          KOMISI BERJALAN — PER MEKANIK
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MECHANICS.map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--surface-alt)', border: '1px solid var(--border)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--display)', fontSize: 14, color: 'var(--text)',
                flexShrink: 0,
              }}>
                {m.initial}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--success)', fontWeight: 600 }}>
                  Rp {fmtRp(m.komisi)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <PageHeader
        title="Dashboard Owner"
        subtitle="Snapshot bisnis minggu ini · 04 — 10 Mei 2026"
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard
          label="Pendapatan Minggu Ini"
          value={<CurrencyDisplay value={28_790_000} size="lg" />}
          change={{ value: '+12.4%', up: true, context: 'vs minggu lalu' }}
          icon={<TrendingUp size={14} />}
        />
        <KpiCard
          label="Pengeluaran Minggu Ini"
          value={<CurrencyDisplay value={9_220_000} size="lg" />}
          change={{ value: '+3.1%', up: false, context: 'vs minggu lalu' }}
          icon={<TrendingDown size={14} />}
        />
        <KpiCard
          label="Laba Kotor"
          value={<CurrencyDisplay value={19_570_000} size="lg" />}
          change={{ value: '+18.2%', up: true, context: 'vs minggu lalu' }}
          icon={<DollarSign size={14} />}
        />
        <KpiCard
          label="Komisi Pending Payout"
          value={<CurrencyDisplay value={2_185_000} size="lg" />}
          change={{ value: '4 mekanik', up: true, context: 'periode aktif' }}
          icon={<Wrench size={14} />}
          accent
        />
      </div>

      {/* Panel row: Chart + Top Kategori */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <CashFlowChart />
        <TopKategoriPanel />
      </div>

      {/* Panel row: Recent Tx + Period Komisi */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <RecentTransactionsPanel />
        <PeriodKomisiPanel />
      </div>
    </div>
  )
}
