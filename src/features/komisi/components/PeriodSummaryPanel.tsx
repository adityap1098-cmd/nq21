import type { CommissionPeriod } from '@/store/types'
import { fmtPeriodFull, fmtRp } from '../utils'
import { KomisiBadge } from './KomisiBadge'

interface Props {
  period: CommissionPeriod
  totalBasis: number
  totalKomisi: number
  totalJobs: number
  mechanicCount: number
  paidCount: number
  totalPayoutCount: number
}

export function PeriodSummaryPanel({
  period, totalBasis, totalKomisi, totalJobs,
  mechanicCount, paidCount, totalPayoutCount,
}: Props) {
  const isOpen = period.status === 'open'
  const payoutDisplay = totalPayoutCount === 0
    ? '—'
    : paidCount === totalPayoutCount && totalPayoutCount > 0
      ? `${paidCount}/${totalPayoutCount} Dibayar`
      : `${paidCount}/${totalPayoutCount}`

  return (
    <div style={{
      background: 'var(--text)', color: '#fff', borderRadius: 12,
      padding: '24px 28px', marginBottom: 16,
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center',
    }}>
      {/* Left: info */}
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)' }}>
          PERIODE TERPILIH
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 36, letterSpacing: '0.012em', lineHeight: 1.05, margin: '6px 0 10px' }}>
          {fmtPeriodFull(period.weekStart, period.weekEnd)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <KomisiBadge variant={isOpen ? 'open' : 'closed'} label={isOpen ? 'OPEN · BERJALAN' : 'CLOSED · LOCKED'} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em' }}>
            {totalJobs} JOBS · {mechanicCount} MEKANIK
          </span>
        </div>
      </div>

      {/* Right: stats */}
      <div style={{ display: 'flex', gap: 28 }}>
        {[
          { label: 'TOTAL BASIS',  value: fmtRp(totalBasis),  accent: false },
          { label: 'TOTAL KOMISI', value: fmtRp(totalKomisi), accent: true  },
          { label: 'PAYOUT',       value: payoutDisplay,       accent: false },
        ].map((stat, i) => (
          <div key={stat.label} style={{
            paddingLeft: i === 0 ? 0 : 28,
            borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.15)',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)' }}>
              {stat.label}
            </div>
            <div style={{
              fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '0.012em', marginTop: 4, lineHeight: 1,
              color: stat.accent ? 'var(--accent)' : '#fff',
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
