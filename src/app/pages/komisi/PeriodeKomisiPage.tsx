import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommissionStore } from '@/store/commission'
import { useTransactionStore } from '@/store/transactions'
import { useMechanicStore } from '@/store/master/mechanics'
import { useCustomerStore } from '@/store/master/customers'
import { useCategoryStore } from '@/store/master/categories'
import { useAuthStore } from '@/store/auth'
import { useAuditStore } from '@/store/audit'
import { getPayoutsForPeriod } from '@/store/selectors'
import { toast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelectorCard } from '@/features/komisi/components/PeriodSelectorCard'
import { PeriodSummaryPanel } from '@/features/komisi/components/PeriodSummaryPanel'
import { MechanicSlipCard } from '@/features/komisi/components/MechanicSlipCard'
import { SlipPaper } from '@/features/komisi/components/SlipPaper'
import { ClosePeriodDialog } from '@/features/komisi/components/ClosePeriodDialog'
import { fmtPeriodFull } from '@/features/komisi/utils'

export default function PeriodeKomisiPage() {
  const navigate = useNavigate()

  const { periods, payouts: storedPayouts, closeAndGeneratePayouts } = useCommissionStore()
  const logAudit = useAuditStore(s => s.log)
  const { transactions, lines: transactionLines, lineMechanics } = useTransactionStore()
  const { mechanics, rates } = useMechanicStore()
  const { customers } = useCustomerStore()
  const categories = useCategoryStore(s => s.categories)
  const user = useAuthStore(s => s.user)
  const isOwner = user?.role === 'owner'

  const categoryMap = useMemo(() =>
    Object.fromEntries(categories.map(c => [c.id, { name: c.name, type: c.type, isJasa: c.isJasa }])),
    [categories]
  )

  // Top 3 periods, newest first
  const displayPeriods = useMemo(() =>
    [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 3),
    [periods]
  )

  // Default: open period, fallback latest closed
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    const sorted = [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    return (sorted.find(p => p.status === 'open') ?? sorted[0])?.id ?? ''
  })

  const selectedPeriod = useMemo(() =>
    periods.find(p => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  )

  const isOpenSelected = selectedPeriod?.status === 'open'

  // Period card stats (use stored payouts for closed, computed for open)
  const periodCardStats = useMemo(() =>
    displayPeriods.map(p => {
      const stored = storedPayouts.filter(x => x.periodId === p.id)
      if (stored.length > 0) {
        return {
          periodId: p.id,
          totalJobs: stored.reduce((a, x) => a + x.totalJobs, 0),
          totalKomisi: stored.reduce((a, x) => a + x.totalKomisi, 0),
        }
      }
      const computed = getPayoutsForPeriod(
        p, transactions, transactionLines, lineMechanics, rates, mechanics, customers, categoryMap
      )
      return {
        periodId: p.id,
        totalJobs: computed.reduce((a, x) => a + x.totalJobs, 0),
        totalKomisi: computed.reduce((a, x) => a + x.totalKomisi, 0),
      }
    }),
    [displayPeriods, storedPayouts, transactions, transactionLines, lineMechanics, rates, mechanics, customers, categoryMap]
  )

  // Full computed payouts for selected period (with line detail for slip viewer)
  const computedPayouts = useMemo(() =>
    selectedPeriod
      ? getPayoutsForPeriod(
          selectedPeriod, transactions, transactionLines, lineMechanics, rates, mechanics, customers, categoryMap
        )
      : [],
    [selectedPeriod, transactions, transactionLines, lineMechanics, rates, mechanics, customers, categoryMap]
  )

  // Stored payouts for selected period (for status badges)
  const periodStoredPayouts = useMemo(() =>
    storedPayouts.filter(p => p.periodId === selectedPeriodId),
    [storedPayouts, selectedPeriodId]
  )

  // For closed periods with no live transactions in range, fall back to stored payout stubs
  // so the sidebar and slip paper still show correct totals.
  const displayPayouts = useMemo(() => {
    if (computedPayouts.length > 0) return computedPayouts
    if (selectedPeriod?.status === 'closed' && periodStoredPayouts.length > 0) {
      return [...periodStoredPayouts]
        .sort((a, b) => b.totalKomisi - a.totalKomisi)
        .map(sp => {
          const mech = mechanics.find(m => m.id === sp.mechanicId)
          return {
            mechanicId: sp.mechanicId,
            mechanicName: mech?.name ?? sp.mechanicId,
            isActive: mech?.isActive ?? false,
            totalJobs: sp.totalJobs,
            totalBasis: sp.totalBasis,
            totalKomisi: sp.totalKomisi,
            lines: [],
          }
        })
    }
    return computedPayouts
  }, [computedPayouts, selectedPeriod, periodStoredPayouts, mechanics])

  // Summary panel stats
  const summaryStats = useMemo(() => {
    const totalJobs    = displayPayouts.reduce((a, x) => a + x.totalJobs, 0)
    const totalBasis   = displayPayouts.reduce((a, x) => a + x.totalBasis, 0)
    const totalKomisi  = displayPayouts.reduce((a, x) => a + x.totalKomisi, 0)
    const mechanicCount = displayPayouts.length
    const paidCount    = periodStoredPayouts.filter(p => p.status === 'paid').length
    // Open: totalPayoutCount = expected mechanic count; Closed: actual stored payouts count
    const totalPayoutCount = periodStoredPayouts.length > 0
      ? periodStoredPayouts.length
      : mechanicCount
    return { totalJobs, totalBasis, totalKomisi, mechanicCount, paidCount, totalPayoutCount }
  }, [displayPayouts, periodStoredPayouts])

  // Mechanic selection — reset on period change
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedMechanicId(null)
  }, [selectedPeriodId])

  // Derive effective mechanic (fallback to first sorted by komisi desc)
  const effectiveMechanicId = useMemo(() => {
    if (selectedMechanicId && displayPayouts.some(p => p.mechanicId === selectedMechanicId)) {
      return selectedMechanicId
    }
    return displayPayouts[0]?.mechanicId ?? null
  }, [selectedMechanicId, displayPayouts])

  const selectedPayout = useMemo(() =>
    displayPayouts.find(p => p.mechanicId === effectiveMechanicId),
    [displayPayouts, effectiveMechanicId]
  )

  const getStoredPayout = (mechanicId: string) =>
    periodStoredPayouts.find(p => p.mechanicId === mechanicId)

  // Close period dialog
  const [showClosePeriodDialog, setShowClosePeriodDialog] = useState(false)

  async function handleConfirmClose() {
    if (!selectedPeriod || !user) return
    const result = closeAndGeneratePayouts(
      selectedPeriod.id,
      user.username,
      computedPayouts.map(p => ({
        mechanicId: p.mechanicId,
        totalJobs: p.totalJobs,
        totalBasis: p.totalBasis,
        totalKomisi: p.totalKomisi,
      }))
    )
    logAudit({ userId: user.username, action: 'update', entityType: 'period', entityId: selectedPeriod.id, source: 'close-period', afterData: { status: 'closed' } })
    computedPayouts.forEach(p => {
      logAudit({ userId: user.username, action: 'create', entityType: 'payout', entityId: `${selectedPeriod.id}:${p.mechanicId}`, source: 'close-period' })
    })
    toast(`Periode ${fmtPeriodFull(selectedPeriod.weekStart, selectedPeriod.weekEnd)} berhasil ditutup`, {
      description: `${computedPayouts.length} payout di-generate.`,
      variant: 'success',
    })
    if (result.nextPeriodId) {
      toast('Periode baru otomatis dibuat', { variant: 'success' })
    }
    setShowClosePeriodDialog(false)
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (periods.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--text-muted)', marginBottom: 12 }}>
          Belum Ada Periode
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontFamily: 'var(--mono)', fontSize: 12 }}>
          Periode pertama akan otomatis dibuat saat input transaksi jasa.
        </p>
        <button
          onClick={() => navigate('/transaksi/baru')}
          style={{
            padding: '10px 20px', borderRadius: 6, border: 'none',
            background: 'var(--text)', color: '#fff',
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          + INPUT TRANSAKSI JASA
        </button>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="PERIODE KOMISI"
        subtitle="Senin – Minggu · Tutup periode untuk lock & generate slip bagi hasil"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled
              style={{
                padding: '8px 14px', borderRadius: 6,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'not-allowed', opacity: 0.55,
              }}
            >
              CETAK SEMUA SLIP
            </button>
            {isOpenSelected && (() => {
              const noJasa = computedPayouts.length === 0
              const notOwner = !isOwner
              const disabled = noJasa || notOwner
              const title = notOwner
                ? 'Hanya owner yang bisa tutup periode.'
                : noJasa
                  ? 'Belum ada jasa di periode ini. Input transaksi jasa dulu.'
                  : undefined
              return (
                <button
                  onClick={() => setShowClosePeriodDialog(true)}
                  disabled={disabled}
                  title={title}
                  style={{
                    padding: '8px 18px', borderRadius: 6,
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    background: disabled ? 'var(--border)' : 'var(--text)',
                    border: `1px solid ${disabled ? 'var(--border)' : 'var(--text)'}`,
                    color: disabled ? 'var(--text-muted)' : '#fff',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  TUTUP PERIODE ▶
                </button>
              )
            })()}
          </div>
        }
      />

      {/* Period selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {displayPeriods.map(period => {
          const stats = periodCardStats.find(s => s.periodId === period.id)
          return (
            <PeriodSelectorCard
              key={period.id}
              period={period}
              isSelected={period.id === selectedPeriodId}
              totalJobs={stats?.totalJobs ?? 0}
              totalKomisi={stats?.totalKomisi ?? 0}
              onClick={() => setSelectedPeriodId(period.id)}
            />
          )
        })}
      </div>

      {/* Summary dark panel */}
      {selectedPeriod && (
        <PeriodSummaryPanel
          period={selectedPeriod}
          totalBasis={summaryStats.totalBasis}
          totalKomisi={summaryStats.totalKomisi}
          totalJobs={summaryStats.totalJobs}
          mechanicCount={summaryStats.mechanicCount}
          paidCount={summaryStats.paidCount}
          totalPayoutCount={summaryStats.totalPayoutCount}
        />
      )}

      {/* Slip layout: 320px sidebar + 1fr paper */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 16 }}>
        {/* Left: mechanic sidebar */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 14,
          display: 'flex', flexDirection: 'column', gap: 8,
          height: 'fit-content',
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--accent)',
            padding: '6px 10px 10px', fontWeight: 700, borderBottom: '1px solid var(--border)',
          }}>
            SLIP PER MEKANIK
          </div>

          {displayPayouts.length === 0 ? (
            <div style={{
              padding: '24px 10px', textAlign: 'center',
              color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 11,
            }}>
              Belum ada mekanik dengan jasa di periode ini.
            </div>
          ) : (
            displayPayouts.map(payout => (
              <MechanicSlipCard
                key={payout.mechanicId}
                computed={payout}
                payoutStatus={getStoredPayout(payout.mechanicId)?.status}
                isSelected={payout.mechanicId === effectiveMechanicId}
                isOpenPeriod={isOpenSelected ?? false}
                onClick={() => setSelectedMechanicId(payout.mechanicId)}
              />
            ))
          )}
        </div>

        {/* Right: slip paper */}
        <div>
          {selectedPayout && selectedPeriod ? (
            <SlipPaper
              period={selectedPeriod}
              computed={selectedPayout}
              storedPayout={getStoredPayout(selectedPayout.mechanicId)}
              rates={rates}
              isOwner={isOwner}
            />
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '48px 36px',
              textAlign: 'center', color: 'var(--text-muted)',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                Pilih mekanik di panel kiri untuk melihat slip komisi.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close Period Dialog */}
      {selectedPeriod && showClosePeriodDialog && (
        <ClosePeriodDialog
          open={showClosePeriodDialog}
          period={selectedPeriod}
          payouts={computedPayouts}
          onClose={() => setShowClosePeriodDialog(false)}
          onConfirm={handleConfirmClose}
        />
      )}
    </div>
  )
}
