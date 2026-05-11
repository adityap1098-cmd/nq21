import type {
  Transaction, TransactionLine, TransactionLineMechanic,
  CommissionRate, CommissionPeriod, Mechanic, Customer,
} from './types'
import { SEED_MECHANICS, SEED_RATES } from './master/mechanics'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DateRange {
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
}

export interface DashboardStats {
  pendapatan: number
  pengeluaran: number
  labaKotor: number
  cashflowByDay: { day: string; date: string; in: number; out: number; today?: boolean }[]
  topKategori: { categoryId: string; name: string; amount: number; txCount: number; pct: number }[]
  recentTransactions: Transaction[]
}

export interface MechanicKomisi {
  mechanicId: string
  name: string
  initial: string
  totalBasis: number
  totalKomisi: number
}

export interface KpiDelta {
  value: number
  delta?: number
  hasComparison: boolean
}

export interface KpiDeltas {
  pendapatan: KpiDelta
  pengeluaran: KpiDelta
  labaKotor: KpiDelta
  komisiPending: KpiDelta
}

// ── Report types ──────────────────────────────────────────────────────────────

export interface KategoriReport {
  categoryId: string
  categoryName: string
  isJasa: boolean
  transactionCount: number
  totalNominal: number
  percentage: number  // relative to total income or total expense
}

export interface ReportPerKategoriResult {
  income: KategoriReport[]
  expense: KategoriReport[]
  summary: {
    totalIncome: number
    totalExpense: number
    labaKotor: number
  }
}

export interface CashFlowDataPoint {
  date: string       // YYYY-MM-DD (daily) or Monday of week (weekly)
  label: string      // e.g. "SEN", "11 Apr", "Mei W1"
  income: number
  expense: number
  isToday?: boolean
}

export interface MekanikJasaStats {
  mechanicId: string
  mechanicName: string
  isActive: boolean
  jobsCount: number
  totalBasis: number    // mechanic's share of basis (basis * share%)
  totalKomisi: number
  uniqueCategories: number
}

export interface JasaDetailLine {
  transactionId: string
  noReferensi: string
  tgl: string          // YYYY-MM-DD
  customerName: string
  customerMotor?: string
  categoryId: string
  categoryName: string
  itemName?: string
  nominal: number
  biayaMaterial: number
  basis: number
  mechanics: {
    mechanicId: string
    mechanicName: string
    sharePercent: number
    rate: number
    rateOverride?: number
    effectiveRate: number
    komisi: number
  }[]
  totalKomisi: number
}

export interface JasaReport {
  perMekanik: MekanikJasaStats[]
  detailLines: JasaDetailLine[]
  summary: {
    totalJobs: number
    totalBasis: number
    totalKomisi: number
    avgKomisiPerJob: number
  }
}

export interface DynoSession {
  transactionId: string
  noReferensi: string
  tgl: string          // YYYY-MM-DD
  customerName: string
  operatorMechanicId: string
  operatorName: string
  paymentMethod: string
  nominal: number
}

export interface DynoReport {
  sessions: DynoSession[]
  topOperators: {
    mechanicId: string
    mechanicName: string
    sessionCount: number
    totalRevenue: number
  }[]
  sessionsByDate: {
    date: string
    label: string
    count: number
  }[]
  summary: {
    totalSessions: number
    totalRevenue: number
    avgRevenuePerSession: number
  }
}

// Caller-facing category info shape
type CategoryInfo = { name: string; type: string; isJasa: boolean }

// ── Constants ─────────────────────────────────────────────────────────────────

const PINNED_TODAY = '2026-05-10'
const DAY_LABELS = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// ── Low-level helpers ─────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function isInPeriod(tgl: string, start: string, end: string) {
  return tgl >= start && tgl <= end
}

// Returns YYYY-MM-DD for a given Date (local, no timezone shift)
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Parses YYYY-MM-DD to a Date (midnight local time, avoids UTC off-by-one)
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Returns the Monday (ISO week start) for a given date string
function getMondayOf(dateStr: string): string {
  const d = parseDate(dateStr)
  const day = d.getDay()                     // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day      // offset to Monday
  d.setDate(d.getDate() + diff)
  return isoDate(d)
}

// Label for a weekly bar: "Mei W1"
function weekLabel(mondayStr: string): string {
  const d = parseDate(mondayStr)
  const wNum = Math.ceil(d.getDate() / 7)
  return `${MONTH_SHORT[d.getMonth()]} W${wNum}`
}

