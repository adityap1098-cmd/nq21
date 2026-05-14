import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useAuditStore } from '@/store/audit'
import {
  useCommissionPeriods,
  useCommissionPayouts,
  useCommissionRates,
  useMechanics,
  usePeriodTransactions,
  computePayoutsFromRows,
  useClosePeriod,
  useMarkPaid,
  useOpenNewPeriod,
  getCurrentWeek,
} from '@/features/komisi/hooks'
import { toast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelectorCard } from '@/features/komisi/components/PeriodSelectorCard'
import { PeriodSummaryPanel } from '@/features/komisi/components/PeriodSummaryPanel'
import { MechanicSlipCard } from '@/features/komisi/components/MechanicSlipCard'
import { SlipPaper } from '@/features/komisi/components/SlipPaper'
import { ClosePeriodDialog } from '@/features/komisi/components/ClosePeriodDialog'
import { MarkPaidDialog } from '@/features/komisi/components/MarkPaidDialog'
import { fmtPeriodFull } from '@/features/komisi/utils'

export default function PeriodeKomisiPage() {
  const navigate = useNavigate()

  const user = useAuthStore(s => s.user)
  const isOwner = user?.role === 'owner'
  const logAudit = useAuditStore(s => s.log)

  const { data: periods = [], isLoading: periodsLoading } = useCommissionPeriods()
  const { data: allPayouts = [] } = useCommissionPayouts()
  const { data: rates = [] } = useCommissionRates()
  const { data: mechanics = [] } = useMechanics()
  const openNewPeriod = useOpenNewPeriod()

  const hasOpenPeriod = periods.some(p => p.status === 'open')
  const currentWeek = getCurrentWeek()
  const currentWeekCovered = periods.some(
    p => p.weekStart <= currentWeek.weekStart && p.weekEnd >= currentWeek.weekEnd
  )
  const showNewPeriodBanner = !periodsLoading && isOwner && !hasOpenPeriod && !currentWeekCovered

  // Top 3 periods, newest first
  const displayPeriods = useMemo(() =>
    [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, 3),
    [periods]
  )

  // Selected period — default to open period, fallback to latest closed
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const sorted = [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      setSelectedPeriodId((sorted.find(p => p.status === 'open') ?? sorted[0])?.id ?? '')
    }
  }, [periods, selectedPeriodId])

  const selectedPeriod = useMemo(() =>
    periods.find(p => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  )

  const isOpenSelected = selectedPeriod?.status === 'open'

  // Fetch transactions for selected period (for live computation)
  const { data: periodTxs = [] } = usePeriodTransactions(
    selectedPeriod?.weekStart,
    selectedPeriod?.weekEnd,
    { enabled: !!selectedPeriod },
  )

  // Compute live payouts for selected period
  const computedPayouts = useMemo(() =>
    selectedPeriod
      ? computePayoutsFromRows(periodTxs, selectedPeriod.weekStart, selectedPeriod.weekEnd, rates)
      : [],
    [periodTxs, selectedPeriod, rates]
  )

  // Stored payouts for selected period (for status badges)
  const periodStoredPayouts = useMemo(() =>
    allPayouts.filter(p => p.periodId === selectedPeriodId),
    [allPayouts, selectedPeriodId]
  )

  // For closed periods with no live tx, fall back to stored payout stubs
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
            isActive: mech?.is_active ?? false,
            totalJobs: sp.totalJobs,
            totalBasis: sp.totalBasis,
            totalKomisi: sp.totalKomisi,
            lines: [],
          }
        })
    }
    return computedPayouts
  }, [computedPayouts, selectedPeriod, periodStoredPayouts, mechanics])

  // Period card stats
  const periodCardStats = useMemo(() =>
    displayPeriods.map(p => {
      const stored = allPayouts.filter(x => x.periodId === p.id)
      if (stored.length > 0) {
        return {
          periodId: p.id,
          totalJobs: stored.reduce((a, x) => a + x.totalJobs, 0),
          totalKomisi: stored.reduce((a, x) => a + x.totalKomisi, 0),
        }
      }
      // Open period — use computed payouts if this is the selected period
      if (p.id === selectedPeriodId) {
        return {
          periodId: p.id,
          totalJobs: displayPayouts.reduce((a, x) => a + x.totalJobs, 0),
          totalKomisi: displayPayouts.reduce((a, x) => a + x.totalKomisi, 0),
        }
      }
      return { periodId: p.id, totalJobs: 0, totalKomisi: 0 }
    }),
    [displayPeriods, allPayouts, selectedPeriodId, displayPayouts]
  )

  // Summary panel stats
  const summaryStats = useMemo(() => {
    const totalJobs = displayPayouts.reduce((a, x) => a + x.totalJobs, 0)
    const totalBasis = displayPayouts.reduce((a, x) => a + x.totalBasis, 0)
    const totalKomisi = displayPayouts.reduce((a, x) => a + x.totalKomisi, 0)
    const mechanicCount = displayPayouts.length
    const paidCount = periodStoredPayouts.filter(p => p.status === 'paid').length
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

  // Close period
  const closePeriod = useClosePeriod()
  const [showClosePeriodDialog, setShowClosePeriodDialog] = useState(false)

  async function handleConfirmClose() {
    if (!selectedPeriod || !user) return
    try {
      await closePeriod.mutateAsync({
        periodId: selectedPeriod.id,
        weekEnd: selectedPeriod.weekEnd,
        closedBy: user.name,
        payouts: computedPayouts.map(p => ({
          mechanicId: p.mechanicId,
          totalJobs: p.totalJobs,
          totalBasis: p.totalBasis,
          totalKomisi: p.totalKomisi,
        })),
      })
      logAudit({
        userId: user.name, action: 'update', entityType: 'period',
        entityId: selectedPeriod.id, source: 'close-period', afterData: { status: 'closed' },
      })
      toast(`Periode ${fmtPeriodFull(selectedPeriod.weekStart, selectedPeriod.weekEnd)} berhasil ditutup`, {
        description: `${computedPayouts.length} payout di-generate.`,
        variant: 'success',
      })
      toast('Periode baru otomatis dibuat', { variant: 'success' })
      setShowClosePeriodDialog(false)
    } catch (err) {
      toast('Gagal menutup periode', { description: (err as Error).message, variant: 'destructive' })
    }
  }

  // Mark paid
  const markPaid = useMarkPaid()
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false)

  async function handleConfirmMarkPaid(paidNotes?: string) {
    if (!selectedPayout || !user) return
    const stored = getStoredPayout(selectedPayout.mechanicId)
    if (!stored) return
    try {
      await markPaid.mutateAsync({ payoutId: stored.id, paidNotes })
      logAudit({
        userId: user.name, action: 'update', entityType: 'payout', entityId: stored.id,
        source: 'mark-paid', beforeData: { status: 'pending' }, afterData: { status: 'paid', paidNotes },
      })
      toast(`Komisi ${selectedPayout.mechanicName} ditandai dibayar`, { variant: 'success' })
      setShowMarkPaidDialog(false)
    } catch (err) {
      toast('Gagal tandai dibayar', { description: (err as Error).message, variant: 'destructive' })
    }
  }

  // ── Loading / empty state ──────────────────────────────────────────────────

  if (periodsLoading) {
    return (
      <>
        <PageHeader title="PERIODE KOMISI" />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
          Memuat...
        </div>
      </>
    )
  }

  if (periods.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--text-muted)', marginBottom: 12 }}>
          Belum Ada Periode
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontFamily: 'var(--mono)', fontSize: 12 }}>
          Buka periode pertama untuk mulai tracking komisi minggu ini.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isOwner && (
            <button
              onClick={() => openNewPeriod.mutate(currentWeek)}
              disabled={openNewPeriod.isPending}
              style={{
                padding: '10px 20px', borderRadius: 6, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', cursor: openNewPeriod.isPending ? 'wait' : 'pointer',
                opacity: openNewPeriod.isPending ? 0.6 : 1,
              }}
            >
              {openNewPeriod.isPending ? 'MEMBUKA...' : `+ BUKA PERIODE ${currentWeek.weekStart} – ${currentWeek.weekEnd}`}
            </button>
          )}
          <button
            onClick={() => navigate('/transaksi/baru')}
            style={{
              padding: '10px 20px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)',
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            + INPUT TRANSAKSI JASA
          </button>
        </div>
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

      {/* New period banner */}
      {showNewPeriodBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', marginBottom: 16,
          background: 'rgba(220,38,38,0.06)', border: '1px solid var(--accent)',
          borderRadius: 8,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>
              PERIODE BARU DIPERLUKAN
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Minggu ini ({currentWeek.weekStart} – {currentWeek.weekEnd}) belum ada periode aktif.
              Transaksi baru tidak akan masuk komisi sampai periode dibuka.
            </div>
          </div>
          <button
            onClick={() => openNewPeriod.mutate(currentWeek)}
            disabled={openNewPeriod.isPending}
            style={{
              flexShrink: 0, marginLeft: 20,
              padding: '8px 18px', borderRadius: 6, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              cursor: openNewPeriod.isPending ? 'wait' : 'pointer', opacity: openNewPeriod.isPending ? 0.6 : 1,
            }}
          >
            {openNewPeriod.isPending ? 'MEMBUKA...' : '+ BUKA PERIODE BARU'}
          </button>
        </div>
      )}

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
              onMarkPaid={() => setShowMarkPaidDialog(true)}
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

      {/* Mark Paid Dialog */}
      {selectedPayout && selectedPeriod && showMarkPaidDialog && (
        <MarkPaidDialog
          open={showMarkPaidDialog}
          payout={selectedPayout}
          period={selectedPeriod}
          onClose={() => setShowMarkPaidDialog(false)}
          onConfirm={handleConfirmMarkPaid}
        />
      )}

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
