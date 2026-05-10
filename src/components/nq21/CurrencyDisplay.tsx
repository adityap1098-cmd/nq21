const _fmt = new Intl.NumberFormat('id-ID')

const SIZES = {
  sm: { rp: 9,  num: 13 },
  md: { rp: 11, num: 22 },
  lg: { rp: 13, num: 36 },
} as const

interface CurrencyDisplayProps {
  value: number
  size?: keyof typeof SIZES
}

export function CurrencyDisplay({ value, size = 'md' }: CurrencyDisplayProps) {
  const { rp, num } = SIZES[size]
  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
      }}
    >
      <span style={{ fontSize: rp, color: 'var(--text-muted)', fontWeight: 500 }}>Rp</span>
      <span style={{ fontSize: num, fontWeight: 600 }}>{_fmt.format(value)}</span>
    </span>
  )
}
