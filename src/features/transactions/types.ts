export interface LineMechanic {
  mechanicId: string | null
  sharePercent: number
  rateOverride?: number
}

export interface Line {
  id: string
  categoryId: string | null
  nominal: number
  biayaMaterial: number
  notes?: string
  itemName?: string
  mechanics: LineMechanic[]
  bubutVendor?: {
    supplierId: string | null
    vendorCost: number
  }
}
