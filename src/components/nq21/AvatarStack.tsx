interface AvatarItem {
  name: string
  initial: string
}

interface AvatarStackProps {
  items: AvatarItem[]
  max?: number
  showNames?: boolean
}

export function AvatarStack({ items, max = 5, showNames = false }: AvatarStackProps) {
  const visible = items.slice(0, max)
  const overflow = items.length - max

  if (showNames) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {visible.map((item) => (
          <div
            key={item.name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px 4px 4px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--display)',
                fontSize: 10,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {item.initial}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{item.name}</span>
          </div>
        ))}
        {overflow > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              background: 'var(--surface-alt)',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            +{overflow}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex' }}>
      {visible.map((item, i) => (
        <div
          key={item.name}
          title={item.name}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--display)',
            fontSize: 12,
            color: '#fff',
            border: '2px solid var(--surface)',
            marginLeft: i > 0 ? -8 : 0,
            zIndex: visible.length - i,
            position: 'relative',
          }}
        >
          {item.initial}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--surface-alt)',
            border: '2px solid var(--surface)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginLeft: -8,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
