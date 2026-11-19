import type { CommissionPeriod, CommissionPayout } from '@/store/types'
import type { PayoutComputed, PayoutLine } from '@/store/selectors'
import type { MechanicRow } from './hooks'

export interface DisplayPayout extends PayoutComputed {
  /** Live recomputation for a CLOSED period (to detect drift); null for open periods. */
  liveTotalKomisi: number | null
}

export const UNKNOWN_MECHANIC_NAME = 'Mekanik tidak dikenal'

function resolveName(
  mechanicId: string,
  mechById: Map<string, MechanicRow>,
  live?: PayoutComputed,
): string {
  const fromMaster = mechById.get(mechanicId)?.name
  if (fromMaster) return fromMaster
  if (live && live.mechanicName !== mechanicId) return live.mechanicName
  return UNKNOWN_MECHANIC_NAME
}

/**
 * Open period: live computation is the truth.
 * Closed period: commission_payouts totals are authoritative. Lines come from the
 * close-time snapshot (commission_payout_lines) when it exists — exactly what was
 * paid, so no drift is possible. Without a snapshot, live lines are shown for detail
 * and liveTotalKomisi exposes any drift (rate/category changed after close).
 */
export function buildDisplayPayouts(
  period: CommissionPeriod,
  computed: PayoutComputed[],
  stored: CommissionPayout[],
  mechanics: MechanicRow[],
  /** false while live transactions are loading/failed: no drift is reported then. */
  liveReady = true,
  /** Close-time line snapshot keyed by mechanic id (closed periods only). */
  snapshotLines?: Map<string, PayoutLine[]>,
): DisplayPayout[] {
  const mechById = new Map(mechanics.map(m => [m.id, m]))

  if (period.status === 'open') {
    return computed.map(c => ({
      ...c,
      mechanicName: resolveName(c.mechanicId, mechById, c),
      liveTotalKomisi: null,
    }))
  }

  const liveById = new Map(computed.map(c => [c.mechanicId, c]))
  const storedIds = new Set(stored.map(s => s.mechanicId))

  const fromStored: DisplayPayout[] = stored.map(sp => {
    const live = liveById.get(sp.mechanicId)
    const snapshot = snapshotLines?.get(sp.mechanicId)
    return {
      mechanicId: sp.mechanicId,
      mechanicName: resolveName(sp.mechanicId, mechById, live),
      isActive: mechById.get(sp.mechanicId)?.is_active ?? live?.isActive ?? false,
      totalJobs: sp.totalJobs,
      totalBasis: sp.totalBasis,
      totalKomisi: sp.totalKomisi,
      lines: snapshot ?? live?.lines ?? [],
      // A snapshot is what was paid: nothing to compare against
      liveTotalKomisi: snapshot ? null : liveReady ? (live?.totalKomisi ?? 0) : null,
    }
  })

  // Live lines with no stored payout: nothing was paid out for them at close time.
  const liveOnly: DisplayPayout[] = computed
    .filter(c => !storedIds.has(c.mechanicId))
    .map(c => ({
      ...c,
      mechanicName: resolveName(c.mechanicId, mechById, c),
      totalJobs: 0,
      totalBasis: 0,
      totalKomisi: 0,
      liveTotalKomisi: c.totalKomisi,
    }))

  return [...fromStored, ...liveOnly].sort((a, b) => b.totalKomisi - a.totalKomisi)
}

/** Open period containing today, else the oldest open period, else the newest period. */
export function pickDefaultPeriod(periods: CommissionPeriod[], today: string): CommissionPeriod | undefined {
  const open = periods.filter(p => p.status === 'open')
  const current = open.find(p => p.weekStart <= today && p.weekEnd >= today)
  if (current) return current
  const oldestOpen = [...open].sort((a, b) => a.weekStart.localeCompare(b.weekStart))[0]
  if (oldestOpen) return oldestOpen
  return [...periods].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
}

/** "2026-07-05" → "05-07-2026" */
export function fmtDmy(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-')
  return `${d}-${m}-${y}`
}
