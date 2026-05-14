import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, type Supplier } from '@/features/suppliers/hooks'
import { MasterCRUDPage, type ColumnConfig } from '@/components/nq21/MasterCRUDPage'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { FormField } from '@/components/nq21/FormField'
import { EmptyState } from '@/components/nq21/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  phone: z.string().max(30).optional().or(z.literal('')),
  is_vendor_bubut: z.boolean(),
  notes: z.string().max(500).optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const columns: ColumnConfig<Supplier>[] = [
  {
    key: 'name',
    label: 'Nama',
    sortable: true,
    render: s => <span style={{ fontWeight: 600 }}>{s.name}</span>,
  },
  {
    key: 'phone',
    label: 'Telepon',
    render: s => s.phone
      ? <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{s.phone}</span>
      : <span style={{ color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'is_vendor_bubut',
    label: 'Tipe',
    render: s => s.is_vendor_bubut
      ? <Badge variant="vendor">⚙ VENDOR BUBUT</Badge>
      : <Badge variant="open">REGULAR</Badge>,
  },
  {
    key: 'notes',
    label: 'Catatan',
    render: s => s.notes
      ? (
        <span
          title={s.notes}
          style={{
            fontSize: 13, color: 'var(--text-secondary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 240, display: 'block',
          }}
        >
          {s.notes}
        </span>
      )
      : null,
  },
  {
    key: 'is_active',
    label: 'Status',
    render: s => <Badge variant={s.is_active ? 'paid' : 'default'}>{s.is_active ? 'AKTIF' : 'NONAKTIF'}</Badge>,
  },
]

function FilterPills({ vendorOnly, onChange }: { vendorOnly: boolean; onChange: (v: boolean) => void }) {
  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
        letterSpacing: '0.04em', border: 'none', cursor: 'pointer',
        background: active ? 'var(--text)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{
      display: 'flex', gap: 2, background: 'var(--surface-alt)',
      borderRadius: 8, padding: 3, border: '1px solid var(--border)',
    }}>
      {pill('Semua', !vendorOnly, () => onChange(false))}
      {pill('Vendor Bubut', vendorOnly, () => onChange(true))}
    </div>
  )
}

export default function MasterSupplierPage() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'

  const [showInactive, setShowInactive] = useState(false)
  const [vendorOnly, setVendorOnly] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null)

  const { data: suppliers = [], isLoading, error } = useSuppliers(showInactive, vendorOnly)
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', is_vendor_bubut: false, notes: '' },
  })
  const isVendorBubut = watch('is_vendor_bubut')

  if (error) {
    return <EmptyState message={`Gagal memuat data: ${(error as Error).message}`} />
  }

  function openAdd() {
    reset({ name: '', phone: '', is_vendor_bubut: false, notes: '' })
    setDialogMode('add')
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(s: Supplier) {
    reset({ name: s.name, phone: s.phone ?? '', is_vendor_bubut: s.is_vendor_bubut, notes: s.notes ?? '' })
    setDialogMode('edit')
    setEditing(s)
    setDialogOpen(true)
  }

  function openDelete(s: Supplier) {
    setPendingDelete(s)
    setConfirmOpen(true)
  }

  async function onSubmit(data: FormData) {
    const input = {
      name: data.name,
      phone: data.phone || null,
      is_vendor_bubut: data.is_vendor_bubut,
      notes: data.notes || null,
    }
    try {
      if (dialogMode === 'add') {
        await createMutation.mutateAsync(input)
        toast('Supplier ditambahkan', { description: `${data.name} berhasil ditambahkan.`, variant: 'success' })
      } else if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input })
        toast('Supplier diperbarui', { description: `${data.name} berhasil disimpan.`, variant: 'success' })
      }
      setDialogOpen(false)
    } catch (err) {
      toast('Gagal menyimpan', { description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast('Supplier dinonaktifkan', { description: `${pendingDelete.name} tidak ditampilkan di list aktif.` })
    } catch (err) {
      toast('Gagal menonaktifkan', { description: (err as Error).message, variant: 'destructive' })
    }
    setPendingDelete(null)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <>
      <MasterCRUDPage
        title="Supplier"
        description="Daftar supplier dan vendor bubut NQ21"
        addButtonLabel="+ Tambah Supplier"
        data={suppliers}
        columns={columns}
        searchKeys={['name', 'phone']}
        onAdd={openAdd}
        onEdit={isOwner ? openEdit : undefined}
        onDelete={isOwner ? openDelete : undefined}
        emptyState={{
          message: isLoading
            ? 'Memuat data...'
            : vendorOnly
              ? 'Tidak ada vendor bubut terdaftar.'
              : showInactive
                ? 'Tidak ada supplier.'
                : 'Belum ada supplier terdaftar.',
          action: (!vendorOnly && !showInactive && !isLoading)
            ? { label: '+ Tambah Supplier Pertama', onClick: openAdd }
            : undefined,
        }}
        enableFilters={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilterPills vendorOnly={vendorOnly} onChange={setVendorOnly} />
            <Button
              variant={showInactive ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowInactive(s => !s)}
            >
              {showInactive ? 'Sembunyikan Nonaktif' : 'Tampilkan Nonaktif'}
            </Button>
          </div>
        }
      />

      <AddEditDialog
        open={dialogOpen}
        mode={dialogMode}
        title={dialogMode === 'add' ? 'Tambah Supplier' : `Edit: ${editing?.name ?? ''}`}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        submitLabel={isMutating ? 'Menyimpan...' : dialogMode === 'add' ? 'Tambah' : 'Simpan'}
      >
        <FormField label="Nama" htmlFor="s-name" required error={errors.name?.message}>
          <Input id="s-name" placeholder="Contoh: Toko Sparepart Maju" {...register('name')} />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField label="Telepon" htmlFor="s-phone" error={errors.phone?.message}>
            <Input id="s-phone" placeholder="Contoh: 0812-xxxx-xxxx" {...register('phone')} />
          </FormField>

          <FormField label="Vendor Bubut Luar">
            <button
              type="button"
              onClick={() => setValue('is_vendor_bubut', !isVendorBubut)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            >
              <div style={{
                width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 2,
                background: isVendorBubut ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.15s',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 2, left: isVendorBubut ? 18 : 2, transition: 'left 0.15s',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {isVendorBubut ? 'Ya, Vendor Bubut' : 'Bukan Vendor Bubut'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                  Aktifkan kalau supplier menerima order bubut luar dari NQ21.
                </div>
              </div>
            </button>
          </FormField>
        </div>

        <FormField label="Catatan" htmlFor="s-notes" error={errors.notes?.message}>
          <textarea
            id="s-notes"
            {...register('notes')}
            placeholder="Catatan tambahan (opsional)"
            rows={2}
            style={{
              width: '100%', padding: '8px 12px', resize: 'vertical',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
              background: 'var(--surface)', color: 'var(--text)',
              fontFamily: 'var(--body)', fontSize: 14, outline: 'none',
            }}
          />
        </FormField>
      </AddEditDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Nonaktifkan Supplier?"
        message={`Hapus supplier ${pendingDelete?.name ?? 'ini'}? Riwayat transaksi tetap aman.`}
        confirmLabel="Nonaktifkan"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  )
}
