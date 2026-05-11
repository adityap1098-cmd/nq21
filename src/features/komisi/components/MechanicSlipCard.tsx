import type { PayoutComputed } from '@/store/selectors'
import { fmtRp, getInitial } from '../utils'
import { KomisiBadge } from './KomisiBadge'

interface Props {
  computed: PayoutComputed
  payoutStatus: 'pending' | 'paid' | undefined
  isSelected: boolean
  isOpenPeriod: boolean
  onClick: () => void
}

export function MechanicSlipCard({ computed, payoutStatus, isSelected, isOpenPeriod, onClick }: Props) {
  const initial = getInitial(computed.mechanicName)
  const badgeVariant = payoutStatus === 'paid' ? 'paid' : 'pending'
  const badgeLabel  = payoutStatus === 'paid' ? 'DIBAYAR' : 'PENDING'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto',
        gap: 10, alignItems: 'center',
        padding: '10px 12px',
        border: `1px solid ${isSelected ? 'var(--text)' : 'var(--border)'}`,
        borderRadius: 8,
        background: isSelected ? 'var(--surface-alt)' : 'var(--surface)',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.12s', width: '100%',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: isSelected ? 'var(--accent)' : 'var(--text)',
        color: '#fff', display: 'grid', placeItems: 'center',
        fontFamily: 'var(--display)', fontSize: 16, flexShrink: 0,
      }}>
        {initial}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {computed.mechanicName}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em' }}>
          {computed.totalJobs} jobs · basis {fmtRp(computed.totalBasis)}
        </div>
      </div>

      {/* Komisi + badge */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
          color: isOpenPeriod ? 'var(--accent)' : isSelected ? 'var(--accent)' : 'inherit',
        }}>
          {fmtRp(computed.totalKomisi)}
        </div>
        <div style={{ marginTop: 4 }}>
          <KomisiBadge variant={badgeVariant} label={badgeLabel} small />
        </div>
      </div>
    </button>
  )
}
