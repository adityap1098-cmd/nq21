import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { Supplier } from '../types'

const SEED: Supplier[] = [
  { id: 'supp-1', name: 'Toko Oli Sejahtera',    phone: '0812-2222-0001', isVendorBubut: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'supp-2', name: 'Bubut Mandala Jaya',     phone: '0812-2222-0002', isVendorBubut: true,  isActive: true, createdAt: '2026-01-01T00:00:00Z', notes: 'Vendor bubut rekanan utama' },
  { id: 'supp-3', name: 'Sparepart Berkah',        phone: '0812-2222-0003', isVendorBubut: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'supp-4', name: 'Dynojet Indonesia',       phone: '0812-2222-0004', isVendorBubut: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

interface SupplierState {
  suppliers: Supplier[]
  add: (s: Omit<Supplier, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<Supplier>) => void
  softDelete: (id: string) => void
}

export const useSupplierStore = create<SupplierState>()(
  devtools(
    persist(
      (set) => ({
        suppliers: SEED,
        add: (s) => set((st) => ({
          suppliers: [...st.suppliers, {
            ...s,
            id: `supp-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }],
        })),
        update: (id, patch) => set((st) => ({
          suppliers: st.suppliers.map((s) => s.id === id ? { ...s, ...patch } : s),
        })),
        softDelete: (id) => set((st) => ({
          suppliers: st.suppliers.map((s) => s.id === id ? { ...s, isActive: false } : s),
        })),
      }),
      { name: 'nq21-suppliers', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'SupplierStore', enabled: import.meta.env.DEV }
  )
)
