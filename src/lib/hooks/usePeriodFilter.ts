import { useState } from 'react'
import { getPeriodRange, type DateRange } from '@/store/selectors'

export type PeriodPreset = 'today' | 'week' | 'month' | 'custom'

const PRESET_MAP: Record<Exclude<PeriodPreset, 'custom'>, Parameters<typeof getPeriodRange>[0]> = {
  today: 'hari-ini',
  week:  'minggu-ini',
  month: 'bulan-ini',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isValidRange(r: DateRange): boolean {
  return ISO_DATE.test(r.start) && ISO_DATE.test(r.end) && r.start <= r.end
}

export interface PeriodFilterState {
  preset: PeriodPreset
  customRange: DateRange | null
  range: DateRange
  setPreset: (p: PeriodPreset) => void
  /** Ignores incomplete or inverted ranges, so the query never runs unbounded. */
  setCustomRange: (r: DateRange) => void
}

export function usePeriodFilter(initial: PeriodPreset = 'week'): PeriodFilterState {
  const [preset, setPresetState] = useState<PeriodPreset>(initial)
  const [customRange, setCustomRangeState] = useState<DateRange | null>(null)

  const presetRange = (p: Exclude<PeriodPreset, 'custom'>) => getPeriodRange(PRESET_MAP[p])

  const range: DateRange =
    preset === 'custom'
      ? customRange ?? presetRange('week')
      : presetRange(preset)

  function setPreset(p: PeriodPreset) {
    // Switching to custom starts from the range currently on screen.
    if (p === 'custom' && preset !== 'custom') setCustomRangeState(range)
    setPresetState(p)
  }

  function setCustomRange(r: DateRange) {
    if (isValidRange(r)) setCustomRangeState(r)
  }

  return { preset, customRange, range, setPreset, setCustomRange }
}
