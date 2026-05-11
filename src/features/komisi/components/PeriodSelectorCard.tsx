import type { CommissionPeriod } from '@/store/types'
import { fmtPeriodShort, fmtShortDate, fmtClosedAt, fmtRp } from '../utils'
import { KomisiBadge } from './KomisiBadge'

interface Props {
  period: CommissionPeriod
  isSelected: boolean
  totalJobs: number
  totalKomisi: number
  onClick: () => void
}

export function PeriodSelectorCard({ period, isSelected, totalJobs, totalKomisi, onClick }: Props) {
  const isOpen = period.status === 'open'
  const today = new Date().toISOString().slice(0, 10)

  return (
    <button
      onClick={onClick}
      style={{
        background: isSelected && isOpen
          ? 'linear-gradient(180deg, var(--accent-tint) 0%, var(--surface) 100%)'
          : 'var(--surface)',
        border: isSelected
          ? `2px solid ${isOpen ? 'var(--accent)' : 'var(--text)'}`
          : '1px solid var(--border)',
        borderRadius: 10,
        padding: isSelected ? '15px 17px' : '16px 18px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: '100%',
        transition: 'all 0.12s',
      }}
    >
      {/* Badge + jobs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <KomisiBadge variant={isOpen ? 'open' : 'closed'} label={isOpen ? 'AKTIF' : 'CLOSED'} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
          ▸ {totalJobs} JOBS
        </span>
      </div>

      {/* Date range */}
      <div style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '0.012em', lineHeight: 1.1, marginTop: 6 }}>
        {fmtPeriodShort(period.weekStart, period.weekEnd)}
      </div>

      {/* Meta */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
        {isOpen
          ? `Berjalan · ${fmtShortDate(today)}`
          : `Closed ${period.closedAt ? fmtClosedAt(period.closedAt) : '—'}`}
      </div>

      {/* Total komisi */}
      <div style={{
        fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, marginTop: 6,
        color: isSelected && isOpen ? 'var(--accent)' : 'inherit',
      }}>
        {fmtRp(totalKomisi)}
      </div>
    </button>
  )
}
