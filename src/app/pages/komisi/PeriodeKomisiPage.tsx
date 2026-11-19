import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import {
  useCommissionPeriods,
  useCommissionPayouts,
  useCommissionRates,
  useMechanics,
  usePeriodTransactions,
  usePayoutLineSnapshots,
  computePayoutsFromRows,
  useClosePeriod,
  useMarkPaid,
  useOpenNewPeriod,
  getCurrentWeek,
  addDaysToStr,
} from '@/features/komisi/hooks'
import { buildDisplayPayouts, pickDefaultPeriod, fmtDmy } from '@/features/komisi/display-payouts'
import { todayLocal } from '@/lib/format'
import { toast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelectorCard } from '@/features/komisi/components/PeriodSelectorCard'
import { PeriodSummaryPanel } from '@/features/komisi/components/PeriodSummaryPanel'
import { MechanicSlipCard } from '@/features/komisi/components/MechanicSlipCard'
import { SlipPaper } from '@/features/komisi/components/SlipPaper'
import { ClosePeriodDialog } from '@/features/komisi/components/ClosePeriodDialog'
import { MarkPaidDialog } from '@/features/komisi/components/MarkPaidDialog'
import { fmtPeriodFull, fmtShortDate } from '@/features/komisi/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const MOBILE_RECENT_PERIODS = 2

