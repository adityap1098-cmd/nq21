interface FilterOption {
  label: string
  value: string
}

interface FilterPillGroupProps {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

export function FilterPillGroup({ options, value, onChange }: FilterPillGroupProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
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
              padding: '5px 10px',
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
