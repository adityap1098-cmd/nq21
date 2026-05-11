import { useNavigate } from 'react-router-dom'
import type { CommissionPeriod, CommissionPayout, CommissionRate } from '@/store/types'
import type { PayoutComputed } from '@/store/selectors'
import { fmtPeriodFull, fmtRp, fmtClosedAt, getInitial, FMT } from '../utils'
import { KomisiBadge } from './KomisiBadge'
import { SlipTable } from './SlipTable'

interface Props {
  period: CommissionPeriod
  computed: PayoutComputed
  storedPayout: CommissionPayout | undefined
  rates: CommissionRate[]
  isOwner: boolean
}

export function SlipPaper({ period, computed, storedPayout, rates, isOwner }: Props) {
  const navigate = useNavigate()
  const isOpen = period.status === 'open'
  const initial = getInitial(computed.mechanicName)
  const backdatedCount = computed.lines.filter(l => l.isBackdated).length
  const canMarkPaid = !isOpen && storedPayout?.status === 'pending' && isOwner

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '32px 36px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Watermark */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) rotate(-18deg)',
        fontFamily: 'var(--display)', fontSize: 180,
        color: 'rgba(200,16,46,0.04)', letterSpacing: '0.05em',
        pointerEvents: 'none', userSelect: 'none', zIndex: 0,
      }}>
        {isOpen ? 'DRAFT' : 'FINAL'}
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: 24,
        paddingBottom: 24, borderBottom: '2px solid var(--text)', marginBottom: 24,
        position: 'relative', zIndex: 1,
      }}>
        {/* Brand + title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, background: 'var(--text)', color: '#fff',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--display)', fontSize: 18, borderRadius: 4, flexShrink: 0,
            }}>N</div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '0.08em', color: 'var(--text)' }}>NQ21</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>SLIP BAGI HASIL</div>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 32, letterSpacing: '0.012em', lineHeight: 1.05 }}>
            SLIP KOMISI MEKANIK
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--text-muted)', marginTop: 4 }}>
            {fmtPeriodFull(period.weekStart, period.weekEnd)}
          </div>
        </div>

        {/* Mechanic info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: '#fff',
            display: 'grid', placeItems: 'center', fontFamily: 'var(--display)', fontSize: 28,
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>
              MEKANIK
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '0.012em', lineHeight: 1.1, marginTop: 2 }}>
              {computed.mechanicName}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 2 }}>
              Mekanik
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ position: 'relative', zIndex: 1, overflowX: 'auto' }}>
        <SlipTable
          lines={computed.lines}
          mechanicId={computed.mechanicId}
          rates={rates}
          isPeriodClosed={!isOpen}
        />
      </div>

      {/* Footer */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24,
        marginTop: 28, paddingTop: 20, borderTop: '2px solid var(--text)',
        alignItems: 'center', position: 'relative', zIndex: 1,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)', minWidth: 130 }}>
              JUMLAH JASA
            </span>
            <strong>{computed.totalJobs} jobs</strong>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)', minWidth: 130 }}>
              TOTAL BASIS
            </span>
            <strong>{fmtRp(computed.totalBasis)}</strong>
          </div>
          {backdatedCount > 0 && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--warning)' }}>
              <span>⚠</span>
              <span>{backdatedCount} dari {computed.totalJobs} jasa adalah backdated entry — komisi tetap dibayarkan.</span>
            </div>
          )}
        </div>

        {/* Right: Total Komisi Card */}
        <div style={{
          textAlign: 'right', padding: '18px 24px',
          background: 'var(--text)', color: '#fff',
          borderRadius: 10, borderLeft: '3px solid var(--accent)',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)' }}>
            TOTAL KOMISI DITERIMA
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 44, letterSpacing: '0.012em', lineHeight: 1, marginTop: 4, color: 'var(--accent)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginRight: 6, letterSpacing: '0.04em' }}>Rp</span>
            {FMT.format(computed.totalKomisi)}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.1em' }}>
            Periode {fmtPeriodFull(period.weekStart, period.weekEnd)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--border)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Payout status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {storedPayout ? (
            <>
              <KomisiBadge
                variant={storedPayout.status === 'paid' ? 'paid' : 'pending'}
                label={storedPayout.status === 'paid' ? 'DIBAYAR' : 'PENDING PAYOUT'}
              />
              {storedPayout.status === 'paid' && storedPayout.paidAt && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  · DIBAYAR {fmtClosedAt(storedPayout.paidAt).toUpperCase()}
                </span>
              )}
            </>
          ) : (
            <KomisiBadge variant="pending" label="PENDING PAYOUT" />
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(`/komisi/slip/${period.id}/${computed.mechanicId}`)}
            style={{
              padding: '8px 14px', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer',
            }}
          >
            CETAK
          </button>
          <button
            disabled
            style={{
              padding: '8px 14px', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', cursor: 'not-allowed', opacity: 0.6,
            }}
          >
            PDF
          </button>
          {canMarkPaid && (
            <button
              disabled
              title="Coming in T4"
              style={{
                padding: '8px 18px', borderRadius: 6,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                background: 'var(--text)', border: '1px solid var(--text)',
                color: '#fff', cursor: 'not-allowed', opacity: 0.7,
              }}
            >
              TANDAI DIBAYAR
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
