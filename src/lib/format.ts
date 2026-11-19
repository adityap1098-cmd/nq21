const MONTHS_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

/**
 * Today as "YYYY-MM-DD" in the device's local timezone (WIB at the workshop).
 * Do not use `new Date().toISOString().slice(0, 10)`: that is the UTC date and
 * returns yesterday between 00:00 and 07:00 WIB.
 */
export function todayLocal(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// "11–17 Mei 2026" — safe with both "YYYY-MM-DD" and full ISO timestamp inputs
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const sd = parseInt(weekStart.slice(8, 10))
  const em = parseInt(weekEnd.slice(5, 7))
  const ed = parseInt(weekEnd.slice(8, 10))
  const ey = weekEnd.slice(0, 4)
  return `${sd}–${ed} ${MONTHS_ID[em - 1]} ${ey}`
}