export default function PeriodeKomisiPage() {
  const navigate = useNavigate()

  const user = useAuthStore(s => s.user)
  const isOwner = user?.role === 'owner'

  const { data: periods = [], isLoading: periodsLoading } = useCommissionPeriods()
  const { data: allPayouts = [], isLoading: payoutsLoading } = useCommissionPayouts()
  const { data: rates = [] } = useCommissionRates()
  const { data: mechanics = [] } = useMechanics()
  const openNewPeriod = useOpenNewPeriod()

  const today = todayLocal()
  const currentWeek = getCurrentWeek()
  const todayCovered = periods.some(p => p.weekStart <= today && p.weekEnd >= today)
  const showNewPeriodBanner = !periodsLoading && isOwner && !todayCovered
  const latestWeekEnd = periods.reduce<string | null>(
    (max, p) => (max === null || p.weekEnd > max ? p.weekEnd : max), null,
  )
  const missingSince = latestWeekEnd ? addDaysToStr(latestWeekEnd, 1) : currentWeek.weekStart

  async function handleOpenPeriods() {
    try {
      const result = await openNewPeriod.mutateAsync()
      if (result.created === 0 || !result.first_week_start || !result.last_week_start) {
        toast('Tidak ada periode baru', { description: 'Semua minggu sampai hari ini sudah punya periode.' })
        return
      }
      const lastWeekEnd = addDaysToStr(result.last_week_start, 6)
      toast(
        `${result.created} periode dibuka (${fmtShortDate(result.first_week_start)} – ${fmtShortDate(lastWeekEnd)})`,
        { variant: 'success' },
      )
      setSelectedPeriodId('')
    } catch (err) {
      toast('Gagal membuka periode', { description: (err as Error).message, variant: 'destructive' })
    }
  }

  // All periods, newest first
  const displayPeriods = useMemo(() =>
    [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    [periods]
  )

  // Selected period — open period containing today, else oldest open, else latest
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')

  // Phone: the period list collapses to open periods + the newest few + the selected one
  const isMobile = useIsMobile()
  const [showAllPeriods, setShowAllPeriods] = useState(false)
  const visiblePeriods = useMemo(() => {
    if (!isMobile || showAllPeriods) return displayPeriods
    return displayPeriods.filter((p, i) =>
      p.status === 'open' || p.id === selectedPeriodId || i < MOBILE_RECENT_PERIODS,
    )
  }, [isMobile, showAllPeriods, displayPeriods, selectedPeriodId])
  const hiddenPeriodCount = displayPeriods.length - visiblePeriods.length

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(pickDefaultPeriod(periods, today)?.id ?? '')
    }
  }, [periods, selectedPeriodId, today])

  const selectedPeriod = useMemo(() =>
    periods.find(p => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  )

  const isOpenSelected = selectedPeriod?.status === 'open'
  const closeBlockedReason: string | null = !isOwner
    ? 'Hanya owner yang bisa tutup periode.'
    : selectedPeriod && selectedPeriod.weekEnd >= today
      ? `Periode belum selesai: baru bisa ditutup setelah ${fmtDmy(selectedPeriod.weekEnd)}.`
      : null

  // Fetch transactions for selected period (for live computation)
  const { data: periodTxs = [], isSuccess: periodTxsReady } = usePeriodTransactions(
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

  // Close-time line snapshot (closed periods only)
  const isClosedSelected = selectedPeriod?.status === 'closed'
  const { data: snapshotLines, isLoading: snapshotLoading } = usePayoutLineSnapshots(
    selectedPeriod?.id,
    { enabled: isClosedSelected },
  )

  // Closed period: stored payouts + snapshot lines are authoritative; open period: live computation
  const displayPayouts = useMemo(() => {
    if (!selectedPeriod) return []
    if (selectedPeriod.status === 'closed' && (payoutsLoading || snapshotLoading)) return []
    return buildDisplayPayouts(selectedPeriod, computedPayouts, periodStoredPayouts, mechanics, periodTxsReady, snapshotLines)
  }, [selectedPeriod, payoutsLoading, snapshotLoading, computedPayouts, periodStoredPayouts, mechanics, periodTxsReady, snapshotLines])

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
      // Open period — live totals are only fetched for the selected period
      if (p.id === selectedPeriodId) {
        return {
          periodId: p.id,
          totalJobs: displayPayouts.reduce((a, x) => a + x.totalJobs, 0),
          totalKomisi: displayPayouts.reduce((a, x) => a + x.totalKomisi, 0),
        }
      }
      if (p.status === 'open') return { periodId: p.id, totalJobs: undefined, totalKomisi: undefined }
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
      const result = await closePeriod.mutateAsync({ periodId: selectedPeriod.id })
      toast(`Periode ${fmtPeriodFull(selectedPeriod.weekStart, selectedPeriod.weekEnd)} berhasil ditutup`, {
        description: `${result.payouts} payout di-generate.`,
        variant: 'success',
      })
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
      <div style={{ textAlign: 'center', padding: isMobile ? '48px 4px' : '80px 40px' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--text-muted)', marginBottom: 12 }}>
          Belum Ada Periode
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontFamily: 'var(--mono)', fontSize: 12 }}>
          Buka periode pertama untuk mulai tracking komisi minggu ini.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isOwner ? (
            <button
              onClick={handleOpenPeriods}
              disabled={openNewPeriod.isPending}
              style={{
                padding: '10px 20px', borderRadius: 6, border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', cursor: openNewPeriod.isPending ? 'wait' : 'pointer',
                opacity: openNewPeriod.isPending ? 0.6 : 1,
              }}
            >
              {openNewPeriod.isPending ? 'MEMBUKA...' : `+ BUKA PERIODE ${fmtShortDate(currentWeek.weekStart)} – ${fmtShortDate(currentWeek.weekEnd)}`}
            </button>
          ) : (
            <span style={{ alignSelf: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              Minta owner membuka periode.
            </span>
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
            {isOpenSelected && (
              <span
                title={closeBlockedReason ?? undefined}
                style={{ display: 'inline-flex', cursor: closeBlockedReason ? 'not-allowed' : undefined }}
              >
                <button
                  onClick={() => setShowClosePeriodDialog(true)}
                  disabled={closeBlockedReason !== null}
                  aria-label={closeBlockedReason ? `Tutup periode — ${closeBlockedReason}` : undefined}
                  style={{
                    padding: '8px 18px', borderRadius: 6,
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    background: closeBlockedReason ? 'var(--border)' : 'var(--text)',
                    border: `1px solid ${closeBlockedReason ? 'var(--border)' : 'var(--text)'}`,
                    color: closeBlockedReason ? 'var(--text-muted)' : '#fff',
                    cursor: closeBlockedReason ? 'not-allowed' : 'pointer',
                    opacity: closeBlockedReason ? 0.6 : 1,
                    pointerEvents: closeBlockedReason ? 'none' : undefined,
                  }}
                >
                  TUTUP PERIODE ▶
                </button>
              </span>
            )}
          </div>
        }
      />

      {/* New period banner */}
      {showNewPeriodBanner && (
        <div style={{
          display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? 12 : undefined,
          padding: isMobile ? '12px 14px' : '12px 20px', marginBottom: 16,
          background: 'rgba(220,38,38,0.06)', border: '1px solid var(--accent)',
          borderRadius: 8,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>
              PERIODE BARU DIPERLUKAN
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Belum ada periode sejak {fmtShortDate(missingSince)} (minggu ini: {fmtShortDate(currentWeek.weekStart)} – {fmtShortDate(currentWeek.weekEnd)}).
              Semua minggu yang terlewat dibuka sekaligus, masing-masing Senin – Minggu.
            </div>
          </div>
          <button
            onClick={handleOpenPeriods}
            disabled={openNewPeriod.isPending}
            style={{
              flexShrink: 0, marginLeft: isMobile ? 0 : 20, minHeight: isMobile ? 40 : undefined,
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
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 12,
        marginBottom: isMobile && (hiddenPeriodCount > 0 || showAllPeriods) ? 10 : 16,
      }}>
        {visiblePeriods.map(period => {
          const stats = periodCardStats.find(s => s.periodId === period.id)
          return (
            <PeriodSelectorCard
              key={period.id}
              period={period}
              isSelected={period.id === selectedPeriodId}
              totalJobs={stats?.totalJobs ?? 0}
              totalKomisi={stats?.totalKomisi ?? 0}
              onClick={() => setSelectedPeriodId(period.id)}
              onClosePeriod={isOwner ? () => {
                // Select it first so the dialog previews this period's payouts
                setSelectedPeriodId(period.id)
                setShowClosePeriodDialog(true)
              } : undefined}
            />
          )
        })}
      </div>

      {isMobile && (hiddenPeriodCount > 0 || showAllPeriods) && (
        <button
          type="button"
          onClick={() => setShowAllPeriods(v => !v)}
          aria-expanded={showAllPeriods}
          style={{
            width: '100%', minHeight: 40, marginBottom: 16, borderRadius: 8,
            border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text)',
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          {showAllPeriods ? 'SEMBUNYIKAN PERIODE LAMA ▲' : `TAMPILKAN ${hiddenPeriodCount} PERIODE LAIN ▼`}
        </button>
      )}

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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '320px minmax(0, 1fr)', gap: 16 }}>
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
              liveTotalKomisi={selectedPayout.liveTotalKomisi}
            />
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: isMobile ? '32px 16px' : '48px 36px',
              textAlign: 'center', color: 'var(--text-muted)',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                {isMobile
                  ? 'Pilih mekanik di atas untuk melihat slip komisi.'
                  : 'Pilih mekanik di panel kiri untuk melihat slip komisi.'}
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
          payouts={displayPayouts}
          onClose={() => setShowClosePeriodDialog(false)}
          onConfirm={handleConfirmClose}
        />
      )}
    </div>
  )
}