// Add N days to a date string
function addDaysStr(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

// ── Period helpers ────────────────────────────────────────────────────────────

export function getPeriodRange(
  preset: 'hari-ini' | 'minggu-ini' | 'bulan-ini' | 'custom',
  customRange?: { start: string; end: string },
): DateRange {
  if (preset === 'custom' && customRange) return customRange

  const today = parseDate(PINNED_TODAY)

  if (preset === 'hari-ini') {
    return { start: PINNED_TODAY, end: PINNED_TODAY }
  }

  if (preset === 'minggu-ini') {
    const start = getMondayOf(PINNED_TODAY)
    const end = addDaysStr(start, 6)
    return { start, end }
  }

  if (preset === 'bulan-ini') {
    const y = today.getFullYear()
    const m = today.getMonth()
    const start = isoDate(new Date(y, m, 1))
    const end = isoDate(new Date(y, m + 1, 0))  // day 0 = last day of prev month
    return { start, end }
  }

  return { start: PINNED_TODAY, end: PINNED_TODAY }
}

export function getPrevPeriodRange(current: DateRange): DateRange {
  const startD = parseDate(current.start)
  const endD = parseDate(current.end)
  const durationDays = Math.round(
    (endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1
  const prevEnd = addDaysStr(current.start, -1)
  const prevStart = addDaysStr(prevEnd, -(durationDays - 1))
  return { start: prevStart, end: prevEnd }
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────

function resolveCashFlowRange(period: '7H' | '30H' | '90H' | DateRange): { range: DateRange; autoGran: 'day' | 'week' } {
  if (typeof period === 'object') {
    // DateRange: infer granularity by duration
    const days = Math.round(
      (parseDate(period.end).getTime() - parseDate(period.start).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
    return { range: period, autoGran: days > 35 ? 'week' : 'day' }
  }
  const daysBack = period === '7H' ? 6 : period === '30H' ? 29 : 89
  return {
    range: { start: addDaysStr(PINNED_TODAY, -daysBack), end: PINNED_TODAY },
    autoGran: period === '90H' ? 'week' : 'day',
  }
}

export function getCashFlow(
  transactions: Transaction[],
  period: '7H' | '30H' | '90H' | DateRange,
  granularity: 'day' | 'week' | 'auto' = 'auto',
): CashFlowDataPoint[] {
  const { range, autoGran } = resolveCashFlowRange(period)
  const gran = granularity === 'auto' ? autoGran : granularity

  const filtered = transactions.filter(
    (tx) => !tx.deletedAt && isInPeriod(tx.tglTransaksi, range.start, range.end)
  )

  if (gran === 'week') {
    // Generate all Mondays from startOfWeek(range.start) to startOfWeek(range.end)
    const firstMonday = getMondayOf(range.start)
    const lastMonday = getMondayOf(range.end)

    const buckets: Record<string, { income: number; expense: number }> = {}
    let cur = firstMonday
    while (cur <= lastMonday) {
      buckets[cur] = { income: 0, expense: 0 }
      cur = addDaysStr(cur, 7)
    }

    for (const tx of filtered) {
      const mon = getMondayOf(tx.tglTransaksi)
      if (!buckets[mon]) continue
      if (tx.tipe === 'income') buckets[mon].income += tx.totalNominal
      else buckets[mon].expense += tx.totalNominal
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mon, v]) => ({
        date: mon,
        label: weekLabel(mon),
        income: v.income,
        expense: v.expense,
      }))
  }

  // Daily
  const buckets: Record<string, { income: number; expense: number }> = {}
  let cur = range.start
  while (cur <= range.end) {
    buckets[cur] = { income: 0, expense: 0 }
    cur = addDaysStr(cur, 1)
  }

  for (const tx of filtered) {
    if (!buckets[tx.tglTransaksi]) continue
    if (tx.tipe === 'income') buckets[tx.tglTransaksi].income += tx.totalNominal
    else buckets[tx.tglTransaksi].expense += tx.totalNominal
  }

  const useShortLabel = period === '7H'  // 7H → day-of-week abbrev; 30H+ → DD MMM

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, v]) => {
      const d = parseDate(dateStr)
      const label = useShortLabel ? DAY_LABELS[d.getDay()] : toDateStr(d)
      return {
        date: dateStr,
        label,
        income: v.income,
        expense: v.expense,
        isToday: dateStr === PINNED_TODAY || undefined,
      }
    })
}

// ── Laporan Per Kategori ──────────────────────────────────────────────────────

export function getReportPerKategori(
  transactions: Transaction[],
  lines: TransactionLine[],
  range: DateRange,
  categoryMap: Record<string, CategoryInfo>,
): ReportPerKategoriResult {
  const activeTx = transactions.filter(
    (tx) => !tx.deletedAt && isInPeriod(tx.tglTransaksi, range.start, range.end)
  )

  const incomeMap: Record<string, { categoryName: string; isJasa: boolean; totalNominal: number; transactionCount: number }> = {}
  const expenseMap: Record<string, { categoryName: string; isJasa: boolean; totalNominal: number; transactionCount: number }> = {}

  for (const tx of activeTx) {
    const txLines = lines.filter((l) => l.transactionId === tx.id)
    for (const line of txLines) {
      const cat = categoryMap[line.categoryId]
      if (!cat) continue
      const map = cat.type === 'income' ? incomeMap : expenseMap
      if (!map[line.categoryId]) {
        map[line.categoryId] = { categoryName: cat.name, isJasa: cat.isJasa, totalNominal: 0, transactionCount: 0 }
      }
      map[line.categoryId].totalNominal += line.nominal
      map[line.categoryId].transactionCount += 1
    }
  }

  const totalIncome = Object.values(incomeMap).reduce((s, v) => s + v.totalNominal, 0)
  const totalExpense = Object.values(expenseMap).reduce((s, v) => s + v.totalNominal, 0)

  const toSorted = (
    map: typeof incomeMap,
    total: number,
  ): KategoriReport[] =>
    Object.entries(map)
      .map(([categoryId, v]) => ({
        categoryId,
        categoryName: v.categoryName,
        isJasa: v.isJasa,
        transactionCount: v.transactionCount,
        totalNominal: v.totalNominal,
        percentage: total > 0 ? (v.totalNominal / total) * 100 : 0,
      }))
      .sort((a, b) => b.totalNominal - a.totalNominal)

  return {
    income: toSorted(incomeMap, totalIncome),
    expense: toSorted(expenseMap, totalExpense),
    summary: {
      totalIncome,
      totalExpense,
      labaKotor: totalIncome - totalExpense,
    },
  }
}

// ── Laporan Jasa & Mekanik ────────────────────────────────────────────────────

export function getReportJasa(
  transactions: Transaction[],
  lines: TransactionLine[],
  lineMechanics: TransactionLineMechanic[],
  rates: CommissionRate[],
  categoryMap: Record<string, CategoryInfo>,
  customers: Pick<Customer, 'id' | 'name' | 'motorType'>[],
  mechanics: Pick<Mechanic, 'id' | 'name' | 'isActive'>[],
  range: DateRange,
  filters?: { mechanicIds?: string[]; categoryIds?: string[] },
): JasaReport {
  const mechNameMap = Object.fromEntries(mechanics.map((m) => [m.id, m]))

  // Active income transactions in range
  const activeTx = transactions.filter(
    (tx) => !tx.deletedAt && tx.tipe === 'income'
      && isInPeriod(tx.tglTransaksi, range.start, range.end)
  )

  const detailLines: JasaDetailLine[] = []
  const mechStats: Record<string, {
    totalBasis: number
    totalKomisi: number
    jobsCount: number
    categoryIds: Set<string>
  }> = {}

  for (const tx of activeTx) {
    const txLines = lines.filter((l) => l.transactionId === tx.id)
    const customer = customers.find((c) => c.id === tx.customerId)

    for (const line of txLines) {
      const cat = categoryMap[line.categoryId]
      if (!cat || !cat.isJasa) continue

      // Apply category filter
      if (filters?.categoryIds?.length && !filters.categoryIds.includes(line.categoryId)) continue

      const lms = lineMechanics.filter((lm) => lm.transactionLineId === line.id)

      // Apply mechanic filter — skip line if none of its mechanics match
      if (filters?.mechanicIds?.length) {
        const hasMatch = lms.some((lm) => filters.mechanicIds!.includes(lm.mechanicId))
        if (!hasMatch) continue
      }

      const basis = line.nominal - line.biayaMaterial

      const mechDetails = lms.map((lm) => {
        const masterRate = rates.find(
          (r) => r.mechanicId === lm.mechanicId && r.categoryId === line.categoryId
        )?.ratePercent ?? 0
        const effectiveRate = lm.rateOverride !== undefined ? lm.rateOverride : masterRate
        const komisi = Math.round(basis * (lm.sharePercent / 100) * (effectiveRate / 100))
        const mechBasis = Math.round(basis * (lm.sharePercent / 100))
        const mech = mechNameMap[lm.mechanicId]

        // Aggregate per mechanic
        if (!mechStats[lm.mechanicId]) {
          mechStats[lm.mechanicId] = { totalBasis: 0, totalKomisi: 0, jobsCount: 0, categoryIds: new Set() }
        }
        mechStats[lm.mechanicId].totalBasis += mechBasis
        mechStats[lm.mechanicId].totalKomisi += komisi
        mechStats[lm.mechanicId].jobsCount += 1
        mechStats[lm.mechanicId].categoryIds.add(line.categoryId)

        return {
          mechanicId: lm.mechanicId,
          mechanicName: mech?.name ?? lm.mechanicId,
          sharePercent: lm.sharePercent,
          rate: masterRate,
          rateOverride: lm.rateOverride,
          effectiveRate,
          komisi,
        }
      })

      const totalKomisi = mechDetails.reduce((s, m) => s + m.komisi, 0)

      detailLines.push({
        transactionId: tx.id,
        noReferensi: tx.noReferensi,
        tgl: tx.tglTransaksi,
        customerName: customer?.name ?? '—',
        customerMotor: customer?.motorType,
        categoryId: line.categoryId,
        categoryName: cat.name,
        itemName: line.itemName,
        nominal: line.nominal,
        biayaMaterial: line.biayaMaterial,
        basis,
        mechanics: mechDetails,
        totalKomisi,
      })
    }
  }

  detailLines.sort((a, b) => b.tgl.localeCompare(a.tgl))

  const perMekanik: MekanikJasaStats[] = Object.entries(mechStats)
    .map(([mechanicId, s]) => {
      const mech = mechNameMap[mechanicId]
      return {
        mechanicId,
        mechanicName: mech?.name ?? mechanicId,
        isActive: mech?.isActive ?? false,
        jobsCount: s.jobsCount,
        totalBasis: s.totalBasis,
        totalKomisi: s.totalKomisi,
        uniqueCategories: s.categoryIds.size,
      }
    })
    .sort((a, b) => b.totalKomisi - a.totalKomisi)

  const totalBasis = perMekanik.reduce((s, m) => s + m.totalBasis, 0)
  const totalKomisi = perMekanik.reduce((s, m) => s + m.totalKomisi, 0)
  const totalJobs = detailLines.length

  return {
    perMekanik,
    detailLines,
    summary: {
      totalJobs,
      totalBasis,
      totalKomisi,
      avgKomisiPerJob: totalJobs > 0 ? Math.round(totalKomisi / totalJobs) : 0,
    },
  }
}

// ── Laporan Dyno ──────────────────────────────────────────────────────────────

export function getReportDyno(
  transactions: Transaction[],
  lines: TransactionLine[],
  lineMechanics: TransactionLineMechanic[],
  categoryMap: Record<string, CategoryInfo>,
  customers: Pick<Customer, 'id' | 'name'>[],
  mechanics: Pick<Mechanic, 'id' | 'name'>[],
  range: DateRange,
): DynoReport {
  const mechNameMap = Object.fromEntries(mechanics.map((m) => [m.id, m.name]))
  const dynoKatId = Object.entries(categoryMap).find(([, v]) => v.name === 'Dyno')?.[0]

  const activeTx = transactions.filter(
    (tx) => !tx.deletedAt && tx.tipe === 'income'
      && isInPeriod(tx.tglTransaksi, range.start, range.end)
  )

  const sessions: DynoSession[] = []

  for (const tx of activeTx) {
    const txLines = lines.filter((l) => l.transactionId === tx.id)
    for (const line of txLines) {
      if (!dynoKatId || line.categoryId !== dynoKatId) continue
      const lms = lineMechanics.filter((lm) => lm.transactionLineId === line.id)
      // Primary operator = mechanic with highest sharePercent (first on tie)
      const primary = lms.sort((a, b) => b.sharePercent - a.sharePercent)[0]
      const customer = customers.find((c) => c.id === tx.customerId)

      sessions.push({
        transactionId: tx.id,
        noReferensi: tx.noReferensi,
        tgl: tx.tglTransaksi,
        customerName: customer?.name ?? '—',
        operatorMechanicId: primary?.mechanicId ?? '',
        operatorName: primary ? (mechNameMap[primary.mechanicId] ?? primary.mechanicId) : '—',
        paymentMethod: tx.paymentMethod,
        nominal: line.nominal,
      })
    }
  }

  sessions.sort((a, b) => b.tgl.localeCompare(a.tgl))

  // Top operators
  const opMap: Record<string, { name: string; sessionCount: number; totalRevenue: number }> = {}
  for (const s of sessions) {
    if (!opMap[s.operatorMechanicId]) {
      opMap[s.operatorMechanicId] = { name: s.operatorName, sessionCount: 0, totalRevenue: 0 }
    }
    opMap[s.operatorMechanicId].sessionCount += 1
    opMap[s.operatorMechanicId].totalRevenue += s.nominal
  }
  const topOperators = Object.entries(opMap)
    .map(([mechanicId, v]) => ({ mechanicId, mechanicName: v.name, sessionCount: v.sessionCount, totalRevenue: v.totalRevenue }))
    .sort((a, b) => b.sessionCount - a.sessionCount)

  // Sessions by date — last 14 days
  const end14 = PINNED_TODAY
  const start14 = addDaysStr(end14, -13)
  const dateBuckets: Record<string, number> = {}
  let dc = start14
  while (dc <= end14) {
    dateBuckets[dc] = 0
    dc = addDaysStr(dc, 1)
  }
  for (const s of sessions) {
    if (dateBuckets[s.tgl] !== undefined) dateBuckets[s.tgl] += 1
  }
  const sessionsByDate = Object.entries(dateBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      const d = parseDate(date)
      return { date, label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`, count }
    })

  const totalRevenue = sessions.reduce((s, x) => s + x.nominal, 0)

  return {
    sessions,
    topOperators,
    sessionsByDate,
    summary: {
      totalSessions: sessions.length,
      totalRevenue,
      avgRevenuePerSession: sessions.length > 0 ? Math.round(totalRevenue / sessions.length) : 0,
    },
  }
}

// ── Existing selectors ────────────────────────────────────────────────────────

export function getDashboardStats(
  transactions: Transaction[],
  lines: TransactionLine[],
  period: CommissionPeriod,
  categoryMap: Record<string, { name: string; type: string }>,
): DashboardStats {
  const activeTx = transactions.filter(
    (tx) => !tx.deletedAt && isInPeriod(tx.tglTransaksi, period.weekStart, period.weekEnd)
  )

  const pendapatan = activeTx.filter((t) => t.tipe === 'income').reduce((s, t) => s + t.totalNominal, 0)
  const pengeluaran = activeTx.filter((t) => t.tipe === 'expense').reduce((s, t) => s + t.totalNominal, 0)

  // Build 7-day cashflow (dashboard week view)
  const start = new Date(period.weekStart)
  const today = parseDate(PINNED_TODAY)
  const cashflowByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = isoDate(d)
    const dayTx = activeTx.filter((tx) => tx.tglTransaksi === dateStr)
    return {
      day: DAY_LABELS[d.getDay()],
      date: toDateStr(d),
      in: dayTx.filter((t) => t.tipe === 'income').reduce((s, t) => s + t.totalNominal, 0),
      out: dayTx.filter((t) => t.tipe === 'expense').reduce((s, t) => s + t.totalNominal, 0),
      today: isSameDay(d, today) || undefined,
    }
  })

  // Top kategori (income only)
  const katMap: Record<string, { name: string; amount: number; txCount: number }> = {}
  for (const tx of activeTx.filter((t) => t.tipe === 'income')) {
    const txLines = lines.filter((l) => l.transactionId === tx.id)
    for (const line of txLines) {
      const cat = categoryMap[line.categoryId]
      if (!cat || cat.type !== 'income') continue
      if (!katMap[line.categoryId]) katMap[line.categoryId] = { name: cat.name, amount: 0, txCount: 0 }
      katMap[line.categoryId].amount += line.nominal
      katMap[line.categoryId].txCount += 1
    }
  }
  const sorted = Object.entries(katMap)
    .map(([categoryId, v]) => ({ categoryId, ...v }))
    .sort((a, b) => b.amount - a.amount)
  const maxAmt = sorted[0]?.amount ?? 1
  const topKategori = sorted.slice(0, 6).map((k) => ({ ...k, pct: k.amount / maxAmt }))

  const recent = [...activeTx]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return {
    pendapatan,
    pengeluaran,
    labaKotor: pendapatan - pengeluaran,
    cashflowByDay,
    topKategori,
    recentTransactions: recent,
  }
}

export function getMechanicKomisiInPeriod(
  transactions: Transaction[],
  lines: TransactionLine[],
  lineMechanics: TransactionLineMechanic[],
  rates: CommissionRate[],
  period: CommissionPeriod,
): MechanicKomisi[] {
  const activeTx = transactions.filter(
    (tx) => !tx.deletedAt
      && tx.tipe === 'income'
      && isInPeriod(tx.tglTransaksi, period.weekStart, period.weekEnd)
  )

  const result: Record<string, { totalBasis: number; totalKomisi: number }> = {}

  for (const tx of activeTx) {
    const txLines = lines.filter((l) => l.transactionId === tx.id)
    for (const line of txLines) {
      const lms = lineMechanics.filter((lm) => lm.transactionLineId === line.id)
      if (!lms.length) continue
      const basis = line.nominal - line.biayaMaterial
      for (const lm of lms) {
        const rate = rates.find(
          (r) => r.mechanicId === lm.mechanicId && r.categoryId === line.categoryId
        )
        if (!rate) continue
        const komisi = Math.round(basis * (lm.sharePercent / 100) * (rate.ratePercent / 100))
        const mechBasis = Math.round(basis * (lm.sharePercent / 100))
        if (!result[lm.mechanicId]) result[lm.mechanicId] = { totalBasis: 0, totalKomisi: 0 }
        result[lm.mechanicId].totalBasis += mechBasis
        result[lm.mechanicId].totalKomisi += komisi
      }
    }
  }

  return SEED_MECHANICS.map((m) => ({
    mechanicId: m.id,
    name: m.name,
    initial: m.name[0],
    totalBasis: result[m.id]?.totalBasis ?? 0,
    totalKomisi: result[m.id]?.totalKomisi ?? 0,
  })).filter((m) => m.totalKomisi > 0)
}

export function getTransactionWithRelations(
  id: string,
  transactions: Transaction[],
  lines: TransactionLine[],
  lineMechanics: TransactionLineMechanic[],
) {
  const tx = transactions.find((t) => t.id === id)
  if (!tx) return null
  const txLines = lines
    .filter((l) => l.transactionId === id)
    .map((l) => ({
      ...l,
      mechanics: lineMechanics.filter((lm) => lm.transactionLineId === l.id),
    }))
  return { ...tx, lines: txLines }
}

export function getTotalKomisiInPeriod(mechKomisi: MechanicKomisi[]) {
  return mechKomisi.reduce((s, m) => s + m.totalKomisi, 0)
}

export function getKpiDeltas(
  transactions: Transaction[],
  currentPeriod: CommissionPeriod,
  prevPeriod: CommissionPeriod | undefined,
  currentKomisi: number,
  prevKomisi: number,
): KpiDeltas {
  const inPeriod = (t: Transaction, p: CommissionPeriod) =>
    !t.deletedAt && isInPeriod(t.tglTransaksi, p.weekStart, p.weekEnd)

  const sumIncome = (p: CommissionPeriod) =>
    transactions.filter((t) => inPeriod(t, p) && t.tipe === 'income').reduce((s, t) => s + t.totalNominal, 0)
  const sumExpense = (p: CommissionPeriod) =>
    transactions.filter((t) => inPeriod(t, p) && t.tipe === 'expense').reduce((s, t) => s + t.totalNominal, 0)

  const curIncome = sumIncome(currentPeriod)
  const curExpense = sumExpense(currentPeriod)
  const curLaba = curIncome - curExpense

  function calcDelta(cur: number, prev: number): number | undefined {
    if (prev === 0) return undefined
    return ((cur - prev) / prev) * 100
  }

  if (!prevPeriod) {
    return {
      pendapatan: { value: curIncome, hasComparison: false },
      pengeluaran: { value: curExpense, hasComparison: false },
      labaKotor: { value: curLaba, hasComparison: false },
      komisiPending: { value: currentKomisi, hasComparison: false },
    }
  }

  const prevIncome = sumIncome(prevPeriod)
  const prevExpense = sumExpense(prevPeriod)
  const prevLaba = prevIncome - prevExpense

  return {
    pendapatan: { value: curIncome, delta: calcDelta(curIncome, prevIncome), hasComparison: prevIncome > 0 },
    pengeluaran: { value: curExpense, delta: calcDelta(curExpense, prevExpense), hasComparison: prevExpense > 0 },
    labaKotor: { value: curLaba, delta: calcDelta(curLaba, prevLaba), hasComparison: prevLaba !== 0 },
    komisiPending: { value: currentKomisi, delta: calcDelta(currentKomisi, prevKomisi), hasComparison: prevKomisi > 0 },
  }
}

// Rates from seed for use in selectors (M006: replace with store)
export { SEED_RATES as defaultRates }
