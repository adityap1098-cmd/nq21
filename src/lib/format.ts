const MONTHS_ID = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
]

// "11–17 Mei 2026" — safe with both "YYYY-MM-DD" and full ISO timestamp inputs
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const sd = parseInt(weekStart.slice(8, 10))
  const em = parseInt(weekEnd.slice(5, 7))
  const ed = parseInt(weekEnd.slice(8, 10))
  const ey = weekEnd.slice(0, 4)
  return `${sd}–${ed} ${MONTHS_ID[em - 1]} ${ey}`
}
