import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useAuditStore } from '@/store/audit'
import { useCommissionPeriods, useCommissionPayouts, useMechanics, useMarkPaid } from '@/features/komisi/hooks'
import { toast } from '@/hooks/use-toast'
import { exportCSV, fmtDate } from '@/lib/csv'
import { PageHeader } from '@/components/nq21/PageHeader'
import { KomisiBadge } from '@/features/komisi/components/KomisiBadge'
import { MarkPaidDialog } from '@/features/komisi/components/MarkPaidDialog'
import { fmtPeriodShort, fmtClosedAt, fmtRp, getInitial, FMT } from '@/features/komisi/utils'
import type { CommissionPayout } from '@/store/types'
import type { PayoutComputed } from '@/store/selectors'

type StatusFilter = 'all' | 'pending' | 'paid'
type PeriodFilter = 'all' | 'bulan-ini'
type SortKey = 'period' | 'komisi' | 'status'
type SortDir = 'asc' | 'desc'

function currentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return { start: `${y}-${m}-01`, end: `${y}-${m}-31` }
}

export default function MekanikKomisiPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const isOwner = user?.role === 'owner'
  const logAudit = useAuditStore(s => s.log)

  const { data: periods = [] } = useCommissionPeriods()
  const { data: allPayouts = [], isLoading } = useCommissionPayouts()
  const { data: mechanics = [] } = useMechanics()
  const markPaidMutation = useMarkPaid()

  // ── Filters ──────────────────────────────────────────────────────────────
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [mechanicFilter, setMechanicFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('period')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // ── Mark Paid ─────────────────────────────────────────────────────────────
  const [markPaidTarget, setMarkPaidTarget] = useState<{
    payout: CommissionPayout
    computed: PayoutComputed
    period: (typeof periods)[0]
  } | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleMechanic(id: string) {
    setMechanicFilter(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ── Computed data ──────────────────────────────────────────────────────────
  const periodMap = useMemo(
    () => new Map(periods.map(p => [p.id, p])),
    [periods]
  )
  const mechanicMap = useMemo(
    () => new Map(mechanics.map(m => [m.id, m])),
    [mechanics]
  )

  const monthRange = useMemo(() => currentMonthRange(), [])

  const filtered = useMemo(() => {
    let result = allPayouts

    if (periodFilter === 'bulan-ini') {
      result = result.filter(p => {
        const per = periodMap.get(p.periodId)
        return per && per.weekStart >= monthRange.start && per.weekStart <= monthRange.end
      })
    }

    if (mechanicFilter.length > 0) {
      result = result.filter(p => mechanicFilter.includes(p.mechanicId))
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }

    return [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'period') {
        const pa = periodMap.get(a.periodId)?.weekStart ?? ''
        const pb = periodMap.get(b.periodId)?.weekStart ?? ''
        cmp = pa.localeCompare(pb)
      } else if (sortKey === 'komisi') {
        cmp = a.totalKomisi - b.totalKomisi
      } else if (sortKey === 'status') {
        cmp = a.status.localeCompare(b.status)
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [allPayouts, periodFilter, mechanicFilter, statusFilter, sortKey, sortDir, periodMap, monthRange])

  const summary = useMemo(() => ({
    totalKomisi: filtered.reduce((s, p) => s + p.totalKomisi, 0),
    pending: filtered.filter(p => p.status === 'pending').reduce((s, p) => s + p.totalKomisi, 0),
    paid: filtered.filter(p => p.status === 'paid').reduce((s, p) => s + p.totalKomisi, 0),
  }), [filtered])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleConfirmMarkPaid(paidNotes?: string) {
    if (!markPaidTarget || !user) return
    const { payout, period } = markPaidTarget
    try {
      await markPaidMutation.mutateAsync({ payoutId: payout.id, paidNotes })
      logAudit({
        userId: user.name, action: 'update', entityType: 'payout', entityId: payout.id,
        source: 'mark-paid-overview', beforeData: { status: 'pending' }, afterData: { status: 'paid', paidNotes },
      })
      const mechName = mechanicMap.get(payout.mechanicId)?.name ?? payout.mechanicId
      toast(`Komisi ${mechName} (${fmtPeriodShort(period.weekStart, period.weekEnd)}) ditandai dibayar`, { variant: 'success' })
      setMarkPaidTarget(null)
    } catch (err) {
      toast('Gagal tandai dibayar', { description: (err as Error).message, variant: 'destructive' })
    }
  }

  function handleExportCSV() {
    const rows = filtered.map(p => {
      const per = periodMap.get(p.periodId)
      const mech = mechanicMap.get(p.mechanicId)
      return {
        mekanik: mech?.name ?? p.mechanicId,
        periode: per ? fmtPeriodShort(per.weekStart, per.weekEnd) : p.periodId,
        jobs: p.totalJobs,
        basis: p.totalBasis,
        komisi: p.totalKomisi,
        status: p.status === 'pending' ? 'PENDING' : 'PAID',
        dibayar: p.paidAt ?? '',
        catatan: p.paidNotes ?? '',
      }
    })
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    exportCSV(rows, [
      { key: 'mekanik', label: 'Mekanik' },
      { key: 'periode', label: 'Periode' },
      { key: 'jobs', label: 'Jumlah Jasa' },
      { key: 'basis', label: 'Total Basis (Rp)', format: v => String(v) },
      { key: 'komisi', label: 'Total Komisi (Rp)', format: v => String(v) },
      { key: 'status', label: 'Status' },
      { key: 'dibayar', label: 'Tanggal Dibayar', format: v => fmtDate(v) },
      { key: 'catatan', label: 'Catatan' },
    ], `nq21-komisi-overview-${ts}`)
  }

  // ── Active mechanic list for filter chips ─────────────────────────────────
  const mechanicsWithPayouts = useMemo(() => {
    const ids = new Set(allPayouts.map(p => p.mechanicId))
    return mechanics.filter(m => ids.has(m.id))
  }, [allPayouts, mechanics])

  // ── Sort indicator ─────────────────────────────────────────────────────────
  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'desc' ? ' ▼' : ' ▲'
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const TH: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left',
    fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.14em',
    color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
  }
  const TD: React.CSSProperties = {
    padding: '12px 12px', borderBottom: '1px dashed var(--border)',
    verticalAlign: 'middle',
  }

  // ── Loading / empty state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <PageHeader title="MEKANIK & KOMISI" subtitle="Overview komisi per mekanik lintas periode + status pembayaran" />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          Memuat...
        </div>
      </div>
    )
  }

  if (allPayouts.length === 0) {
    return (
      <div>
        <PageHeader title="MEKANIK & KOMISI" subtitle="Overview komisi per mekanik lintas periode + status pembayaran" />
        <div style={{
          textAlign: 'center', padding: '80px 40px',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--text-muted)', marginBottom: 8 }}>
            Belum Ada Payout
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            Payout dibuat otomatis saat periode komisi ditutup.
          </p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
            Buka periode aktif, input transaksi jasa, lalu tutup periode untuk generate payout pertama.
          </p>
          <button
            onClick={() => navigate('/komisi/periode')}
            style={{
              padding: '10px 20px', borderRadius: 6, border: 'none',
              background: 'var(--text)', color: '#fff',
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            KE PERIODE KOMISI
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="MEKANIK & KOMISI"
        subtitle="Overview komisi per mekanik lintas periode + status pembayaran"
        action={
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            EXPORT CSV
          </button>
        }
      />

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16,
        padding: '14px 16px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 10,
        alignItems: 'center',
      }}>
        {/* Period filter */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>PERIODE</span>
          {(['all', 'bulan-ini'] as PeriodFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              style={{
                padding: '4px 10px', borderRadius: 20,
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                border: '1px solid',
                borderColor: periodFilter === p ? 'var(--text)' : 'var(--border)',
                background: periodFilter === p ? 'var(--text)' : 'transparent',
                color: periodFilter === p ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {p === 'all' ? 'SEMUA' : 'BULAN INI'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Mechanic filter chips */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>MEKANIK</span>
          {mechanicsWithPayouts.map(m => {
            const active = mechanicFilter.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleMechanic(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 8px', borderRadius: 20,
                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
                  border: '1px solid',
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  background: active ? 'rgba(200,16,46,0.06)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: active ? 'var(--accent)' : 'var(--text-muted)',
                  color: '#fff', display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--display)', fontSize: 10, flexShrink: 0,
                }}>
                  {getInitial(m.name)}
                </span>
                {m.name}
              </button>
            )
          })}
          {mechanicFilter.length > 0 && (
            <button
              onClick={() => setMechanicFilter([])}
              style={{
                fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              reset
            </button>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>STATUS</span>
          {(['all', 'pending', 'paid'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 10px', borderRadius: 20,
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                border: '1px solid',
                borderColor: statusFilter === s
                  ? s === 'pending' ? 'var(--warning)' : s === 'paid' ? 'var(--success)' : 'var(--text)'
                  : 'var(--border)',
                background: statusFilter === s
                  ? s === 'pending' ? 'var(--warning-tint)' : s === 'paid' ? 'var(--success-tint)' : 'var(--text)'
                  : 'transparent',
                color: statusFilter === s
                  ? s === 'pending' ? 'var(--warning)' : s === 'paid' ? 'var(--success)' : '#fff'
                  : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {s === 'all' ? 'SEMUA' : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TOTAL KOMISI', value: summary.totalKomisi, color: 'var(--text)' },
          { label: 'PENDING PAYOUT', value: summary.pending, color: 'var(--warning)' },
          { label: 'SUDAH DIBAYAR', value: summary.paid, color: 'var(--success)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 20px',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--text-muted)', marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: '0.012em', color }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, marginRight: 4, color: 'var(--text-muted)' }}>Rp</span>
              {FMT.format(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)',
          }}>
            Tidak ada payout yang cocok dengan filter aktif.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={TH}>MEKANIK</th>
                  <th
                    style={{ ...TH, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('period')}
                  >
                    PERIODE{sortIndicator('period')}
                  </th>
                  <th style={{ ...TH, textAlign: 'right' }}>JOBS</th>
                  <th style={{ ...TH, textAlign: 'right' }}>TOTAL BASIS</th>
                  <th
                    style={{ ...TH, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('komisi')}
                  >
                    TOTAL KOMISI{sortIndicator('komisi')}
                  </th>
                  <th
                    style={{ ...TH, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('status')}
                  >
                    STATUS{sortIndicator('status')}
                  </th>
                  <th style={TH}>DIBAYAR</th>
                  <th style={{ ...TH, textAlign: 'right' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payout, idx) => {
                  const mech = mechanicMap.get(payout.mechanicId)
                  const per = periodMap.get(payout.periodId)
                  const isLast = idx === filtered.length - 1
                  const tdStyle: React.CSSProperties = { ...TD, borderBottom: isLast ? 'none' : TD.borderBottom as string }

                  return (
                    <tr
                      key={payout.id}
                      style={{ transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* MEKANIK */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: 'var(--accent)', color: '#fff',
                            display: 'grid', placeItems: 'center',
                            fontFamily: 'var(--display)', fontSize: 15, flexShrink: 0,
                          }}>
                            {getInitial(mech?.name ?? payout.mechanicId)}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--display)', fontSize: 13 }}>
                              {mech?.name ?? payout.mechanicId}
                            </div>
                            {mech && !mech.is_active && (
                              <span style={{
                                display: 'inline-block', padding: '1px 5px', borderRadius: 3,
                                fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700,
                                background: 'var(--surface-alt)', color: 'var(--text-muted)',
                                letterSpacing: '0.06em',
                              }}>
                                NONAKTIF
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* PERIODE */}
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {per ? fmtPeriodShort(per.weekStart, per.weekEnd) : payout.periodId}
                        {per?.status === 'closed' && (
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                            Ditutup {per.closedAt ? fmtClosedAt(per.closedAt) : ''}
                          </div>
                        )}
                      </td>

                      {/* JOBS */}
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>
                        {payout.totalJobs}
                      </td>

                      {/* BASIS */}
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmtRp(payout.totalBasis)}
                      </td>

                      {/* KOMISI */}
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                        {fmtRp(payout.totalKomisi)}
                      </td>

                      {/* STATUS */}
                      <td style={tdStyle}>
                        <KomisiBadge
                          variant={payout.status === 'paid' ? 'paid' : 'pending'}
                          label={payout.status === 'paid' ? 'DIBAYAR' : 'PENDING'}
                          small
                        />
                      </td>

                      {/* DIBAYAR */}
                      <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {payout.paidAt ? (
                          <div>
                            <div>{fmtClosedAt(payout.paidAt)}</div>
                            {payout.paidNotes && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>
                                {payout.paidNotes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {payout.status === 'pending' && isOwner && per && (
                            <button
                              onClick={() => {
                                const computed: PayoutComputed = {
                                  mechanicId: payout.mechanicId,
                                  mechanicName: mech?.name ?? payout.mechanicId,
                                  isActive: mech?.is_active ?? false,
                                  totalJobs: payout.totalJobs,
                                  totalBasis: payout.totalBasis,
                                  totalKomisi: payout.totalKomisi,
                                  lines: [],
                                }
                                setMarkPaidTarget({ payout, computed, period: per })
                              }}
                              style={{
                                padding: '5px 10px', borderRadius: 4,
                                fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
                                background: 'var(--text)', border: '1px solid var(--text)',
                                color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              TANDAI DIBAYAR
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/komisi/slip/${payout.periodId}/${payout.mechanicId}`)}
                            style={{
                              padding: '5px 10px', borderRadius: 4,
                              fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
                              background: 'transparent', border: '1px solid var(--border)',
                              color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            LIHAT SLIP
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results count */}
      {filtered.length > 0 && (
        <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>
          {filtered.length} payout · Total komisi {fmtRp(summary.totalKomisi)}
        </div>
      )}

      {/* Mark Paid Dialog */}
      {markPaidTarget && (
        <MarkPaidDialog
          open={!!markPaidTarget}
          payout={markPaidTarget.computed}
          period={markPaidTarget.period}
          onClose={() => setMarkPaidTarget(null)}
          onConfirm={handleConfirmMarkPaid}
        />
      )}
    </div>
  )
}
