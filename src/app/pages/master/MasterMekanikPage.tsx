import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMechanicStore } from '@/store/master/mechanics'
import { useCategoryStore } from '@/store/master/categories'
import { useTransactionStore } from '@/store/transactions'
import { useAuditStore } from '@/store/audit'
import { useAuthStore } from '@/store/auth'
import { MasterCRUDPage, type ColumnConfig } from '@/components/nq21/MasterCRUDPage'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { RateMatrixTable } from '@/components/nq21/RateMatrixTable'
import { Section } from '@/components/nq21/Section'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { FormField } from '@/components/nq21/FormField'
import { DateDisplay } from '@/components/nq21/DateDisplay'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import type { Mechanic } from '@/store/types'

// Default rates for new mechanics (mirrors Doni's rates)
const DEFAULT_RATES: Record<string, number> = {
  'cat-01': 30,
  'cat-02': 25,
  'cat-03': 20,
  'cat-04': 40,
}

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  notes: z.string().optional(),
  isActive: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function MasterMekanikPage() {
  const { mechanics, rates, addMechanic, updateMechanic, upsertRate } = useMechanicStore()
  const { categories } = useCategoryStore()
  const { lineMechanics } = useTransactionStore()
  const { log: auditLog } = useAuditStore()
  const { user } = useAuthStore()

  const jasaCategories = useMemo(() => categories.filter(c => c.isJasa && c.isActive), [categories])

  const jobCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    lineMechanics.forEach(lm => {
      counts[lm.mechanicId] = (counts[lm.mechanicId] ?? 0) + 1
    })
    return counts
  }, [lineMechanics])

  // UI state
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<Mechanic | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Mechanic | null>(null)

  const displayMechanics = useMemo(
    () => showInactive ? mechanics : mechanics.filter(m => m.isActive),
    [mechanics, showInactive]
  )

  // Form
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', notes: '', isActive: true },
  })

  function openAdd() {
    reset({ name: '', notes: '', isActive: true })
    setDialogMode('add')
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(m: Mechanic) {
    reset({ name: m.name, notes: m.notes ?? '', isActive: m.isActive })
    setDialogMode('edit')
    setEditing(m)
    setDialogOpen(true)
  }

  function openDelete(m: Mechanic) {
    setPendingDelete(m)
    setConfirmOpen(true)
  }

  function onSubmit(data: FormData) {
    if (dialogMode === 'add') {
      const before = useMechanicStore.getState().mechanics
      addMechanic({ name: data.name, notes: data.notes, isActive: data.isActive })
      const after = useMechanicStore.getState().mechanics
      const newM = after.find(m => !before.some(b => b.id === m.id))
      if (newM) {
        jasaCategories.forEach(cat => {
          upsertRate({ mechanicId: newM.id, categoryId: cat.id, ratePercent: DEFAULT_RATES[cat.id] ?? 0 })
        })
        auditLog({ userId: user?.name ?? '', action: 'create', entityType: 'mechanic', entityId: newM.id, afterData: { name: data.name } })
      }
      toast('Mekanik ditambahkan', { description: `${data.name} berhasil ditambahkan dengan default rates.`, variant: 'success' })
    } else if (editing) {
      updateMechanic(editing.id, { name: data.name, notes: data.notes, isActive: data.isActive })
      auditLog({ userId: user?.name ?? '', action: 'update', entityType: 'mechanic', entityId: editing.id, afterData: { name: data.name, isActive: data.isActive } })
      toast('Mekanik diperbarui', { description: `${data.name} berhasil disimpan.`, variant: 'success' })
    }
    setDialogOpen(false)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    updateMechanic(pendingDelete.id, { isActive: false })
    auditLog({ userId: user?.name ?? '', action: 'delete', entityType: 'mechanic', entityId: pendingDelete.id, afterData: { isActive: false } })
    toast('Mekanik dinonaktifkan', { description: `${pendingDelete.name} tidak ditampilkan di list aktif.` })
    setPendingDelete(null)
  }

  function handleRateChange(mechanicId: string, categoryId: string, value: number) {
    upsertRate({ mechanicId, categoryId, ratePercent: value })
    auditLog({ userId: user?.name ?? '', action: 'update', entityType: 'commission_rate', entityId: `${mechanicId}:${categoryId}`, afterData: { ratePercent: value } })
  }

  // Columns for top list table
  const columns: ColumnConfig<Mechanic>[] = [
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      render: m => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: m.isActive ? 'var(--text)' : 'var(--text-muted)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--display)', fontSize: 13,
          }}>
            {m.name[0].toUpperCase()}
          </div>
          <span style={{ fontWeight: 700 }}>{m.name}</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: m => (
        <Badge variant={m.isActive ? 'paid' : 'default'}>
          {m.isActive ? 'AKTIF' : 'NONAKTIF'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Bergabung',
      render: m => <DateDisplay value={m.createdAt} />,
    },
    {
      key: 'id',
      label: 'Jasa',
      align: 'center',
      render: m => (
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
          {jobCounts[m.id] ?? 0}
        </span>
      ),
    },
  ]

  const isActive = watch('isActive')

  return (
    <>
      <MasterCRUDPage
        title="Mekanik & Rate"
        description="Daftar mekanik aktif dan rate komisi per kategori jasa"
        addButtonLabel="+ Tambah Mekanik"
        data={displayMechanics}
        columns={columns}
        searchKeys={['name']}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={openDelete}
        emptyState={{ message: showInactive ? 'Tidak ada mekanik.' : 'Tidak ada mekanik aktif. Tambahkan mekanik atau tampilkan yang nonaktif.' }}
        enableFilters={
          <Button
            variant={showInactive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowInactive(s => !s)}
          >
            {showInactive ? 'Sembunyikan Nonaktif' : 'Tampilkan Nonaktif'}
          </Button>
        }
      >
        {/* Rate matrix section below the list */}
        <div style={{ marginTop: 32 }}>
          <Section
            title="Rate Komisi Matrix"
            subtitle={`${displayMechanics.length} mekanik · ${jasaCategories.length} kategori jasa · klik sel untuk edit`}
          >
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
            }}>
              <RateMatrixTable
                mechanics={displayMechanics}
                jasaCategories={jasaCategories}
                rates={rates}
                onRateChange={handleRateChange}
              />
            </div>
          </Section>
        </div>
      </MasterCRUDPage>

      {/* Add / Edit dialog */}
      <AddEditDialog
        open={dialogOpen}
        mode={dialogMode}
        title={dialogMode === 'add' ? 'Tambah Mekanik' : `Edit: ${editing?.name ?? ''}`}
        description={dialogMode === 'add' ? 'Mekanik baru akan mendapat default rates. Edit di rate matrix.' : undefined}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        submitLabel={dialogMode === 'add' ? 'Tambah' : 'Simpan'}
      >
        <FormField label="Nama" htmlFor="m-name" required error={errors.name?.message}>
          <Input id="m-name" placeholder="Contoh: Budi Santoso" {...register('name')} />
        </FormField>

        <FormField label="Status">
          <button
            type="button"
            onClick={() => setValue('isActive', !isActive)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{
              width: 36, height: 20, borderRadius: 10,
              background: isActive ? 'var(--accent)' : 'var(--border)',
              position: 'relative', transition: 'background 0.15s', flexShrink: 0,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: isActive ? 18 : 2, transition: 'left 0.15s',
              }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </button>
        </FormField>

        <FormField label="Catatan" htmlFor="m-notes">
          <textarea
            id="m-notes"
            {...register('notes')}
            placeholder="Catatan tambahan (opsional)"
            rows={2}
            style={{
              width: '100%', padding: '8px 12px', resize: 'vertical',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
              background: 'var(--surface)', color: 'var(--text)',
              fontFamily: 'var(--body)', fontSize: 14, outline: 'none',
              transition: 'border-color 0.15s',
            }}
          />
        </FormField>
      </AddEditDialog>

      {/* Soft delete confirm */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Nonaktifkan Mekanik?"
        message={`${pendingDelete?.name ?? 'Mekanik ini'} akan dinonaktifkan. Data historis tetap aman. Bisa diaktifkan kembali kapan saja.`}
        confirmLabel="Nonaktifkan"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  )
}
