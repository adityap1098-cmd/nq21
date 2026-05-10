import { format, parseISO, isValid } from 'date-fns'
import { id } from 'date-fns/locale'

const PATTERNS = {
  short:    'd MMM yyyy',
  long:     'd MMMM yyyy',
  datetime: 'd MMM yyyy · HH:mm',
} as const

interface DateDisplayProps {
  value: Date | string
  format?: keyof typeof PATTERNS
  className?: string
}

export function DateDisplay({ value, format: fmt = 'short', className }: DateDisplayProps) {
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return <span style={{ color: 'var(--text-muted)' }}>—</span>

  return (
    <span
      className={className}
      style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-secondary)' }}
    >
      {format(date, PATTERNS[fmt], { locale: id })}
    </span>
  )
}
