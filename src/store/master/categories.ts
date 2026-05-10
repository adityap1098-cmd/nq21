import { create } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import type { Category } from '../types'

const SEED: Category[] = [
  // Income — is_jasa=true (4)
  { id: 'cat-01', name: 'Jasa',          type: 'income',  isJasa: true,  isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-02', name: 'Dyno',          type: 'income',  isJasa: true,  isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-03', name: 'Bubut Luar',    type: 'income',  isJasa: true,  isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-04', name: 'Bubut Dalam',   type: 'income',  isJasa: true,  isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  // Income — is_jasa=false
  { id: 'cat-05', name: 'Oli',           type: 'income',  isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-06', name: 'Sparepart',     type: 'income',  isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  // Expense
  { id: 'cat-07', name: 'Gaji',                 type: 'expense', isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-08', name: 'Beli Stok Oli',        type: 'expense', isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-09', name: 'Beli Stok Sparepart',  type: 'expense', isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-10', name: 'Listrik & Air',        type: 'expense', isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-11', name: 'Sewa',                 type: 'expense', isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-12', name: 'Bayar Vendor Bubut',   type: 'expense', isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-13', name: 'Lain-lain',            type: 'expense', isJasa: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

interface CategoryState {
  categories: Category[]
  add: (c: Omit<Category, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<Category>) => void
  softDelete: (id: string) => void
}

export const useCategoryStore = create<CategoryState>()(
  devtools(
    persist(
      (set) => ({
        categories: SEED,
        add: (c) => set((s) => ({
          categories: [...s.categories, {
            ...c,
            id: `cat-${Date.now()}`,
            createdAt: new Date().toISOString(),
          }],
        })),
        update: (id, patch) => set((s) => ({
          categories: s.categories.map((c) => c.id === id ? { ...c, ...patch } : c),
        })),
        softDelete: (id) => set((s) => ({
          categories: s.categories.map((c) => c.id === id ? { ...c, isActive: false } : c),
        })),
      }),
      { name: 'nq21-categories', storage: createJSONStorage(() => localStorage) }
    ),
    { name: 'CategoryStore', enabled: import.meta.env.DEV }
  )
)
