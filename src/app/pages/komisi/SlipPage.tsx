import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCommissionStore } from '@/store/commission'
import { useTransactionStore } from '@/store/transactions'
import { useMechanicStore } from '@/store/master/mechanics'
import { useCustomerStore } from '@/store/master/customers'
import { useCategoryStore } from '@/store/master/categories'
import { getPayoutsForPeriod } from '@/store/selectors'
import { PrintLayout } from '@/app/layout/PrintLayout'
import { SlipPaper } from '@/features/komisi/components/SlipPaper'
import { SlipPaperCompact } from '@/features/komisi/components/SlipPaperCompact'
import '@/styles/print.css'

type PrintMode = 'compact' | 'detail'

export default function SlipPage() {
  const { periodId, mechanicId } = useParams<{ periodId: string; mechanicId: string }>()
  const navigate = useNavigate()
  const [printMode, setPrintMode] = useState<PrintMode>('compact')

  // Sync print mode to body attribute so @page CSS can target it
  useEffect(() => {
    document.body.dataset.printMode = printMode
    return () => { delete document.body.dataset.printMode }
  }, [printMode])

  const periods = useCommissionStore(s => s.periods)
  const storedPayouts = useCommissionStore(s => s.payouts)
  const { transactions, lines, lineMechanics } = useTransactionStore()
  const { mechanics, rates } = useMechanicStore()
  const { customers } = useCustomerStore()
  const categories = useCategoryStore(s => s.categories)

  const categoryMap = useMemo(() =>
    Object.fromEntries(categories.map(c => [c.id, { name: c.name, type: c.type, isJasa: c.isJasa }])),
    [categories]
  )

  const period = useMemo(() => periods.find(p => p.id === periodId), [periods, periodId])

  const computedPayouts = useMemo(() =>
    period
      ? getPayoutsForPeriod(period, transactions, lines, lineMechanics, rates, mechanics, customers, categoryMap)
      : [],
    [period, transactions, lines, lineMechanics, rates, mechanics, customers, categoryMap]
  )

  const payout = useMemo(() => {
    const live = computedPayouts.find(p => p.mechanicId === mechanicId)
    if (live) return live

    if (period?.status === 'closed') {
      const stored = storedPayouts.find(p => p.periodId === periodId && p.mechanicId === mechanicId)
      if (stored) {
        const mech = mechanics.find(m => m.id === stored.mechanicId)
        return {
          mechanicId: stored.mechanicId,
          mechanicName: mech?.name ?? stored.mechanicId,
          isActive: mech?.isActive ?? false,
          totalJobs: stored.totalJobs,
          totalBasis: stored.totalBasis,
          totalKomisi: stored.totalKomisi,
          lines: [],
        }
      }
    }
    return undefined
  }, [computedPayouts, mechanicId, period, storedPayouts, periodId, mechanics])

  const storedPayout = useMemo(() =>
    storedPayouts.find(p => p.periodId === periodId && p.mechanicId === mechanicId),
    [storedPayouts, periodId, mechanicId]
  )

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
          onClick={() => navigate(-1)}
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
        <SlipPaperCompact period={period} payout={payout} />
      ) : (
        <SlipPaper
          period={period}
          computed={payout}
          storedPayout={storedPayout}
          rates={rates}
          isOwner={false}
          variant="standalone"
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
