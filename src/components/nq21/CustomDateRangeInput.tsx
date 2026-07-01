interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontFamily: 'var(--mono)',
  fontSize: 11,
  padding: '6px 10px',
  color: 'var(--text)',
  outline: 'none',
  width: 130,
}

export function CustomDateRangeInput({ start, end, onChange }: Props) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600 }}>
          DARI
        </label>
        <input type="date" value={start} onChange={e => onChange(e.target.value, end)} style={inputStyle} />
      </div>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 10, marginTop: 14 }}>→</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600 }}>
          SAMPAI
        </label>
        <input type="date" value={end} onChange={e => onChange(start, e.target.value)} style={inputStyle} />
      </div>
    </div>
  )
}