const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const FMT = new Intl.NumberFormat('id-ID')
export const fmtRp = (n: number): string => `Rp ${FMT.format(n)}`

// "04—10 Mei" or "27 Apr—03 Mei"
export function fmtPeriodShort(start: string, end: string): string {
  const [, sm, sd] = start.split('-')
  const [, em, ed] = end.split('-')
  return sm === em
    ? `${parseInt(sd)}—${parseInt(ed)} ${MONTHS[parseInt(em) - 1]}`
    : `${parseInt(sd)} ${MONTHS[parseInt(sm) - 1]}—${parseInt(ed)} ${MONTHS[parseInt(em) - 1]}`
}

// "04 — 10 MEI 2026" (uppercase, for dark panels)
export function fmtPeriodFull(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-')
  const [ey, em, ed] = end.split('-')
  if (sm === em && sy === ey) {
    return `${parseInt(sd)} — ${parseInt(ed)} ${MONTHS[parseInt(em) - 1].toUpperCase()} ${ey}`
  }
  return `${parseInt(sd)} ${MONTHS[parseInt(sm) - 1].toUpperCase()} — ${parseInt(ed)} ${MONTHS[parseInt(em) - 1].toUpperCase()} ${ey}`
}

// "04 Mei" compact
export function fmtShortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`
}

// "04 Mei 2026" with year
export function fmtClosedAt(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
}

export function getInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

// "TRX-20260510-008" → "...-008" for print column compression
export function shortenNoRef(noRef: string): string {
  const parts = noRef.split('-')
  return parts.length >= 2 ? `…-${parts[parts.length - 1]}` : noRef
}
