import { useState } from 'react'
import { getPeriodRange, type DateRange } from '@/store/selectors'

export type PeriodPreset = 'today' | 'week' | 'month' | 'custom'

const PRESET_MAP: Record<Exclude<PeriodPreset, 'custom'>, Parameters<typeof getPeriodRange>[0]> = {
  today: 'hari-ini',
  week:  'minggu-ini',
  month: 'bulan-ini',
}

export interface PeriodFilterState {
  preset: PeriodPreset
  customRange: DateRange | null
  range: DateRange
  setPreset: (p: PeriodPreset) => void
  setCustomRange: (r: DateRange) => void
}

export function usePeriodFilter(initial: PeriodPreset = 'week'): PeriodFilterState {
  const [preset, setPreset] = useState<PeriodPreset>(initial)
  const [customRange, setCustomRange] = useState<DateRange | null>(null)

  function range(): DateRange {
    if (preset === 'custom' && customRange) return customRange
    if (preset === 'custom') return getPeriodRange('minggu-ini')
    return getPeriodRange(PRESET_MAP[preset])
  }

  return { preset, customRange, range: range(), setPreset, setCustomRange }
}
