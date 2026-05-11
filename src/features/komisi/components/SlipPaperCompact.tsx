import { useMemo } from 'react'
import { parseISO, format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import type { CommissionPeriod } from '@/store/types'
import type { PayoutComputed } from '@/store/selectors'
import { fmtRp, FMT, getInitial, fmtPeriodFull } from '../utils'

interface Props {
  period: CommissionPeriod
  payout: PayoutComputed
}

export function SlipPaperCompact({ period, payout }: Props) {
  const initial = getInitial(payout.mechanicName)
  const hasLines = payout.lines.length > 0
  const backdatedCount = payout.lines.filter(l => l.isBackdated).length

  const printedAt = format(new Date(), "d MMMM yyyy HH:mm", { locale: idLocale })

  const byCategory = useMemo(() => {
    const groups = new Map<string, {
      categoryName: string
      jobs: number
      totalBasis: number
      totalKomisi: number
    }>()
    payout.lines.forEach(line => {
      const existing = groups.get(line.categoryId) ?? {
        categoryName: line.categoryName,
        jobs: 0,
        totalBasis: 0,
        totalKomisi: 0,
      }
      existing.jobs += 1
      existing.totalBasis += Math.round(line.basis * line.sharePercent / 100)
      existing.totalKomisi += line.komisi
      groups.set(line.categoryId, { ...existing })
    })
    return Array.from(groups.values()).sort((a, b) => b.totalKomisi - a.totalKomisi)
  }, [payout.lines])

  const topDays = useMemo(() => {
    const byDay = new Map<string, { dateStr: string; jobs: number; komisi: number }>()
    payout.lines.forEach(line => {
      const key = line.tgl.slice(0, 10)
      const existing = byDay.get(key) ?? { dateStr: key, jobs: 0, komisi: 0 }
      existing.jobs += 1
      existing.komisi += line.komisi
      byDay.set(key, { ...existing })
    })
    return Array.from(byDay.values())
      .sort((a, b) => b.komisi - a.komisi)
      .slice(0, 3)
  }, [payout.lines])

  const periodLabel = fmtPeriodFull(period.weekStart, period.weekEnd)

  return (
    <div className="slip-paper-compact" style={{
      background: '#fff', padding: '32px 36px',
      maxWidth: 700, margin: '0 auto',
    }}>
      {/* Header */}
      <div className="slip-header" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24,
        paddingBottom: 20, borderBottom: '2px solid var(--text)', marginBottom: 20,
      }}>
        <div className="brand-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, background: 'var(--text)', color: '#fff',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--display)', fontSize: 16, borderRadius: 4, flexShrink: 0,
            }}>N</div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: '0.08em' }}>NQ21</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>SLIP BAGI HASIL</div>
            </div>
          </div>
          <div className="title" style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: '0.012em', lineHeight: 1.05 }}>
            SLIP KOMISI MEKANIK
          </div>
          <div className="subtitle" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)', marginTop: 3 }}>
            {periodLabel}
          </div>
        </div>

        <div className="mechanic-section" style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="label" style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)' }}>
            MEKANIK
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <div>
              <div className="name" style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '0.012em', lineHeight: 1.1 }}>
                {payout.mechanicName}
              </div>
              <div className="role" style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 2 }}>
                Mekanik
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', color: '#fff',
              display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontSize: 22, flexShrink: 0,
            }}>
              {initial}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
        marginBottom: 24, paddingBottom: 20, borderBottom: '1px dashed var(--border)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 4 }}>
            JUMLAH JASA
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 28, lineHeight: 1 }}>
            {payout.totalJobs}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>jobs</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 4 }}>
            TOTAL BASIS
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
            {fmtRp(payout.totalBasis)}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 4 }}>
            TOTAL KOMISI
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
            {fmtRp(payout.totalKomisi)}
          </div>
        </div>
      </div>

      {/* Breakdown Per Kategori */}
      {hasLines && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)', marginBottom: 10 }}>
            BREAKDOWN PER KATEGORI
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['KATEGORI', 'JOBS', 'BASIS', 'KOMISI'].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 0 ? 'left' : 'right',
                    fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                    letterSpacing: '0.12em', color: 'var(--text-muted)',
                    padding: '6px 4px', borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byCategory.map(c => (
                <tr key={c.categoryName}>
                  <td style={{ padding: '8px 4px', borderBottom: '1px dashed var(--border)' }}>{c.categoryName}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', padding: '8px 4px', borderBottom: '1px dashed var(--border)' }}>{c.jobs}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', padding: '8px 4px', borderBottom: '1px dashed var(--border)' }}>{fmtRp(c.totalBasis)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, padding: '8px 4px', borderBottom: '1px dashed var(--border)' }}>{fmtRp(c.totalKomisi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Hari */}
      {topDays.length >= 2 && (
        <div style={{
          marginBottom: 20, paddingBottom: 16, borderBottom: '1px dashed var(--border)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--text-muted)', marginBottom: 10 }}>
            HARI KOMISI TERTINGGI
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topDays.map((d, idx) => (
              <div key={d.dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)', marginRight: 8 }}>#{idx + 1}</span>
                  {format(parseISO(d.dateStr), 'd MMM (EEE)', { locale: idLocale })}
                </span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                  {d.jobs} jobs ·{' '}
                  <strong style={{ color: 'var(--text)' }}>{fmtRp(d.komisi)}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backdated note */}
      {backdatedCount > 0 && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderLeft: '3px solid var(--warning)',
          background: 'var(--warning-tint)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--warning)',
        }}>
          ⚠ {backdatedCount} dari {payout.totalJobs} jasa adalah backdated entry — komisi tetap dibayarkan.
        </div>
      )}

      {/* Closed period — no detail available */}
      {!hasLines && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 6,
          background: 'var(--surface-alt)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          Detail baris tersimpan saat periode ditutup — rekap komisi di atas tetap valid.
        </div>
      )}

      {/* Total Komisi Card */}
      <div className="slip-total-card" style={{
        padding: '20px 28px', marginTop: 8,
        background: 'var(--text)', color: '#fff',
        borderRadius: 10, borderLeft: '3px solid var(--accent)',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)' }}>
          TOTAL KOMISI DITERIMA
        </div>
        <div className="slip-komisi-accent" style={{
          fontFamily: 'var(--display)', fontSize: 40, letterSpacing: '0.012em',
          lineHeight: 1, marginTop: 6, color: 'var(--accent)',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginRight: 6, letterSpacing: '0.04em' }}>Rp</span>
          {FMT.format(payout.totalKomisi)}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.1em' }}>
          Periode {periodLabel}
        </div>
      </div>

      {/* Hint (screen only) */}
      <div data-print-hide style={{
        marginTop: 12, padding: '8px 14px', background: 'var(--surface-alt)',
        borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        Untuk detail per transaksi, switch ke mode <strong>Detail</strong>.
      </div>

      {/* Signature */}
      <div className="slip-signature" style={{
        marginTop: 32, paddingTop: 20, borderTop: '1px dashed var(--border)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 20 }}>
            Diterima oleh:
          </div>
          <div style={{ borderBottom: '1px solid var(--text)', marginBottom: 4 }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
            {payout.mechanicName}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 20 }}>
            Tanggal:
          </div>
          <div style={{ borderBottom: '1px solid var(--text)', marginBottom: 4 }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
            ______________________
          </div>
        </div>
      </div>

      {/* Print metadata */}
      <div className="slip-metadata" style={{
        marginTop: 20, paddingTop: 10, borderTop: '1px dashed var(--border)',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-muted)',
      }}>
        <span>Dicetak: {printedAt}</span>
        <span>Periode: {periodLabel} · NQ21 Performance · Internal Use</span>
      </div>
    </div>
  )
}
