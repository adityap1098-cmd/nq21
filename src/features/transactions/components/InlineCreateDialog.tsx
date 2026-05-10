import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { FormField } from '@/components/nq21/FormField'
import { Input } from '@/components/ui/input'
import { useCustomerStore } from '@/store/master/customers'
import { useSupplierStore } from '@/store/master/suppliers'
import { useAuditStore } from '@/store/audit'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/hooks/use-toast'
import type { Customer, Supplier } from '@/store/types'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  motorType: z.string().optional(),
  phone: z.string().optional(),
})

const supplierSchema = z.object({
  name: z.string().min(2, 'Minimal 2 karakter'),
  phone: z.string().optional(),
  isVendorBubut: z.boolean(),
})

type CustomerForm = z.infer<typeof customerSchema>
type SupplierForm = z.infer<typeof supplierSchema>

// ─── Props ───────────────────────────────────────────────────────────────────

export interface InlineCreateDialogProps {
  open: boolean
  onClose: () => void
  type: 'customer' | 'supplier'
  initialName: string
  onSuccess: (id: string) => void
}

// ─── Customer sub-form ────────────────────────────────────────────────────────

function CustomerSubForm({
  initialName,
  onSuccess,
  onClose,
}: {
  initialName: string
  onSuccess: (id: string) => void
  onClose: () => void
}) {
  const { customers, add } = useCustomerStore()
  const { log } = useAuditStore()
  const { user } = useAuthStore()
  const [duplicateOf, setDuplicateOf] = useState<Customer | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: initialName, motorType: '', phone: '' },
  })

  // Sync initial name when dialog re-opens with different query
  useEffect(() => {
    reset({ name: initialName, motorType: '', phone: '' })
    setDuplicateOf(null)
  }, [initialName, reset])

  function onSubmit(data: CustomerForm) {
    const trimmedName = data.name.trim()
    const existing = customers.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (existing) {
      setError('name', {
        message: `Customer "${existing.name}" sudah ada.`,
      })
      setDuplicateOf(existing)
      return
    }

    add({
      name: trimmedName,
      motorType: data.motorType?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      isActive: true,
    })

    // Look up the real ID from store state (store generates it internally)
    const { customers: updated } = useCustomerStore.getState()
    const newItem = updated.find((c) => c.name === trimmedName && c.isActive)
    const newId = newItem?.id ?? ''

    log({
      userId: user?.name ?? 'unknown',
      action: 'create',
      entityType: 'customer',
      entityId: newId,
      afterData: { name: trimmedName, source: 'inline-from-transaksi' },
    })

    toast(`Customer "${trimmedName}" berhasil ditambahkan`, { variant: 'success' })
    onSuccess(newId)
  }

  return (
    <AddEditDialog
      open
      mode="add"
      title="Tambah Customer Baru"
      description="Customer ini akan ditambahkan ke Master Customer dan otomatis dipilih di transaksi ini."
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="Tambah Customer"
      loading={isSubmitting}
    >
      <FormField label="Nama" htmlFor="ic-cust-name" required error={errors.name?.message}>
        <Input
          id="ic-cust-name"
          autoFocus
          placeholder="Nama customer"
          {...register('name')}
          onChange={(e) => {
            register('name').onChange(e)
            setDuplicateOf(null)
          }}
        />
        {duplicateOf && (
          <button
            type="button"
            onClick={() => { onSuccess(duplicateOf.id); onClose() }}
            style={{
              marginTop: 4, fontSize: 12, color: 'var(--accent)',
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', textDecoration: 'underline', textAlign: 'left',
            }}
          >
            Pilih "{duplicateOf.name}"
          </button>
        )}
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <FormField label="Tipe Motor" htmlFor="ic-cust-motor" error={errors.motorType?.message}>
          <Input id="ic-cust-motor" placeholder="Contoh: Vario 150" {...register('motorType')} />
        </FormField>
        <FormField label="Telepon" htmlFor="ic-cust-phone" error={errors.phone?.message}>
          <Input id="ic-cust-phone" placeholder="Contoh: 0812-xxxx" {...register('phone')} />
        </FormField>
      </div>
    </AddEditDialog>
  )
}

