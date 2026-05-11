export type BadgeVariant = 'open' | 'closed' | 'pending' | 'paid'

const COLORS: Record<BadgeVariant, { bg: string; color: string }> = {
  open:    { bg: 'var(--accent-tint)', color: 'var(--accent)' },
  closed:  { bg: 'var(--surface-alt)', color: 'var(--text-muted)' },
  pending: { bg: 'var(--warning-tint)', color: 'var(--warning)' },
  paid:    { bg: 'var(--success-tint)', color: 'var(--success)' },
}

interface Props {
  variant: BadgeVariant
  label: string
  small?: boolean
}

export function KomisiBadge({ variant, label, small }: Props) {
  const { bg, color } = COLORS[variant]
  const sz = small ? 5 : 6
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: small ? '2px 6px' : '3px 8px', borderRadius: 4,
      fontFamily: 'var(--mono)', fontSize: small ? 9 : 10, fontWeight: 600,
      letterSpacing: '0.06em', textTransform: 'uppercase' as const,
      background: bg, color, flexShrink: 0,
    }}>
      <span style={{ width: sz, height: sz, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {label}
    </span>
  )
}
