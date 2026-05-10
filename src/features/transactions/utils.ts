import type { Line } from './types'
import type { Category, CommissionRate, TransactionLine } from '@/store/types'

export function createEmptyLine(): Line {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    categoryId: null,
    nominal: 0,
    biayaMaterial: 0,
    mechanics: [],
  }
}

export function getBasisKomisi(line: Line): number {
  return Math.max(0, line.nominal - line.biayaMaterial)
}

export function formatRupiahInput(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('id-ID')
}

export function parseRupiahInput(str: string): number {
  const cleaned = str.replace(/[^0-9]/g, '')
  return cleaned === '' ? 0 : parseInt(cleaned, 10)
}

export function hasLineData(line: Line): boolean {
  return line.categoryId !== null || line.nominal > 0
}

export interface KomisiResult {
  total: number
  perMechanic: Map<string, { amount: number; hasOverride: boolean }>
}

export function computeKomisi(
  lines: Line[],
  categories: Category[],
  rates: CommissionRate[],
): KomisiResult {
  const perMechanic = new Map<string, { amount: number; hasOverride: boolean }>()
  let total = 0
  for (const line of lines) {
    const cat = categories.find((c) => c.id === line.categoryId)
    if (!cat?.isJasa) continue
    const basis = Math.max(0, line.nominal - line.biayaMaterial)
    for (const m of line.mechanics) {
      if (!m.mechanicId) continue
      const masterRate =
        rates.find((r) => r.mechanicId === m.mechanicId && r.categoryId === line.categoryId)
          ?.ratePercent ?? 0
      const effectiveRate = m.rateOverride !== undefined ? m.rateOverride : masterRate
      const amount = Math.round(basis * (m.sharePercent / 100) * (effectiveRate / 100))
      total += amount
      const prev = perMechanic.get(m.mechanicId) ?? { amount: 0, hasOverride: false }
      perMechanic.set(m.mechanicId, {
        amount: prev.amount + amount,
        hasOverride: prev.hasOverride || m.rateOverride !== undefined,
      })
    }
  }
  return { total, perMechanic }
}

export function getUniqueJasaNames(
  lines: TransactionLine[],
  jasaCategoryIds: Set<string>,
): string[] {
  const freq = new Map<string, number>()
  for (const line of lines) {
    if (!jasaCategoryIds.has(line.categoryId) || !line.jasaName?.trim()) continue
    const name = line.jasaName.trim()
    freq.set(name, (freq.get(name) ?? 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name)
}
