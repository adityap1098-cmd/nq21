import type {
  Transaction, TransactionLine, TransactionLineMechanic,
  CommissionRate, CommissionPeriod,
} from './types'
import { SEED_MECHANICS, SEED_RATES } from './master/mechanics'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

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

// ── Selectors ─────────────────────────────────────────────────────────────────

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

  // Build 7-day cashflow
  const start = new Date(period.weekStart)
  const today = new Date('2026-05-10') // pinned to seed date for prototype
  const cashflowByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayTx = activeTx.filter((tx) => tx.tglTransaksi === dateStr)
    return {
      day: DAY_LABELS[d.getDay()],
      date: toDateStr(d),
      in: dayTx.filter((t) => t.tipe === 'income').reduce((s, t) => s + t.totalNominal, 0),
      out: dayTx.filter((t) => t.tipe === 'expense').reduce((s, t) => s + t.totalNominal, 0),
      today: isSameDay(d, today) || undefined,
    }
  })

  // Top kategori (income only, by category)
  const katMap: Record<string, { name: string; amount: number; txCount: number }> = {}
  for (const tx of activeTx.filter((t) => t.tipe === 'income')) {
    const txLines = lines.filter((l) => l.transactionId === tx.id)
    for (const line of txLines) {
      const cat = categoryMap[line.categoryId]
      if (!cat || cat.type !== 'income') continue
      if (!katMap[line.categoryId]) {
        katMap[line.categoryId] = { name: cat.name, amount: 0, txCount: 0 }
      }
      katMap[line.categoryId].amount += line.nominal
      katMap[line.categoryId].txCount += 1
    }
  }
  const sorted = Object.entries(katMap)
    .map(([categoryId, v]) => ({ categoryId, ...v }))
    .sort((a, b) => b.amount - a.amount)
  const maxAmt = sorted[0]?.amount ?? 1
  const topKategori = sorted.slice(0, 6).map((k) => ({ ...k, pct: k.amount / maxAmt }))

  // Recent: last 5 income+expense sorted by createdAt desc
  const recent = [...activeTx]
    .filter((t) => !t.deletedAt)
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

export function getCashFlow(
  transactions: Transaction[],
  start: string,
  end: string,
  granularity: 'day' | 'week' | 'month' = 'day',
) {
  const filtered = transactions.filter(
    (tx) => !tx.deletedAt && isInPeriod(tx.tglTransaksi, start, end)
  )
  if (granularity === 'day') {
    const map: Record<string, { in: number; out: number }> = {}
    for (const tx of filtered) {
      if (!map[tx.tglTransaksi]) map[tx.tglTransaksi] = { in: 0, out: 0 }
      if (tx.tipe === 'income') map[tx.tglTransaksi].in += tx.totalNominal
      else map[tx.tglTransaksi].out += tx.totalNominal
    }
    return map
  }
  return {}
}

export function getReportPerKategori(
  transactions: Transaction[],
  lines: TransactionLine[],
  start: string,
  end: string,
  categoryMap: Record<string, { name: string; type: string }>,
) {
  const activeTx = transactions.filter(
    (tx) => !tx.deletedAt && isInPeriod(tx.tglTransaksi, start, end)
  )
  const result: Record<string, { name: string; type: string; amount: number; count: number }> = {}
  for (const tx of activeTx) {
    const txLines = lines.filter((l) => l.transactionId === tx.id)
    for (const line of txLines) {
      const cat = categoryMap[line.categoryId]
      if (!cat) continue
      if (!result[line.categoryId]) result[line.categoryId] = { name: cat.name, type: cat.type, amount: 0, count: 0 }
      result[line.categoryId].amount += line.nominal
      result[line.categoryId].count += 1
    }
  }
  return Object.values(result).sort((a, b) => b.amount - a.amount)
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

// Rates from seed for use in selectors (M006: replace with store)
export { SEED_RATES as defaultRates }
