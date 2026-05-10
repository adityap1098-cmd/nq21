import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCustomerStore } from '@/store/master/customers'
import { useAuditStore } from '@/store/audit'
import { useAuthStore } from '@/store/auth'
import { MasterCRUDPage, type ColumnConfig } from '@/components/nq21/MasterCRUDPage'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { FormField } from '@/components/nq21/FormField'
import { DateDisplay } from '@/components/nq21/DateDisplay'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import type { Customer } from '@/store/types'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  motorType: z.string().max(50).optional().or(z.literal('')),
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
    key: 'motorType',
    label: 'Tipe Motor',
    render: c => c.motorType
      ? <span style={{ fontStyle: 'italic', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{c.motorType}</span>
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
    key: 'isActive',
    label: 'Status',
    render: c => (
      <Badge variant={c.isActive ? 'paid' : 'default'}>
        {c.isActive ? 'AKTIF' : 'NONAKTIF'}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    label: 'Tgl Masuk',
    render: c => <DateDisplay value={c.createdAt} />,
  },
]

export default function MasterCustomerPage() {
  const { customers, add, update, softDelete } = useCustomerStore()
  const { log: auditLog } = useAuditStore()
  const { user } = useAuthStore()

  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null)

  const displayCustomers = useMemo(
    () => showInactive ? customers : customers.filter(c => c.isActive),
    [customers, showInactive]
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', motorType: '', phone: '', notes: '' },
  })

  function openAdd() {
    reset({ name: '', motorType: '', phone: '', notes: '' })
    setDialogMode('add')
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(c: Customer) {
    reset({ name: c.name, motorType: c.motorType ?? '', phone: c.phone ?? '', notes: c.notes ?? '' })
    setDialogMode('edit')
    setEditing(c)
    setDialogOpen(true)
  }

  function openDelete(c: Customer) {
    setPendingDelete(c)
    setConfirmOpen(true)
  }

  function onSubmit(data: FormData) {
    const payload = {
      name: data.name,
      motorType: data.motorType || undefined,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
      isActive: true,
    }
    if (dialogMode === 'add') {
      add(payload)
      auditLog({ userId: user?.name ?? '', action: 'create', entityType: 'customer', entityId: 'new', afterData: { name: data.name } })
      toast('Customer ditambahkan', { description: `${data.name} berhasil ditambahkan.`, variant: 'success' })
    } else if (editing) {
      update(editing.id, payload)
      auditLog({ userId: user?.name ?? '', action: 'update', entityType: 'customer', entityId: editing.id, afterData: { name: data.name } })
      toast('Customer diperbarui', { description: `${data.name} berhasil disimpan.`, variant: 'success' })
    }
    setDialogOpen(false)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    softDelete(pendingDelete.id)
    auditLog({ userId: user?.name ?? '', action: 'delete', entityType: 'customer', entityId: pendingDelete.id, afterData: { isActive: false } })
    toast('Customer dinonaktifkan', { description: `${pendingDelete.name} tidak ditampilkan di list aktif.` })
    setPendingDelete(null)
  }

  return (
    <>
      <MasterCRUDPage
        title="Customer"
        description="Daftar pelanggan bengkel NQ21"
        addButtonLabel="+ Tambah Customer"
        data={displayCustomers}
        columns={columns}
        searchKeys={['name', 'motorType', 'phone']}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={openDelete}
        emptyState={{
          message: showInactive
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
        submitLabel={dialogMode === 'add' ? 'Tambah' : 'Simpan'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Nama" htmlFor="c-name" required error={errors.name?.message}>
              <Input id="c-name" placeholder="Contoh: Budi Santoso" {...register('name')} />
            </FormField>
          </div>

          <FormField label="Tipe Motor" htmlFor="c-motor" error={errors.motorType?.message}>
            <Input id="c-motor" placeholder="Contoh: Vario 150" {...register('motorType')} />
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
