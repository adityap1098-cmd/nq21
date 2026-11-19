import { useEffect, useState } from 'react'

interface Props {
  start: string
  end: string
  /** Called only with a complete range where start ≤ end. */
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

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600,
}

export function CustomDateRangeInput({ start, end, onChange }: Props) {
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)

  useEffect(() => { setDraftStart(start) }, [start])
  useEffect(() => { setDraftEnd(end) }, [end])

  const incomplete = !draftStart || !draftEnd
  const inverted = !incomplete && draftStart > draftEnd

  function update(nextStart: string, nextEnd: string) {
    setDraftStart(nextStart)
    setDraftEnd(nextEnd)
    if (nextStart && nextEnd && nextStart <= nextEnd) onChange(nextStart, nextEnd)
  }

  const invalidBorder = inverted ? { borderColor: 'var(--accent)' } : undefined

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={labelStyle}>DARI</label>
          <input
            type="date"
            value={draftStart}
            max={draftEnd || undefined}
            onChange={e => update(e.target.value, draftEnd)}
            aria-invalid={inverted || !draftStart}
            style={{ ...inputStyle, ...invalidBorder }}
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 10, marginTop: 14 }}>→</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={labelStyle}>SAMPAI</label>
          <input
            type="date"
            value={draftEnd}
            min={draftStart || undefined}
            onChange={e => update(draftStart, e.target.value)}
            aria-invalid={inverted || !draftEnd}
            style={{ ...inputStyle, ...invalidBorder }}
          />
        </div>
      </div>
      {(inverted || incomplete) && (
        <div role="alert" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: inverted ? 'var(--accent)' : 'var(--text-muted)' }}>
          {inverted
            ? 'Tanggal "Dari" harus sebelum atau sama dengan "Sampai".'
            : 'Isi kedua tanggal — laporan masih memakai rentang sebelumnya.'}
        </div>
      )}
    </div>
  )
}
