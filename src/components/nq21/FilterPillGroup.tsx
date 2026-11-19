import { useIsMobile } from '@/lib/hooks/useIsMobile'

interface FilterOption {
  label: string
  value: string
}

interface FilterPillGroupProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  /** Phone only: lay the pills out as an equal-width grid with this many columns instead of a wrapping row. */
  mobileColumns?: number
}

export function FilterPillGroup({ options, value, onChange, mobileColumns }: FilterPillGroupProps) {
  const isMobile = useIsMobile()
  const mobileGrid = isMobile && mobileColumns !== undefined

  const containerLayout: React.CSSProperties = mobileGrid
    ? { display: 'grid', gridTemplateColumns: `repeat(${mobileColumns}, minmax(0, 1fr))`, width: '100%' }
    : isMobile
      ? { display: 'inline-flex', flexWrap: 'wrap', maxWidth: '100%' }
      : { display: 'inline-flex' }

  return (
    <div
      style={{
        ...containerLayout,
        background: 'var(--surface-alt)',
        borderRadius: 6,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: isMobile ? '8px 10px' : '5px 10px',
              borderRadius: 4,
              border: 'none',
              background: active ? 'var(--text)' : 'transparent',
              color: active ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
