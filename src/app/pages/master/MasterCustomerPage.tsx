import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, type Customer } from '@/features/customers/hooks'
import { MasterCRUDPage, type ColumnConfig } from '@/components/nq21/MasterCRUDPage'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { FormField } from '@/components/nq21/FormField'
import { DateDisplay } from '@/components/nq21/DateDisplay'
import { EmptyState } from '@/components/nq21/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  motor_type: z.string().max(50).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

const columns: ColumnConfig<Customer>[] = [
  {
    key: 'name',
    label: 'Nama',
    sortable: true,
    render: c => <span style={{ fontWeight: 600 }}>{c.name}</span>,
  },
  {
    key: 'motor_type',
    label: 'Tipe Motor',
    render: c => c.motor_type
      ? <span style={{ fontStyle: 'italic', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{c.motor_type}</span>
      : <span style={{ color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'phone',
    label: 'Telepon',
    render: c => c.phone
      ? <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{c.phone}</span>
      : <span style={{ color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'notes',
    label: 'Catatan',
    render: c => c.notes
      ? <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, display: 'block' }}>{c.notes}</span>
      : null,
  },
  {
    key: 'is_active',
    label: 'Status',
    render: c => <Badge variant={c.is_active ? 'paid' : 'default'}>{c.is_active ? 'AKTIF' : 'NONAKTIF'}</Badge>,
  },
  {
    key: 'created_at',
    label: 'Tgl Masuk',
    render: c => <DateDisplay value={c.created_at} />,
  },
]

export default function MasterCustomerPage() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'

  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null)

  const { data: customers = [], isLoading, error } = useCustomers(showInactive)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', motor_type: '', phone: '', notes: '' },
  })

  if (error) {
    return (
      <EmptyState
        message={`Gagal memuat data: ${(error as Error).message}`}
      />
    )
  }

  function openAdd() {
    reset({ name: '', motor_type: '', phone: '', notes: '' })
    setDialogMode('add')
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(c: Customer) {
    reset({ name: c.name, motor_type: c.motor_type ?? '', phone: c.phone ?? '', notes: c.notes ?? '' })
    setDialogMode('edit')
    setEditing(c)
    setDialogOpen(true)
  }

  function openDelete(c: Customer) {
    setPendingDelete(c)
    setConfirmOpen(true)
  }

  async function onSubmit(data: FormData) {
    const input = {
      name: data.name,
      motor_type: data.motor_type || null,
      phone: data.phone || null,
      notes: data.notes || null,
    }
    try {
      if (dialogMode === 'add') {
        await createMutation.mutateAsync(input)
        toast('Customer ditambahkan', { description: `${data.name} berhasil ditambahkan.`, variant: 'success' })
      } else if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input })
        toast('Customer diperbarui', { description: `${data.name} berhasil disimpan.`, variant: 'success' })
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
      toast('Customer dinonaktifkan', { description: `${pendingDelete.name} tidak ditampilkan di list aktif.` })
    } catch (err) {
      toast('Gagal menonaktifkan', { description: (err as Error).message, variant: 'destructive' })
    }
    setPendingDelete(null)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <>
      <MasterCRUDPage
        title="Customer"
        description="Daftar pelanggan bengkel NQ21"
        addButtonLabel="+ Tambah Customer"
        data={customers}
        columns={columns}
        searchKeys={['name', 'motor_type', 'phone']}
        onAdd={openAdd}
        onEdit={isOwner ? openEdit : undefined}
        onDelete={isOwner ? openDelete : undefined}
        emptyState={{
          message: isLoading
            ? 'Memuat data...'
            : showInactive
              ? 'Tidak ada customer.'
              : 'Tidak ada customer aktif. Tambahkan customer atau tampilkan yang nonaktif.',
        }}
        enableFilters={
          <Button
            variant={showInactive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowInactive(s => !s)}
          >
            {showInactive ? 'Sembunyikan Nonaktif' : 'Tampilkan Nonaktif'}
          </Button>
        }
      />

      <AddEditDialog
        open={dialogOpen}
        mode={dialogMode}
        title={dialogMode === 'add' ? 'Tambah Customer' : `Edit: ${editing?.name ?? ''}`}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        submitLabel={isMutating ? 'Menyimpan...' : dialogMode === 'add' ? 'Tambah' : 'Simpan'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Nama" htmlFor="c-name" required error={errors.name?.message}>
              <Input id="c-name" placeholder="Contoh: Budi Santoso" {...register('name')} />
            </FormField>
          </div>

          <FormField label="Tipe Motor" htmlFor="c-motor" error={errors.motor_type?.message}>
            <Input id="c-motor" placeholder="Contoh: Vario 150" {...register('motor_type')} />
          </FormField>

          <FormField label="Telepon" htmlFor="c-phone" error={errors.phone?.message}>
            <Input id="c-phone" placeholder="Contoh: 0812-xxxx-xxxx" {...register('phone')} />
          </FormField>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Catatan" htmlFor="c-notes" error={errors.notes?.message}>
              <textarea
                id="c-notes"
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
          </div>
        </div>
      </AddEditDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Nonaktifkan Customer?"
        message={`${pendingDelete?.name ?? 'Customer ini'} akan dinonaktifkan. Data historis tetap aman. Bisa diaktifkan kembali kapan saja.`}
        confirmLabel="Nonaktifkan"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  )
}
