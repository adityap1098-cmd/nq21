import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useTransactionStore } from '@/store/transactions'
import { useCustomerStore } from '@/store/master/customers'
import { useCategoryStore } from '@/store/master/categories'
import { useMechanicStore } from '@/store/master/mechanics'
import { getReportDyno, type DynoSession } from '@/store/selectors'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelector } from '@/components/nq21/PeriodSelector'
import { exportCSV, fmtDate } from '@/lib/csv'
import { usePeriodFilter } from '@/lib/hooks/usePeriodFilter'

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

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--accent)',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--display)',
        fontSize: Math.round(size * 0.42),
        flexShrink: 0,
        letterSpacing: 0,
      }}
    >
      {name[0]?.toUpperCase()}
    </div>
  )
}

// ── Payment badge ─────────────────────────────────────────────────────────────

const METHOD_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  cash:     { bg: 'rgba(22,163,74,0.12)',  color: '#16a34a', label: 'CASH' },
  transfer: { bg: 'rgba(37,99,235,0.12)',  color: '#2563eb', label: 'TF' },
  qris:     { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed', label: 'QRIS' },
}

function MethodBadge({ method }: { method: string }) {
  const s = METHOD_STYLES[method] ?? { bg: 'var(--surface)', color: 'var(--text-muted)', label: method.toUpperCase() }
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  )
}

// ── Custom bar chart tooltip ──────────────────────────────────────────────────

interface TooltipPayload {
  date: string
  label: string
  count: number
  revenue: number
}

function DynoBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { payload: TooltipPayload }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--text)', color: '#fff',
      border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.label ?? label}</div>
      <div>{d.count} sesi</div>
      {d.revenue > 0 && <div style={{ color: 'rgba(255,255,255,0.7)' }}>{fmtRp(d.revenue)}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function LaporanDynoPage() {
  const navigate = useNavigate()
  const period = usePeriodFilter('week')

  const { transactions, lines, lineMechanics } = useTransactionStore()
  const { customers } = useCustomerStore()
  const { categories } = useCategoryStore()
  const { mechanics } = useMechanicStore()

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, { name: c.name, type: c.type, isJasa: c.isJasa }])),
    [categories],
  )

  const report = useMemo(
    () => getReportDyno(transactions, lines, lineMechanics, categoryMap, customers, mechanics, period.range),
    [transactions, lines, lineMechanics, categoryMap, customers, mechanics, period.range],
  )

  const [page, setPage] = useState(1)

  // Revenue per date for tooltip
  const revenueByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of report.sessions) {
      map[s.tgl] = (map[s.tgl] ?? 0) + s.nominal
    }
    return map
  }, [report.sessions])

  const chartData = useMemo(
    () => report.sessionsByDate.map((d) => ({ ...d, revenue: revenueByDate[d.date] ?? 0 })),
    [report.sessionsByDate, revenueByDate],
  )

  // Pagination
  const totalPages = Math.max(1, Math.ceil(report.sessions.length / PAGE_SIZE))
  const pagedSessions: DynoSession[] = report.sessions.length <= PAGE_SIZE
    ? report.sessions
    : report.sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Max revenue for progress bar
  const maxRevenue = report.topOperators[0]?.totalRevenue ?? 0

  function handleExport() {
    if (!report.sessions.length) return
    const rows = report.sessions.map((s) => ({
      tgl: s.tgl,
      jam: fmtTime(s.createdAt),
      noRef: s.noReferensi,
      customer: s.customerName,
      operator: s.operatorName,
      metode: s.paymentMethod,
      nominal: s.nominal,
    }))
    const slug = csvDateSlug(period.range.start) + '-' + csvDateSlug(period.range.end)
    exportCSV(
      rows,
      [
        { key: 'tgl',      label: 'Tanggal', format: fmtDate },
        { key: 'jam',      label: 'Jam' },
        { key: 'noRef',    label: 'No Referensi' },
        { key: 'customer', label: 'Customer' },
        { key: 'operator', label: 'Operator' },
        { key: 'metode',   label: 'Metode', format: (v) => String(v).toUpperCase() },
        { key: 'nominal',  label: 'Nominal', format: fmtCsvRupiah },
      ],
      `nq21-laporan-dyno-${slug}`,
    )
  }

  const isEmpty = report.sessions.length === 0

  // ── Period filter bar ───────────────────────────────────────────────────────

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

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (isEmpty) {
    return (
      <div style={{ padding: '0 32px 48px' }}>
        <PageHeader
          title="LAPORAN #4 — DYNO"
          subtitle="Performa sesi dyno test dan operator"
          action={
            <button
              onClick={handleExport}
              disabled
              style={{
                padding: '8px 16px', borderRadius: 6, border: '1.5px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', fontSize: 12,
                fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.04em',
                cursor: 'not-allowed', opacity: 0.5,
              }}
            >
              EXPORT CSV
            </button>
          }
        />
        {periodBar}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 24px', gap: 16, textAlign: 'center',
          border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 40 }}>⚡</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--text)' }}>
            Belum ada sesi dyno di periode ini.
          </div>
          <button
            onClick={() => navigate('/transaksi/baru')}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 6,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.04em', cursor: 'pointer',
            }}
          >
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
          <button
            onClick={handleExport}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1.5px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontSize: 12,
              fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            EXPORT CSV
          </button>
        }
      />

      {periodBar}

      {/* ── Hero section ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--text)', borderRadius: 8, padding: '32px 40px',
        marginBottom: 20, position: 'relative', overflow: 'hidden',
      }}>
        {/* Accent top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'var(--accent)',
        }} />

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32,
        }}>
          {/* TOTAL SESI */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>
              TOTAL SESI
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 48, color: '#fff', lineHeight: 1.1 }}>
              {report.summary.totalSessions}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              sesi dyno
            </div>
          </div>

          {/* TOTAL REVENUE */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>
              TOTAL REVENUE
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 42, color: '#fff', lineHeight: 1.1 }}>
              {fmtRp(report.summary.totalRevenue)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              periode ini
            </div>
          </div>

          {/* RATA-RATA / SESI */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>
              RATA-RATA / SESI
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 42, color: '#fff', lineHeight: 1.1 }}>
              {fmtRp(report.summary.avgRevenuePerSession)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              per sesi
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-col section: Top Operators + Bar Chart ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* TOP OPERATORS */}
        <div style={{
          border: '1px solid var(--border)', borderRadius: 8,
          background: 'var(--surface)', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              TOP OPERATOR
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Operator dengan sesi terbanyak
            </div>
          </div>

          <div style={{ padding: '8px 0' }}>
            {report.topOperators.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Belum ada operator dyno di periode ini.
              </div>
            ) : (
              report.topOperators.slice(0, 5).map((op, i) => {
                const pct = maxRevenue > 0 ? (op.totalRevenue / maxRevenue) * 100 : 0
                return (
                  <div
                    key={op.mechanicId}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 20px',
                      borderBottom: i < Math.min(report.topOperators.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {/* Rank */}
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
                      color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                      minWidth: 22, textAlign: 'center',
                    }}>
                      #{i + 1}
                    </div>

                    <Avatar name={op.mechanicName} size={32} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{op.mechanicName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {op.sessionCount} sesi · {fmtRp(op.totalRevenue)}
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        marginTop: 6, height: 3, borderRadius: 2,
                        background: 'var(--border)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${pct}%`,
                          background: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                          transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* AKTIVITAS HARIAN — 14-day bar chart */}
        <div style={{
          border: '1px solid var(--border)', borderRadius: 8,
          background: 'var(--surface)', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              14 HARI TERAKHIR
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Jumlah sesi per hari (fixed 14-day window)
            </div>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {chartData.every((d) => d.count === 0) ? (
              <div style={{
                height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 13,
              }}>
                Belum ada data 14 hari terakhir.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<DynoBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail table ───────────────────────────────────────────────────── */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 8,
        background: 'var(--surface)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              DETAIL SESI
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {report.sessions.length} sesi dyno di periode ini
            </div>
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
                {(['TGL', 'JAM', 'NO REFERENSI', 'CUSTOMER', 'OPERATOR', 'METODE', 'NOMINAL'] as const).map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px', textAlign: h === 'NOMINAL' ? 'right' : 'left',
                      fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                      letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedSessions.map((s) => (
                <tr
                  key={`${s.transactionId}-${s.noReferensi}`}
                  onClick={() => navigate(`/transaksi/${s.transactionId}`)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-alt, rgba(0,0,0,0.03))')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  {/* border-left accent */}
                  <td style={{ padding: '12px 14px', borderLeft: '3px solid var(--accent)', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtShortDate(s.tgl)}</div>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {fmtTime(s.createdAt)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <div
                      style={{
                        fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                        color: 'var(--accent)',
                      }}
                    >
                      {s.noReferensi}
                    </div>
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
                  <td style={{ padding: '12px 14px' }}>
                    <MethodBadge method={s.paymentMethod} />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>
                      {fmtRp(s.nominal)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: '4px 10px', borderRadius: 4,
                  border: `1px solid ${p === page ? 'var(--accent)' : 'var(--border)'}`,
                  background: p === page ? 'var(--accent)' : 'transparent',
                  color: p === page ? '#fff' : 'var(--text)',
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
