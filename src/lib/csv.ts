// Wrap value in quotes if it contains comma, quote, or newline
function escapeCSV(v: string): string {
  if (/[,"\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export interface CSVColumn<T> {
  key: keyof T | string
  label: string
  format?: (value: unknown) => string
}

export function exportCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: CSVColumn<T>[],
  filename: string,
): void {
  const header = columns.map((c) => escapeCSV(c.label)).join(',')
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key as string]
        const formatted = col.format ? col.format(raw) : String(raw ?? '')
        return escapeCSV(formatted)
      })
      .join(',')
  )

  const csv = '\uFEFF' + [header, ...dataRows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Format helpers (use in column definitions) ────────────────────────────────

export function fmtRupiah(n: unknown): string {
  return String(typeof n === 'number' ? n : 0)
}

export function fmtDate(v: unknown): string {
  const s = typeof v === 'string' ? v : ''
  if (!s) return ''
  const d = new Date(s.length === 10 ? s + 'T00:00:00' : s)
  if (isNaN(d.getTime())) return s
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}-${month}-${d.getFullYear()}`
}

export function fmtPercent(n: unknown): string {
  const num = typeof n === 'number' ? n : 0
  return Number.isInteger(num) ? String(num) : num.toFixed(1)
}
