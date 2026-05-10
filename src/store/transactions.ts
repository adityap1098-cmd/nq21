import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type {
  Transaction, TransactionLine, TransactionLineMechanic, BubutLuarLink,
} from './types'

// ── Seed data ─────────────────────────────────────────────────────────────────
// Seed matches dashboard T6 mock: week 04-10 Mei 2026
// cashflow: SEN 2.45jt/1.1jt, SEL 3.22/0.85, RAB 1.98/0.42, KAM 4.15/1.65,
//           JUM 5.32/1.98, SAB 6.78/2.24, MIN 4.89/0.98
// top kategori: Jasa 28.45jt, Sparepart 19.22jt, Oli 12.64jt, Dyno 9.85jt, Bubut Dalam 7.38jt
// recent tx: TRX-018..TRX-015

const SEED_TX: Transaction[] = [
  // ── Senin 04 Mei ──
  { id: 'tx-101', noReferensi: 'TRX-20260504-001', tglTransaksi: '2026-05-04', tipe: 'income',  customerId: 'cust-1', paymentMethod: 'cash',     totalNominal: 950_000,  createdBy: 'user-2', createdAt: '2026-05-04T09:00:00Z', updatedAt: '2026-05-04T09:00:00Z' },
  { id: 'tx-102', noReferensi: 'TRX-20260504-002', tglTransaksi: '2026-05-04', tipe: 'income',  customerId: 'cust-2', paymentMethod: 'qris',     totalNominal: 750_000,  createdBy: 'user-2', createdAt: '2026-05-04T11:00:00Z', updatedAt: '2026-05-04T11:00:00Z' },
  { id: 'tx-103', noReferensi: 'TRX-20260504-003', tglTransaksi: '2026-05-04', tipe: 'income',  customerId: 'cust-3', paymentMethod: 'transfer', totalNominal: 750_000,  createdBy: 'user-2', createdAt: '2026-05-04T14:00:00Z', updatedAt: '2026-05-04T14:00:00Z' },
  { id: 'tx-104', noReferensi: 'EXP-20260504-001', tglTransaksi: '2026-05-04', tipe: 'expense', supplierId: 'supp-1', paymentMethod: 'transfer', totalNominal: 1_100_000, createdBy: 'user-1', createdAt: '2026-05-04T15:00:00Z', updatedAt: '2026-05-04T15:00:00Z' },
  // ── Selasa 05 Mei ──
  { id: 'tx-201', noReferensi: 'TRX-20260505-001', tglTransaksi: '2026-05-05', tipe: 'income',  customerId: 'cust-4', paymentMethod: 'cash',     totalNominal: 1_320_000, createdBy: 'user-2', createdAt: '2026-05-05T09:00:00Z', updatedAt: '2026-05-05T09:00:00Z' },
  { id: 'tx-202', noReferensi: 'TRX-20260505-002', tglTransaksi: '2026-05-05', tipe: 'income',  customerId: 'cust-5', paymentMethod: 'transfer', totalNominal: 1_900_000, createdBy: 'user-2', createdAt: '2026-05-05T13:00:00Z', updatedAt: '2026-05-05T13:00:00Z' },
  { id: 'tx-203', noReferensi: 'EXP-20260505-001', tglTransaksi: '2026-05-05', tipe: 'expense', supplierId: 'supp-3', paymentMethod: 'transfer', totalNominal: 850_000,  createdBy: 'user-1', createdAt: '2026-05-05T15:00:00Z', updatedAt: '2026-05-05T15:00:00Z' },
  // ── Rabu 06 Mei ──
  { id: 'tx-301', noReferensi: 'TRX-20260506-001', tglTransaksi: '2026-05-06', tipe: 'income',  customerId: 'cust-1', paymentMethod: 'cash',     totalNominal: 980_000,  createdBy: 'user-2', createdAt: '2026-05-06T10:00:00Z', updatedAt: '2026-05-06T10:00:00Z' },
  { id: 'tx-302', noReferensi: 'TRX-20260506-002', tglTransaksi: '2026-05-06', tipe: 'income',  customerId: 'cust-2', paymentMethod: 'qris',     totalNominal: 1_000_000, createdBy: 'user-2', createdAt: '2026-05-06T13:00:00Z', updatedAt: '2026-05-06T13:00:00Z' },
  { id: 'tx-303', noReferensi: 'EXP-20260506-001', tglTransaksi: '2026-05-06', tipe: 'expense', supplierId: 'supp-1', paymentMethod: 'cash',     totalNominal: 420_000,  createdBy: 'user-1', createdAt: '2026-05-06T14:00:00Z', updatedAt: '2026-05-06T14:00:00Z' },
  // ── Kamis 07 Mei ──
  { id: 'tx-401', noReferensi: 'TRX-20260507-001', tglTransaksi: '2026-05-07', tipe: 'income',  customerId: 'cust-3', paymentMethod: 'transfer', totalNominal: 2_150_000, createdBy: 'user-2', createdAt: '2026-05-07T09:00:00Z', updatedAt: '2026-05-07T09:00:00Z' },
  { id: 'tx-402', noReferensi: 'TRX-20260507-002', tglTransaksi: '2026-05-07', tipe: 'income',  customerId: 'cust-4', paymentMethod: 'cash',     totalNominal: 2_000_000, createdBy: 'user-2', createdAt: '2026-05-07T13:00:00Z', updatedAt: '2026-05-07T13:00:00Z' },
  { id: 'tx-403', noReferensi: 'EXP-20260507-001', tglTransaksi: '2026-05-07', tipe: 'expense', supplierId: 'supp-3', paymentMethod: 'transfer', totalNominal: 1_650_000, createdBy: 'user-1', createdAt: '2026-05-07T16:00:00Z', updatedAt: '2026-05-07T16:00:00Z' },
  // ── Jumat 08 Mei ──
  { id: 'tx-501', noReferensi: 'TRX-20260508-001', tglTransaksi: '2026-05-08', tipe: 'income',  customerId: 'cust-5', paymentMethod: 'transfer', totalNominal: 2_320_000, createdBy: 'user-2', createdAt: '2026-05-08T09:00:00Z', updatedAt: '2026-05-08T09:00:00Z' },
  { id: 'tx-502', noReferensi: 'TRX-20260508-002', tglTransaksi: '2026-05-08', tipe: 'income',  customerId: 'cust-1', paymentMethod: 'qris',     totalNominal: 3_000_000, createdBy: 'user-2', createdAt: '2026-05-08T13:00:00Z', updatedAt: '2026-05-08T13:00:00Z' },
  { id: 'tx-503', noReferensi: 'EXP-20260508-001', tglTransaksi: '2026-05-08', tipe: 'expense', supplierId: 'supp-2', paymentMethod: 'transfer', totalNominal: 1_980_000, createdBy: 'user-1', createdAt: '2026-05-08T16:00:00Z', updatedAt: '2026-05-08T16:00:00Z' },
  // ── Sabtu 09 Mei ──
  { id: 'tx-601', noReferensi: 'TRX-20260509-001', tglTransaksi: '2026-05-09', tipe: 'income',  customerId: 'cust-2', paymentMethod: 'cash',     totalNominal: 3_280_000, createdBy: 'user-2', createdAt: '2026-05-09T09:00:00Z', updatedAt: '2026-05-09T09:00:00Z' },
  { id: 'tx-602', noReferensi: 'TRX-20260509-002', tglTransaksi: '2026-05-09', tipe: 'income',  customerId: 'cust-3', paymentMethod: 'transfer', totalNominal: 3_500_000, createdBy: 'user-2', createdAt: '2026-05-09T13:00:00Z', updatedAt: '2026-05-09T13:00:00Z' },
  { id: 'tx-603', noReferensi: 'EXP-20260509-001', tglTransaksi: '2026-05-09', tipe: 'expense', supplierId: 'supp-1', paymentMethod: 'transfer', totalNominal: 2_240_000, createdBy: 'user-1', createdAt: '2026-05-09T16:00:00Z', updatedAt: '2026-05-09T16:00:00Z' },
  // ── Minggu 10 Mei (today) — 5 recent tx match T6 dashboard ──
  { id: 'tx-701', noReferensi: 'TRX-20260510-018', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-1', paymentMethod: 'cash',     totalNominal: 425_000,  createdBy: 'user-2', createdAt: '2026-05-10T14:32:00Z', updatedAt: '2026-05-10T14:32:00Z' },
  { id: 'tx-702', noReferensi: 'TRX-20260510-017', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-2', paymentMethod: 'qris',     totalNominal: 85_000,   createdBy: 'user-2', createdAt: '2026-05-10T14:08:00Z', updatedAt: '2026-05-10T14:08:00Z' },
  { id: 'tx-703', noReferensi: 'EXP-20260510-004', tglTransaksi: '2026-05-10', tipe: 'expense', supplierId: 'supp-2', paymentMethod: 'transfer', totalNominal: 350_000,  createdBy: 'user-2', createdAt: '2026-05-10T13:45:00Z', updatedAt: '2026-05-10T13:45:00Z' },
  { id: 'tx-704', noReferensi: 'TRX-20260510-016', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-3', paymentMethod: 'transfer', totalNominal: 950_000,  createdBy: 'user-2', createdAt: '2026-05-10T13:21:00Z', updatedAt: '2026-05-10T13:21:00Z' },
  { id: 'tx-705', noReferensi: 'TRX-20260510-015', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-4', paymentMethod: 'cash',     totalNominal: 280_000,  createdBy: 'user-2', createdAt: '2026-05-10T12:54:00Z', updatedAt: '2026-05-10T12:54:00Z' },
  { id: 'tx-706', noReferensi: 'TRX-20260510-014', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-1', paymentMethod: 'cash',     totalNominal: 195_000,  createdBy: 'user-2', createdAt: '2026-05-10T12:30:00Z', updatedAt: '2026-05-10T12:30:00Z' },
  { id: 'tx-707', noReferensi: 'TRX-20260510-013', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-5', paymentMethod: 'qris',     totalNominal: 540_000,  createdBy: 'user-2', createdAt: '2026-05-10T11:48:00Z', updatedAt: '2026-05-10T11:48:00Z' },
  { id: 'tx-708', noReferensi: 'TRX-20260510-012', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-2', paymentMethod: 'cash',     totalNominal: 540_000,  createdBy: 'user-2', createdAt: '2026-05-10T10:30:00Z', updatedAt: '2026-05-10T10:30:00Z' },
  { id: 'tx-709', noReferensi: 'EXP-20260510-003', tglTransaksi: '2026-05-10', tipe: 'expense', supplierId: 'supp-1', paymentMethod: 'cash',     totalNominal: 630_000,  createdBy: 'user-1', createdAt: '2026-05-10T09:00:00Z', updatedAt: '2026-05-10T09:00:00Z' },
  // tx-710: Sparepart batch sale — brings MIN income to 4,890,000 (matches T6 cashflow target)
  { id: 'tx-710', noReferensi: 'TRX-20260510-011', tglTransaksi: '2026-05-10', tipe: 'income',  customerId: 'cust-5', paymentMethod: 'transfer', totalNominal: 1_875_000, createdBy: 'user-2', createdAt: '2026-05-10T10:00:00Z', updatedAt: '2026-05-10T10:00:00Z' },
]

// Lines mapping transactions to categories
const SEED_LINES: TransactionLine[] = [
  // tx-101: Jasa 600k + Sparepart 350k
  { id: 'ln-101a', transactionId: 'tx-101', categoryId: 'cat-01', nominal: 600_000, biayaMaterial: 50_000 },
  { id: 'ln-101b', transactionId: 'tx-101', categoryId: 'cat-06', nominal: 350_000, biayaMaterial: 0 },
  // tx-102: Jasa 450k + Oli 300k
  { id: 'ln-102a', transactionId: 'tx-102', categoryId: 'cat-01', nominal: 450_000, biayaMaterial: 0 },
  { id: 'ln-102b', transactionId: 'tx-102', categoryId: 'cat-05', nominal: 300_000, biayaMaterial: 0 },
  // tx-103: Dyno 750k
  { id: 'ln-103a', transactionId: 'tx-103', categoryId: 'cat-02', nominal: 750_000, biayaMaterial: 0 },
  // tx-104: Beli Stok Oli expense
  { id: 'ln-104a', transactionId: 'tx-104', categoryId: 'cat-08', nominal: 1_100_000, biayaMaterial: 0 },
  // tx-201: Jasa 1.32jt
  { id: 'ln-201a', transactionId: 'tx-201', categoryId: 'cat-01', nominal: 1_320_000, biayaMaterial: 120_000 },
  // tx-202: Sparepart 1.1jt + Oli 800k
  { id: 'ln-202a', transactionId: 'tx-202', categoryId: 'cat-06', nominal: 1_100_000, biayaMaterial: 0 },
  { id: 'ln-202b', transactionId: 'tx-202', categoryId: 'cat-05', nominal: 800_000,   biayaMaterial: 0 },
  // tx-203: Beli Sparepart expense
  { id: 'ln-203a', transactionId: 'tx-203', categoryId: 'cat-09', nominal: 850_000, biayaMaterial: 0 },
  // tx-301: Jasa 980k
  { id: 'ln-301a', transactionId: 'tx-301', categoryId: 'cat-01', nominal: 980_000, biayaMaterial: 80_000 },
  // tx-302: Bubut Dalam 1jt
  { id: 'ln-302a', transactionId: 'tx-302', categoryId: 'cat-04', nominal: 1_000_000, biayaMaterial: 100_000 },
  // tx-303: Beli Oli expense
  { id: 'ln-303a', transactionId: 'tx-303', categoryId: 'cat-08', nominal: 420_000, biayaMaterial: 0 },
  // tx-401: Jasa 2.15jt
  { id: 'ln-401a', transactionId: 'tx-401', categoryId: 'cat-01', nominal: 2_150_000, biayaMaterial: 200_000 },
  // tx-402: Sparepart 1.2jt + Jasa 800k
  { id: 'ln-402a', transactionId: 'tx-402', categoryId: 'cat-06', nominal: 1_200_000, biayaMaterial: 0 },
  { id: 'ln-402b', transactionId: 'tx-402', categoryId: 'cat-01', nominal: 800_000,   biayaMaterial: 0 },
  // tx-403: Beli Sparepart expense
  { id: 'ln-403a', transactionId: 'tx-403', categoryId: 'cat-09', nominal: 1_650_000, biayaMaterial: 0 },
  // tx-501: Dyno 2.32jt
  { id: 'ln-501a', transactionId: 'tx-501', categoryId: 'cat-02', nominal: 2_320_000, biayaMaterial: 0 },
  // tx-502: Jasa 2jt + Sparepart 1jt
  { id: 'ln-502a', transactionId: 'tx-502', categoryId: 'cat-01', nominal: 2_000_000, biayaMaterial: 150_000 },
  { id: 'ln-502b', transactionId: 'tx-502', categoryId: 'cat-06', nominal: 1_000_000, biayaMaterial: 0 },
  // tx-503: Bayar Vendor Bubut
  { id: 'ln-503a', transactionId: 'tx-503', categoryId: 'cat-12', nominal: 1_980_000, biayaMaterial: 0 },
  // tx-601: Jasa 3.28jt
  { id: 'ln-601a', transactionId: 'tx-601', categoryId: 'cat-01', nominal: 3_280_000, biayaMaterial: 280_000 },
  // tx-602: Bubut Dalam 2jt + Sparepart 1.5jt
  { id: 'ln-602a', transactionId: 'tx-602', categoryId: 'cat-04', nominal: 2_000_000, biayaMaterial: 200_000 },
  { id: 'ln-602b', transactionId: 'tx-602', categoryId: 'cat-06', nominal: 1_500_000, biayaMaterial: 0 },
  // tx-603: Beli Stok Oli
  { id: 'ln-603a', transactionId: 'tx-603', categoryId: 'cat-08', nominal: 2_240_000, biayaMaterial: 0 },
  // ── 10 Mei (today) ──
  // tx-701: Jasa+Sparepart 425k (matches recent tx TRX-20260510-018 "Jasa, Sparepart")
  { id: 'ln-701a', transactionId: 'tx-701', categoryId: 'cat-01', nominal: 275_000, biayaMaterial: 25_000 },
  { id: 'ln-701b', transactionId: 'tx-701', categoryId: 'cat-06', nominal: 150_000, biayaMaterial: 0 },
  // tx-702: Oli 85k (TRX-20260510-017 "Oli")
  { id: 'ln-702a', transactionId: 'tx-702', categoryId: 'cat-05', nominal: 85_000, biayaMaterial: 0 },
  // tx-703: Bayar Vendor (EXP-20260510-004 "Bayar Vendor")
  { id: 'ln-703a', transactionId: 'tx-703', categoryId: 'cat-12', nominal: 350_000, biayaMaterial: 0 },
  // tx-704: Dyno+Jasa 950k (TRX-20260510-016 "Dyno, Jasa")
  { id: 'ln-704a', transactionId: 'tx-704', categoryId: 'cat-02', nominal: 600_000, biayaMaterial: 0 },
  { id: 'ln-704b', transactionId: 'tx-704', categoryId: 'cat-01', nominal: 350_000, biayaMaterial: 0 },
  // tx-705: Bubut Dalam 280k (TRX-20260510-015 "Bubut Dalam")
  { id: 'ln-705a', transactionId: 'tx-705', categoryId: 'cat-04', nominal: 280_000, biayaMaterial: 50_000 },
  // tx-706: Jasa+Oli 195k (TRX-20260510-014 "Jasa, Oli")
  { id: 'ln-706a', transactionId: 'tx-706', categoryId: 'cat-01', nominal: 120_000, biayaMaterial: 0 },
  { id: 'ln-706b', transactionId: 'tx-706', categoryId: 'cat-05', nominal: 75_000,  biayaMaterial: 0 },
  // tx-707: Sparepart 540k (TRX-20260510-013 "Sparepart")
  { id: 'ln-707a', transactionId: 'tx-707', categoryId: 'cat-06', nominal: 540_000, biayaMaterial: 0 },
  // tx-708: Jasa 540k
  { id: 'ln-708a', transactionId: 'tx-708', categoryId: 'cat-01', nominal: 540_000, biayaMaterial: 40_000 },
  // tx-709: Beli Stok expense
  { id: 'ln-709a', transactionId: 'tx-709', categoryId: 'cat-08', nominal: 630_000, biayaMaterial: 0 },
  // tx-710: Sparepart batch (no jasa, no komisi contribution)
  { id: 'ln-710a', transactionId: 'tx-710', categoryId: 'cat-06', nominal: 1_875_000, biayaMaterial: 0 },
]

// All jasa lines assigned to Doni (mech-1) at 100% — owner adds more mekanik via Master Mekanik
const SEED_LINE_MECHANICS: TransactionLineMechanic[] = [
  { id: 'lm-01', transactionLineId: 'ln-101a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-02', transactionLineId: 'ln-102a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-03', transactionLineId: 'ln-103a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-04', transactionLineId: 'ln-201a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-05', transactionLineId: 'ln-301a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-06', transactionLineId: 'ln-302a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-07', transactionLineId: 'ln-401a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-08', transactionLineId: 'ln-402b', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-09', transactionLineId: 'ln-501a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-10', transactionLineId: 'ln-502a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-11', transactionLineId: 'ln-601a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-12', transactionLineId: 'ln-602a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-13', transactionLineId: 'ln-701a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-14', transactionLineId: 'ln-704a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-15', transactionLineId: 'ln-704b', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-16', transactionLineId: 'ln-705a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-17', transactionLineId: 'ln-706a', mechanicId: 'mech-1', sharePercent: 100 },
  { id: 'lm-18', transactionLineId: 'ln-708a', mechanicId: 'mech-1', sharePercent: 100 },
]

// ── Store ─────────────────────────────────────────────────────────────────────

interface TransactionState {
  transactions: Transaction[]
  lines: TransactionLine[]
  lineMechanics: TransactionLineMechanic[]
  bubutLuarLinks: BubutLuarLink[]

  addTransaction: (
    tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'totalNominal'>,
    lines: Omit<TransactionLine, 'id' | 'transactionId'>[],
    lineMechanics: Omit<TransactionLineMechanic, 'id' | 'transactionLineId'>[][],
  ) => string

  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  softDelete: (id: string, deletedAt: string) => void
}

export const useTransactionStore = create<TransactionState>()(
  devtools(
    persist(
      (set) => ({
        transactions: SEED_TX,
        lines: SEED_LINES,
        lineMechanics: SEED_LINE_MECHANICS,
        bubutLuarLinks: [],

        addTransaction: (txData, linesData, mechanicsPerLine) => {
          const txId = `tx-${Date.now()}`
          const now = new Date().toISOString()
          const newLines = linesData.map((l, i) => {
            const lineId = `ln-${Date.now()}-${i}`
            return { ...l, id: lineId, transactionId: txId }
          })
          const totalNominal = linesData.reduce((s, l) => s + l.nominal, 0)
          const newLineMechanics = newLines.flatMap((line, i) =>
            (mechanicsPerLine[i] ?? []).map((lm) => ({
              ...lm,
              id: `lm-${Date.now()}-${line.id}`,
              transactionLineId: line.id,
            }))
          )
          set((s) => ({
            transactions: [...s.transactions, {
              ...txData,
              id: txId,
              totalNominal,
              createdAt: now,
              updatedAt: now,
            }],
            lines: [...s.lines, ...newLines],
            lineMechanics: [...s.lineMechanics, ...newLineMechanics],
          }))
          return txId
        },

        updateTransaction: (id, patch) => set((s) => ({
          transactions: s.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...patch, updatedAt: new Date().toISOString() } : tx
          ),
        })),

        softDelete: (id, deletedAt) => set((s) => ({
          transactions: s.transactions.map((tx) =>
            tx.id === id ? { ...tx, deletedAt, updatedAt: new Date().toISOString() } : tx
          ),
        })),
      }),
      { name: 'nq21-transactions', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'TransactionStore', enabled: import.meta.env.DEV }
  )
)
