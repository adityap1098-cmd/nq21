import { FilterPillGroup } from './FilterPillGroup'

const PERIOD_OPTIONS = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
  { label: 'Custom', value: 'custom' },
]

interface PeriodSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return <FilterPillGroup options={PERIOD_OPTIONS} value={value} onChange={onChange} />
}
