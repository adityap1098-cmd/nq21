import type { Line } from './types'

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