// ─── Supplier sub-form ────────────────────────────────────────────────────────

function SupplierSubForm({
  initialName,
  onSuccess,
  onClose,
}: {
  initialName: string
  onSuccess: (id: string) => void
  onClose: () => void
}) {
  const { suppliers, add } = useSupplierStore()
  const { log } = useAuditStore()
  const { user } = useAuthStore()
  const [duplicateOf, setDuplicateOf] = useState<Supplier | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: initialName, phone: '', isVendorBubut: false },
  })

  useEffect(() => {
    reset({ name: initialName, phone: '', isVendorBubut: false })
    setDuplicateOf(null)
  }, [initialName, reset])

  const isVendorBubut = watch('isVendorBubut')

  function onSubmit(data: SupplierForm) {
    const trimmedName = data.name.trim()
    const existing = suppliers.find(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (existing) {
      setError('name', {
        message: `Supplier "${existing.name}" sudah ada.`,
      })
      setDuplicateOf(existing)
      return
    }

    add({
      name: trimmedName,
      phone: data.phone?.trim() || undefined,
      isVendorBubut: data.isVendorBubut,
      isActive: true,
    })

    const { suppliers: updated } = useSupplierStore.getState()
    const newItem = updated.find((s) => s.name === trimmedName && s.isActive)
    const newId = newItem?.id ?? ''

    log({
      userId: user?.name ?? 'unknown',
      action: 'create',
      entityType: 'supplier',
      entityId: newId,
      afterData: { name: trimmedName, source: 'inline-from-transaksi' },
    })

    toast(`Supplier "${trimmedName}" berhasil ditambahkan`, { variant: 'success' })
    onSuccess(newId)
  }

  return (
    <AddEditDialog
      open
      mode="add"
      title="Tambah Supplier Baru"
      description="Supplier ini akan ditambahkan ke Master Supplier dan otomatis dipilih di transaksi ini."
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="Tambah Supplier"
      loading={isSubmitting}
    >
      <FormField label="Nama" htmlFor="ic-supp-name" required error={errors.name?.message}>
        <Input
          id="ic-supp-name"
          autoFocus
          placeholder="Nama supplier"
          {...register('name')}
          onChange={(e) => {
            register('name').onChange(e)
            setDuplicateOf(null)
          }}
        />
        {duplicateOf && (
          <button
            type="button"
            onClick={() => { onSuccess(duplicateOf.id); onClose() }}
            style={{
              marginTop: 4, fontSize: 12, color: 'var(--accent)',
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', textDecoration: 'underline', textAlign: 'left',
            }}
          >
            Pilih "{duplicateOf.name}"
          </button>
        )}
      </FormField>

      <FormField label="Telepon" htmlFor="ic-supp-phone" error={errors.phone?.message}>
        <Input id="ic-supp-phone" placeholder="Contoh: 0812-xxxx-xxxx" {...register('phone')} />
      </FormField>

      <FormField label="Vendor Bubut Luar">
        <button
          type="button"
          onClick={() => setValue('isVendorBubut', !isVendorBubut)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, textAlign: 'left',
          }}
        >
          <div style={{
            width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 2,
            background: isVendorBubut ? 'var(--accent)' : 'var(--border)',
            position: 'relative', transition: 'background 0.15s',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: isVendorBubut ? 18 : 2, transition: 'left 0.15s',
            }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {isVendorBubut ? 'Ya, Vendor Bubut' : 'Bukan Vendor Bubut'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
              Aktifkan kalau supplier ini terima order bubut luar.
            </div>
          </div>
        </button>
      </FormField>
    </AddEditDialog>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function InlineCreateDialog({
  open,
  onClose,
  type,
  initialName,
  onSuccess,
}: InlineCreateDialogProps) {
  if (!open) return null

  if (type === 'customer') {
    return (
      <CustomerSubForm
        initialName={initialName}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    )
  }

  return (
    <SupplierSubForm
      initialName={initialName}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  )
}
