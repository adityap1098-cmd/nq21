import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useCommissionPeriods,
  useCommissionPayouts,
  useCommissionRates,
  useMechanics,
  usePeriodTransactions,
  usePayoutLineSnapshots,
  computePayoutsFromRows,
} from '@/features/komisi/hooks'
import { buildDisplayPayouts } from '@/features/komisi/display-payouts'
import { PrintLayout } from '@/app/layout/PrintLayout'
import { SlipPaper } from '@/features/komisi/components/SlipPaper'
import { SlipPaperCompact } from '@/features/komisi/components/SlipPaperCompact'
import '@/styles/print.css'

type PrintMode = 'compact' | 'detail'

export default function SlipPage() {
  const { periodId, mechanicId } = useParams<{ periodId: string; mechanicId: string }>()
  const navigate = useNavigate()
  const [printMode, setPrintMode] = useState<PrintMode>('compact')

  useEffect(() => {
    document.body.dataset.printMode = printMode
    return () => { delete document.body.dataset.printMode }
  }, [printMode])

  const { data: periods = [], isLoading: periodsLoading } = useCommissionPeriods()
  const { data: storedPayouts = [], isLoading: payoutsLoading } = useCommissionPayouts(periodId)
  const { data: rates = [] } = useCommissionRates()
  const { data: mechanics = [] } = useMechanics()

  const period = useMemo(() => periods.find(p => p.id === periodId), [periods, periodId])

  const { data: periodTxs = [], isLoading: txLoading, isSuccess: txReady } = usePeriodTransactions(
    period?.weekStart,
    period?.weekEnd,
    { enabled: !!period },
  )

  const { data: snapshotLines, isLoading: snapshotLoading } = usePayoutLineSnapshots(
    periodId,
    { enabled: period?.status === 'closed' },
  )

  const payout = useMemo(() => {
    if (!period) return undefined
    if (period.status === 'closed' && snapshotLoading) return undefined
    const computed = computePayoutsFromRows(periodTxs, period.weekStart, period.weekEnd, rates)
    const periodStored = storedPayouts.filter(p => p.periodId === periodId)
    return buildDisplayPayouts(period, computed, periodStored, mechanics, txReady, snapshotLines)
      .find(p => p.mechanicId === mechanicId)
  }, [period, periodTxs, rates, storedPayouts, periodId, mechanics, mechanicId, txReady, snapshotLines, snapshotLoading])

  const storedPayout = useMemo(() =>
    storedPayouts.find(p => p.periodId === periodId && p.mechanicId === mechanicId),
    [storedPayouts, periodId, mechanicId]
  )

  function handleBack() {
    if (window.history.length <= 1) navigate('/komisi/periode')
    else navigate(-1)
  }

  if (periodsLoading || payoutsLoading || (!!period && txLoading)) {
    return (
      <PrintLayout>
        <div data-print-hide style={{
          textAlign: 'center', padding: '80px 40px',
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)',
        }}>
          Memuat slip...
        </div>
      </PrintLayout>
    )
  }

  if (!period || !payout) {
    return (
      <PrintLayout>
        <div data-print-hide style={{
          textAlign: 'center', padding: '80px 40px',
          fontFamily: 'var(--mono)',
        }}>
          <div style={{ fontSize: 24, color: 'var(--text-muted)', marginBottom: 12 }}>
            Slip tidak ditemukan
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
            Periode atau mekanik tidak valid.
          </div>
          <button
            onClick={() => navigate('/komisi/periode')}
            style={{
              padding: '10px 20px', borderRadius: 6, border: 'none',
              background: 'var(--text)', color: '#fff',
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            ← KEMBALI KE PERIODE
          </button>
        </div>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout>
      {/* Action bar — hidden when printing */}
      <div data-print-hide style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, gap: 12,
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: '8px 14px', borderRadius: 6,
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer',
          }}
        >
          ← KEMBALI
        </button>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--surface-alt)', borderRadius: 8, padding: 4,
          border: '1px solid var(--border)',
        }}>
          {(['compact', 'detail'] as PrintMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setPrintMode(mode)}
              style={{
                padding: '6px 14px', borderRadius: 5,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                background: printMode === mode ? 'var(--surface)' : 'transparent',
                border: 'none',
                color: printMode === mode ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: printMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {mode === 'compact' ? '📄 RINGKAS' : '📋 DETAIL'}
            </button>
          ))}
        </div>

        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 18px', borderRadius: 6,
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            background: 'var(--text)', border: '1px solid var(--text)',
            color: '#fff', cursor: 'pointer',
          }}
        >
          🖨 CETAK
        </button>
      </div>

      {/* Slip paper — conditional on mode */}
      {printMode === 'compact' ? (
        <SlipPaperCompact period={period} payout={payout} liveTotalKomisi={payout.liveTotalKomisi} />
      ) : (
        <SlipPaper
          period={period}
          computed={payout}
          storedPayout={storedPayout}
          rates={rates}
          isOwner={false}
          variant="standalone"
          liveTotalKomisi={payout.liveTotalKomisi}
        />
      )}

      {/* Footer hint — hidden when printing */}
      <div data-print-hide style={{
        marginTop: 12, textAlign: 'center',
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)',
      }}>
        Mode: <strong>{printMode === 'compact' ? 'Ringkas (portrait)' : 'Detail (landscape)'}</strong> · Ctrl+P untuk cetak
      </div>
    </PrintLayout>
  )
}
