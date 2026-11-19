import type { CommissionPeriod } from '@/store/types'
import { fmtPeriodShort, fmtShortDate, fmtClosedAt, fmtRp } from '../utils'
import { KomisiBadge } from './KomisiBadge'
import { todayLocal } from '@/lib/format'

interface Props {
  period: CommissionPeriod
  isSelected: boolean
  /** undefined = not loaded (open, unselected period) */
  totalJobs?: number
  totalKomisi?: number
  onClick: () => void
  /** Owner only: shown on open periods. Called to open the close-period dialog. */
  onClosePeriod?: () => void
}

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** First day the period can be closed (the day after week_end), e.g. "Sen, 23 Nov". */
function closableFrom(weekEnd: string): string {
  const [y, m, d] = weekEnd.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
  return `${DAY_SHORT[next.getDay()]}, ${fmtShortDate(iso)}`
}

export function PeriodSelectorCard({ period, isSelected, totalJobs, totalKomisi, onClick, onClosePeriod }: Props) {
  const isOpen = period.status === 'open'
  const today = todayLocal()
  const isCurrent = period.weekStart <= today && period.weekEnd >= today
  const hasEnded = period.weekEnd < today
  const openMeta = isCurrent
    ? `Berjalan · ${fmtShortDate(today)}`
    : hasEnded
      ? 'Selesai · belum ditutup'
      : 'Belum dimulai'
  const showCloseAction = isOpen && onClosePeriod !== undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
        <KomisiBadge variant={isOpen ? 'open' : 'closed'} label={isOpen ? 'OPEN' : 'CLOSED'} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
          ▸ {totalJobs ?? '—'} JOBS
        </span>
      </div>

      {/* Date range */}
      <div style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '0.012em', lineHeight: 1.1, marginTop: 6 }}>
        {fmtPeriodShort(period.weekStart, period.weekEnd)}
      </div>

      {/* Meta */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
        {isOpen
          ? openMeta
          : `Closed ${period.closedAt ? fmtClosedAt(period.closedAt) : '—'}`}
      </div>

      {/* Total komisi */}
      <div style={{
        fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, marginTop: 6,
        color: isSelected && isOpen ? 'var(--accent)' : 'inherit',
      }}>
        {totalKomisi === undefined ? 'Rp —' : fmtRp(totalKomisi)}
      </div>
    </button>

    {showCloseAction && (hasEnded ? (
      <button
        type="button"
        onClick={onClosePeriod}
        title={`Tutup periode ${fmtPeriodShort(period.weekStart, period.weekEnd)} dan generate payout`}
        style={{
          padding: '7px 10px', borderRadius: 6, border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
          cursor: 'pointer',
        }}
      >
        TUTUP PERIODE ▶
      </button>
    ) : (
      <div
        title="Periode baru bisa ditutup setelah hari Minggu terakhirnya lewat"
        style={{
          padding: '6px 10px', borderRadius: 6, border: '1px dashed var(--border)',
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em',
          color: 'var(--text-muted)', textAlign: 'center',
        }}
      >
        Bisa ditutup mulai {closableFrom(period.weekEnd)}
      </div>
    ))}
    </div>
  )
}
