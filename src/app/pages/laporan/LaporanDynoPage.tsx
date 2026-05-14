import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelector } from '@/components/nq21/PeriodSelector'
import { exportCSV, fmtDate } from '@/lib/csv'
import { usePeriodFilter } from '@/lib/hooks/usePeriodFilter'
import { useTransactionsWithLines } from '@/features/transactions/hooks'
import type { TransactionWithLines } from '@/features/transactions/hooks'

// ── Formatters ─────────────────────────────────────────────────────────────────

const _fmt = new Intl.NumberFormat('id-ID')
const fmtRp = (n: number) => `Rp ${_fmt.format(n)}`

function fmtShortDate(iso: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const [, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`
}

function fmtTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function csvDateSlug(dateStr: string): string {
  const MONTHS = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des']
  const [y, m, d] = dateStr.split('-')
  return `${d}${MONTHS[parseInt(m) - 1]}${y}`
}

function fmtCsvRupiah(n: unknown): string {
  return String(typeof n === 'number' ? n : 0)
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// ── Local types ───────────────────────────────────────────────────────────────

interface DynoSession {
  transactionId: string
  noReferensi: string
  tgl: string
  createdAt: string
  customerName: string
  operatorMechanicId: string
  operatorName: string
  paymentMethod: string
  nominal: number
}

interface TopOperator {
  mechanicId: string
  mechanicName: string
  sessionCount: number
  totalRevenue: number
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent)', color: '#fff',
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--display)', fontSize: Math.round(size * 0.42),
      flexShrink: 0, letterSpacing: 0,
    }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

const METHOD_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  cash:     { bg: 'rgba(22,163,74,0.12)',  color: '#16a34a', label: 'CASH' },
  transfer: { bg: 'rgba(37,99,235,0.12)',  color: '#2563eb', label: 'TF' },
  qris:     { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed', label: 'QRIS' },
}

function MethodBadge({ method }: { method: string }) {
  const s = METHOD_STYLES[method] ?? { bg: 'var(--surface)', color: 'var(--text-muted)', label: method.toUpperCase() }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  )
}

interface TooltipPayload { date: string; label: string; count: number; revenue: number }

function DynoBarTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: TooltipPayload }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.label ?? label}</div>
      <div>{d.count} sesi</div>
      {d.revenue > 0 && <div style={{ color: 'rgba(255,255,255,0.7)' }}>{fmtRp(d.revenue)}</div>}
    </div>
  )
}

// ── Computation ───────────────────────────────────────────────────────────────

function computeDynoReport(txsWithLines: TransactionWithLines[]) {
  const sessions: DynoSession[] = []

  for (const tx of txsWithLines) {
    for (const line of tx.transaction_lines) {
      if (line.categories?.name !== 'Dyno') continue
      const lms = [...line.transaction_line_mechanics].sort((a, b) => b.share_percent - a.share_percent)
      const primary = lms[0]
      sessions.push({
        transactionId: tx.id,
        noReferensi: tx.no_referensi,
        tgl: tx.tgl,
        createdAt: tx.created_at,
        customerName: tx.customer?.name ?? '—',
        operatorMechanicId: primary?.mechanic_id ?? '',
        operatorName: primary?.mechanics?.name ?? '—',
        paymentMethod: tx.payment_method,
        nominal: line.nominal,
      })
    }
  }

  sessions.sort((a, b) => b.tgl.localeCompare(a.tgl))

  const opMap: Record<string, { name: string; sessionCount: number; totalRevenue: number }> = {}
  for (const s of sessions) {
    if (!opMap[s.operatorMechanicId]) {
      opMap[s.operatorMechanicId] = { name: s.operatorName, sessionCount: 0, totalRevenue: 0 }
    }
    opMap[s.operatorMechanicId].sessionCount += 1
    opMap[s.operatorMechanicId].totalRevenue += s.nominal
  }
  const topOperators: TopOperator[] = Object.entries(opMap)
    .map(([mechanicId, v]) => ({ mechanicId, mechanicName: v.name, sessionCount: v.sessionCount, totalRevenue: v.totalRevenue }))
    .sort((a, b) => b.sessionCount - a.sessionCount)

  // Last 14 days rolling window
  const today = new Date().toISOString().slice(0, 10)
  const end14 = today
  const start14 = addDays(end14, -13)
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const dateBuckets: Record<string, number> = {}
  let dc = start14
  while (dc <= end14) { dateBuckets[dc] = 0; dc = addDays(dc, 1) }
  for (const s of sessions) {
    if (dateBuckets[s.tgl] !== undefined) dateBuckets[s.tgl] += 1
  }
  const sessionsByDate = Object.entries(dateBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      const d = new Date(date + 'T00:00:00')
      return { date, label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`, count }
    })

  const totalRevenue = sessions.reduce((s, x) => s + x.nominal, 0)

  return {
    sessions,
    topOperators,
    sessionsByDate,
    summary: {
      totalSessions: sessions.length,
      totalRevenue,
      avgRevenuePerSession: sessions.length > 0 ? Math.round(totalRevenue / sessions.length) : 0,
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function LaporanDynoPage() {
  const navigate = useNavigate()
  const period = usePeriodFilter('week')
  const [page, setPage] = useState(1)

  const { data: txsWithLines = [], isLoading } = useTransactionsWithLines({
    tipe: 'income',
    dateFrom: period.range.start,
    dateTo: period.range.end,
  })

  const report = useMemo(() => computeDynoReport(txsWithLines), [txsWithLines])

  const revenueByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of report.sessions) { map[s.tgl] = (map[s.tgl] ?? 0) + s.nominal }
    return map
  }, [report.sessions])

  const chartData = useMemo(
    () => report.sessionsByDate.map(d => ({ ...d, revenue: revenueByDate[d.date] ?? 0 })),
    [report.sessionsByDate, revenueByDate],
  )

  const totalPages = Math.max(1, Math.ceil(report.sessions.length / PAGE_SIZE))
  const pagedSessions = report.sessions.length <= PAGE_SIZE
    ? report.sessions
    : report.sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const maxRevenue = report.topOperators[0]?.totalRevenue ?? 0

  function handleExport() {
    if (!report.sessions.length) return
    const rows = report.sessions.map(s => ({
      tgl: s.tgl, jam: fmtTime(s.createdAt), noRef: s.noReferensi,
      customer: s.customerName, operator: s.operatorName,
      metode: s.paymentMethod, nominal: s.nominal,
    }))
    exportCSV(
      rows,
      [
        { key: 'tgl',      label: 'Tanggal',  format: (v) => fmtDate(String(v)) },
        { key: 'jam',      label: 'Jam' },
        { key: 'noRef',    label: 'No Referensi' },
        { key: 'customer', label: 'Customer' },
        { key: 'operator', label: 'Operator' },
        { key: 'metode',   label: 'Metode',   format: (v) => String(v).toUpperCase() },
        { key: 'nominal',  label: 'Nominal',  format: fmtCsvRupiah },
      ],
      `nq21-laporan-dyno-${csvDateSlug(period.range.start)}-${csvDateSlug(period.range.end)}`,
    )
  }

  const isEmpty = !isLoading && report.sessions.length === 0

  const periodBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <PeriodSelector
        value={period.preset}
        onChange={(v) => period.setPreset(v as import('@/lib/hooks/usePeriodFilter').PeriodPreset)}
      />
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
        {fmtShortDate(period.range.start)} — {fmtShortDate(period.range.end)}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div style={{ padding: '0 32px 48px' }}>
        <PageHeader title="LAPORAN #4 — DYNO" subtitle="Performa sesi dyno test dan operator" />
        {periodBar}
        <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat data...</div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div style={{ padding: '0 32px 48px' }}>
        <PageHeader
          title="LAPORAN #4 — DYNO"
          subtitle="Performa sesi dyno test dan operator"
          action={
            <button disabled style={{ padding: '8px 16px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.04em', cursor: 'not-allowed', opacity: 0.5 }}>
              EXPORT CSV
            </button>
          }
        />
        {periodBar}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
          <div style={{ fontSize: 40 }}>⚡</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--text)' }}>Belum ada sesi dyno di periode ini.</div>
          <button onClick={() => navigate('/transaksi/baru')} style={{ marginTop: 8, padding: '10px 20px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer' }}>
            + INPUT TRANSAKSI DYNO
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 32px 48px' }}>
      <PageHeader
        title="LAPORAN #4 — DYNO"
        subtitle="Performa sesi dyno test dan operator"
        action={
          <button onClick={handleExport} style={{ padding: '8px 16px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer' }}>
            EXPORT CSV
          </button>
        }
      />

      {periodBar}

      {/* Hero section */}
      <div style={{ background: 'var(--text)', borderRadius: 8, padding: '32px 40px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>TOTAL SESI</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 48, color: '#fff', lineHeight: 1.1 }}>{report.summary.totalSessions}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>sesi dyno</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>TOTAL REVENUE</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 42, color: '#fff', lineHeight: 1.1 }}>{fmtRp(report.summary.totalRevenue)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>periode ini</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>RATA-RATA / SESI</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 42, color: '#fff', lineHeight: 1.1 }}>{fmtRp(report.summary.avgRevenuePerSession)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>per sesi</div>
          </div>
        </div>
      </div>

      {/* 2-col: Top Operators + Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOP OPERATOR</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Operator dengan sesi terbanyak</div>
          </div>
          <div style={{ padding: '8px 0' }}>
            {report.topOperators.slice(0, 5).map((op, i) => {
              const pct = maxRevenue > 0 ? (op.totalRevenue / maxRevenue) * 100 : 0
              return (
                <div key={op.mechanicId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < Math.min(report.topOperators.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', minWidth: 22, textAlign: 'center' }}>#{i + 1}</div>
                  <Avatar name={op.mechanicName} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{op.mechanicName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{op.sessionCount} sesi · {fmtRp(op.totalRevenue)}</div>
                    <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: i === 0 ? 'var(--accent)' : 'var(--text-muted)', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>14 HARI TERAKHIR</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Jumlah sesi per hari (fixed 14-day window)</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {chartData.every(d => d.count === 0) ? (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum ada data 14 hari terakhir.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<DynoBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DETAIL SESI</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{report.sessions.length} sesi dyno di periode ini</div>
          </div>
          {report.sessions.length > PAGE_SIZE && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, report.sessions.length)} dari {report.sessions.length}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {(['TGL','JAM','NO REFERENSI','CUSTOMER','OPERATOR','METODE','NOMINAL'] as const).map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'NOMINAL' ? 'right' : 'left', fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedSessions.map(s => (
                <tr
                  key={`${s.transactionId}-${s.noReferensi}`}
                  onClick={() => navigate(`/transaksi/${s.transactionId}`)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt, rgba(0,0,0,0.03))')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '12px 14px', borderLeft: '3px solid var(--accent)', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtShortDate(s.tgl)}</div>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(s.createdAt)}</div>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{s.noReferensi}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.customerName}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={s.operatorName} size={24} />
                      <span style={{ fontSize: 12.5 }}>{s.operatorName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}><MethodBadge method={s.paymentMethod} /></td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{fmtRp(s.nominal)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid ${p === page ? 'var(--accent)' : 'var(--border)'}`, background: p === page ? 'var(--accent)' : 'transparent', color: p === page ? '#fff' : 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
