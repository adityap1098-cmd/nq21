import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { Customer } from '../types'

const SEED: Customer[] = [
  { id: 'cust-1', name: 'Andi Wijaya',      motorType: 'Vario 150',  phone: '0812-1111-0001', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cust-2', name: 'Pak Hendro',        motorType: 'Beat',       phone: '0812-1111-0002', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cust-3', name: 'Rio Pratama',       motorType: 'R15',        phone: '0812-1111-0003', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cust-4', name: 'Ferdian Maulana',   motorType: 'Nmax',       phone: '0812-1111-0004', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cust-5', name: 'CV Maju Jaya',      motorType: undefined,    phone: '0812-1111-0005', notes: 'Pelanggan korporat', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

interface CustomerState {
  customers: Customer[]
  add: (c: Omit<Customer, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<Customer>) => void
  softDelete: (id: string) => void
}

export const useCustomerStore = create<CustomerState>()(
  devtools(
    persist(
      (set) => ({
        customers: SEED,
        add: (c) => set((s) => ({
          customers: [...s.customers, {
            ...c,
            id: `cust-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }],
        })),
        update: (id, patch) => set((s) => ({
          customers: s.customers.map((c) => c.id === id ? { ...c, ...patch } : c),
        })),
        softDelete: (id) => set((s) => ({
          customers: s.customers.map((c) => c.id === id ? { ...c, isActive: false } : c),
        })),
      }),
      { name: 'nq21-customers', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'CustomerStore', enabled: import.meta.env.DEV }
  )
)
