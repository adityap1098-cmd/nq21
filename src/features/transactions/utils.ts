import type { Line } from './types'
import type { Category, CommissionRate, Mechanic, Supplier, Transaction, TransactionLine } from '@/store/types'

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

export interface ValidationError {
  field: string
  message: string
  lineId?: string
}

const _NO_REF_REGEX = /^(TRX|EXP)-\d{8}-\d{3}$/
const _NO_SUPPLIER_CATS = new Set(['Gaji', 'Listrik & Air', 'Sewa', 'Lain-lain'])

export function validateTransactionFull(
  form: { noReferensi: string; tipe: string; customerId?: string; supplierId?: string },
  lines: Line[],
  ctx: {
    transactions: Pick<Transaction, 'id' | 'noReferensi'>[]
    categories: Category[]
    mechanics: Pick<Mechanic, 'id' | 'isActive' | 'name'>[]
    suppliers: Pick<Supplier, 'id' | 'isActive' | 'isVendorBubut' | 'name'>[]
    currentId?: string
  },
): ValidationError[] {
  const errs: ValidationError[] = []

  if (!_NO_REF_REGEX.test(form.noReferensi))
    errs.push({ field: 'noReferensi', message: 'Format no. referensi tidak valid' })
  else if (ctx.transactions.some((t) => t.noReferensi === form.noReferensi && t.id !== ctx.currentId))
    errs.push({ field: 'noReferensi', message: 'No. referensi sudah dipakai. Generate ulang.' })

  if (form.tipe === 'income' && !form.customerId)
    errs.push({ field: 'customerId', message: 'Pilih customer' })

  if (form.tipe === 'expense' && !form.supplierId) {
    const needsSupplier = lines.some((l) => {
      const cat = ctx.categories.find((c) => c.id === l.categoryId)
      return cat && !_NO_SUPPLIER_CATS.has(cat.name)
    })
    if (needsSupplier) errs.push({ field: 'supplierId', message: 'Pilih supplier' })
  }

  if (lines.length === 0) {
    errs.push({ field: 'lines', message: 'Min 1 line item' })
    return errs
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lbl = `LINE ${String(i + 1).padStart(2, '0')}`

    if (!line.categoryId) {
      errs.push({ field: `line-${i}-cat`, message: `${lbl}: pilih kategori`, lineId: line.id })
      continue
    }
    if (line.nominal <= 0)
      errs.push({ field: `line-${i}-nominal`, message: `${lbl}: nominal harus > 0`, lineId: line.id })
    if (line.biayaMaterial > line.nominal)
      errs.push({ field: `line-${i}-mat`, message: `${lbl}: biaya material melebihi nominal`, lineId: line.id })

    const cat = ctx.categories.find((c) => c.id === line.categoryId)

    if (cat?.isJasa) {
      if (line.mechanics.length === 0) {
        errs.push({ field: `line-${i}-mech`, message: `${lbl}: min 1 mekanik`, lineId: line.id })
      } else {
        const totalShare = line.mechanics.reduce((s, m) => s + m.sharePercent, 0)
        if (Math.abs(totalShare - 100) > 0.01)
          errs.push({ field: `line-${i}-share`, message: `${lbl}: total share mekanik harus 100%`, lineId: line.id })
        for (const m of line.mechanics) {
          if (!m.mechanicId) continue
          const mech = ctx.mechanics.find((x) => x.id === m.mechanicId)
          if (mech && !mech.isActive)
            errs.push({ field: `line-${i}-mech-${m.mechanicId}`, message: `${lbl}: mekanik ${mech.name} sudah nonaktif. Pilih mekanik lain.`, lineId: line.id })
        }
      }
    }

    if (cat?.name === 'Bubut Luar') {
      if (!line.bubutVendor?.supplierId) {
        errs.push({ field: `line-${i}-vendor`, message: `${lbl}: pilih vendor bubut`, lineId: line.id })
      } else {
        const vendor = ctx.suppliers.find((s) => s.id === line.bubutVendor!.supplierId)
        if (!vendor?.isActive || !vendor.isVendorBubut)
          errs.push({ field: `line-${i}-vendor-bad`, message: `${lbl}: vendor ${vendor?.name ?? ''} tidak aktif atau bukan vendor bubut.`, lineId: line.id })
      }
      if ((line.bubutVendor?.vendorCost ?? 0) <= 0)
        errs.push({ field: `line-${i}-vcost`, message: `${lbl}: isi biaya ke vendor bubut`, lineId: line.id })
    }
  }

  return errs
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
