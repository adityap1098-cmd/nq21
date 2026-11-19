import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth'
import {
  useMechanics, useCommissionRates, useMechanicJobCounts,
  useCreateMechanic, useUpdateMechanic, useUpsertCommissionRate,
} from '@/features/mechanics/hooks'
import { useCategories } from '@/features/categories/hooks'
import { MasterCRUDPage, type ColumnConfig } from '@/components/nq21/MasterCRUDPage'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { RateMatrixTable } from '@/components/nq21/RateMatrixTable'
import { Section } from '@/components/nq21/Section'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { FormField } from '@/components/nq21/FormField'
import { DateDisplay } from '@/components/nq21/DateDisplay'
import { EmptyState } from '@/components/nq21/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { Mechanic, Category, CommissionRate } from '@/store/types'

// Default rates for a new mechanic, keyed by category name (matches docs/M006-V2-seed.sql)
const DEFAULT_RATES_BY_CATEGORY: Record<string, number> = {
  'Jasa': 30,
  'Dyno': 25,
  'Bubut Luar': 20,
  'Bubut Dalam': 40,
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Terjadi kesalahan'
}

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  notes: z.string().optional(),
  isActive: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function MasterMekanikPage() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const isMobile = useIsMobile()

  const { data: mechanicRows = [], error: mechanicsError } = useMechanics(true)
  const { data: rateRows = [], error: ratesError } = useCommissionRates()
  const { data: categoryRows = [], error: categoriesError } = useCategories()
  const createMutation = useCreateMechanic()
  const updateMutation = useUpdateMechanic()
  const rateMutation = useUpsertCommissionRate()

  const mechanics = useMemo<Mechanic[]>(
    () => mechanicRows.map(m => ({
      id: m.id, name: m.name, isActive: m.is_active, notes: m.notes ?? undefined, createdAt: m.created_at,
    })),
    [mechanicRows]
  )
  const rates = useMemo<CommissionRate[]>(
    () => rateRows.map(r => ({
      id: r.id, mechanicId: r.mechanic_id, categoryId: r.category_id, ratePercent: r.rate_percent,
    })),
    [rateRows]
  )
  const jasaCategories = useMemo<Category[]>(
    () => categoryRows
      .filter(c => c.is_jasa && c.is_active)
      .map(c => ({ id: c.id, name: c.name, type: c.type, isJasa: c.is_jasa, isActive: c.is_active, createdAt: c.created_at })),
    [categoryRows]
  )

  const mechanicIds = useMemo(() => mechanicRows.map(m => m.id), [mechanicRows])
  const { data: jobCounts = {} } = useMechanicJobCounts(mechanicIds)

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

  const loadError = mechanicsError ?? ratesError ?? categoriesError
  if (loadError) {
    return <EmptyState message={`Gagal memuat data: ${errorMessage(loadError)}`} />
  }

  function openAdd() {
    if (!isOwner) {
      toast('Hanya owner', { description: 'Hanya owner yang bisa menambah mekanik.' })
      return
    }
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

  async function onSubmit(data: FormData) {
    const input = { name: data.name.trim(), notes: data.notes?.trim() || null, is_active: data.isActive }
    try {
      if (dialogMode === 'add') {
        const defaultRates = jasaCategories.map(cat => ({
          category_id: cat.id,
          rate_percent: DEFAULT_RATES_BY_CATEGORY[cat.name] ?? 0,
        }))
        await createMutation.mutateAsync({ input, defaultRates })
        toast('Mekanik ditambahkan', { description: `${input.name} berhasil ditambahkan dengan default rates.`, variant: 'success' })
      } else if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input })
        toast('Mekanik diperbarui', { description: `${input.name} berhasil disimpan.`, variant: 'success' })
      }
      setDialogOpen(false)
    } catch (err) {
      toast('Gagal menyimpan', { description: errorMessage(err), variant: 'destructive' })
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await updateMutation.mutateAsync({ id: pendingDelete.id, input: { is_active: false } })
      toast('Mekanik dinonaktifkan', { description: `${pendingDelete.name} tidak ditampilkan di list aktif.` })
    } catch (err) {
      toast('Gagal menonaktifkan', { description: errorMessage(err), variant: 'destructive' })
    } finally {
      setPendingDelete(null)
    }
  }

  async function handleRateChange(mechanicId: string, categoryId: string, value: number) {
    try {
      await rateMutation.mutateAsync({ mechanic_id: mechanicId, category_id: categoryId, rate_percent: value })
      toast('Rate disimpan', { description: `Rate komisi diubah ke ${value}%.`, variant: 'success' })
    } catch (err) {
      toast('Gagal menyimpan rate', { description: errorMessage(err), variant: 'destructive' })
    }
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
        onEdit={isOwner ? openEdit : undefined}
        onDelete={isOwner ? openDelete : undefined}
        emptyState={{ message: showInactive ? 'Tidak ada mekanik.' : 'Tidak ada mekanik aktif. Tambahkan mekanik atau tampilkan yang nonaktif.' }}
        enableFilters={
          <Button
            variant={showInactive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowInactive(s => !s)}
            className={isMobile ? 'h-10' : undefined}
          >
            {showInactive ? 'Sembunyikan Nonaktif' : 'Tampilkan Nonaktif'}
          </Button>
        }
      >
        {/* Rate matrix section below the list */}
        <div style={{ marginTop: isMobile ? 24 : 32 }}>
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
                readOnly={!isOwner || rateMutation.isPending}
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
        loading={createMutation.isPending || updateMutation.isPending}
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
