// Single source of truth for all domain types — mirrors plan.md Section 2

export interface Customer {
  id: string
  name: string
  phone?: string
  notes?: string
  motorType?: string
  isActive: boolean
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  phone?: string
  notes?: string
  isVendorBubut: boolean
  isActive: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  isJasa: boolean
  isActive: boolean
  createdAt: string
}

export interface Mechanic {
  id: string
  name: string
  isActive: boolean
  notes?: string
  createdAt: string
}

export interface CommissionRate {
  id: string
  mechanicId: string
  categoryId: string
  ratePercent: number
}

export interface AppUser {
  id: string
  name: string
  username: string
  role: 'owner' | 'kasir'
  isActive: boolean
  password?: string      // plain text M002 FE-only; bcrypt in M006
  lastLoginAt?: string
  createdAt: string
}

export type PaymentMethod = 'cash' | 'transfer' | 'qris'
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  noReferensi: string
  tglTransaksi: string
  tipe: TransactionType
  customerId?: string
  supplierId?: string
  paymentMethod: PaymentMethod
  totalNominal: number
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface TransactionLine {
  id: string
  transactionId: string
  categoryId: string
  nominal: number
  biayaMaterial: number
  notes?: string
  itemName?: string
}

export interface TransactionLineMechanic {
  id: string
  transactionLineId: string
  mechanicId: string
  sharePercent: number
  rateOverride?: number
}

export interface BubutLuarLink {
  id: string
  revenueLineId: string
  expenseTransactionId: string
  vendorCost: number
}

export interface AuditLog {
  id: string
  userId: string
  action: 'create' | 'update' | 'delete'
  entityType: string
  entityId: string
  source?: string
  beforeData?: Record<string, unknown>
  afterData?: Record<string, unknown>
  createdAt: string
}

export type PeriodStatus = 'open' | 'closed'

export interface CommissionPeriod {
  id: string
  weekStart: string
  weekEnd: string
  status: PeriodStatus
  closedBy?: string
  closedAt?: string
}

export type PayoutStatus = 'pending' | 'paid'

export interface CommissionPayout {
  id: string
  periodId: string
  mechanicId: string
  totalJobs: number         // count of jasa lines mechanic was involved in
  totalBasis: number        // mechanic's portion: sum(basis × sharePercent/100)
  totalKomisi: number
  status: PayoutStatus
  createdAt: string
  paidAt?: string
  paidBy?: string           // userId who marked as paid
  paidNotes?: string
}
