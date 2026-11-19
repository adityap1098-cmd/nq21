import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Search } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import {
  useCategories, useCategoryLineCounts, useCreateCategory, useUpdateCategory, SYSTEM_CATEGORY_NAMES,
} from '@/features/categories/hooks'
import { PageHeader } from '@/components/nq21/PageHeader'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { FormField } from '@/components/nq21/FormField'
import { EmptyState } from '@/components/nq21/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import type { Category } from '@/store/types'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Maks 50 karakter'),
  type: z.enum(['income', 'expense']),
  isJasa: z.boolean(),
})
type FormData = z.infer<typeof schema>

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Terjadi kesalahan'
}

// ── Section sub-component ────────────────────────────────────────────────────

interface SectionProps {
  type: 'income' | 'expense'
  categories: Category[]
  txnCountByCategory: Record<string, number>
  onAdd: () => void
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
  canEdit: boolean
}

function CategorySection({ type, categories, txnCountByCategory, onAdd, onEdit, onDelete, canEdit }: SectionProps) {
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')
  const [jasaOnly, setJasaOnly] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const isIncome = type === 'income'
  const label = isIncome ? 'Pemasukan' : 'Pengeluaran'
  const accentColor = isIncome ? 'var(--success)' : 'var(--accent)'
  // Phone: the TIPE badge moves under the name so the row fits without sideways scroll
  const showTypeColumn = isIncome && !isMobile
  const actionBtnClass = isMobile ? 'h-10 w-10 px-0' : undefined

  const displayed = useMemo(() => {
    let list = showInactive ? categories : categories.filter(c => c.isActive)
    if (isIncome && jasaOnly) list = list.filter(c => c.isJasa)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'id'))
  }, [categories, showInactive, jasaOnly, search, isIncome])

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
        flexWrap: isMobile ? 'wrap' : undefined, gap: isMobile ? 10 : undefined,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 3, height: 22, borderRadius: 2,
            background: accentColor, flexShrink: 0,
          }} />
          <div>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: accentColor,
            }}>
              {isIncome ? '↑' : '↓'} {label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {displayed.length} kategori{!showInactive ? ' aktif' : ''}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button variant="accent" size="sm" onClick={onAdd} className={isMobile ? 'h-10' : undefined}>
            + Tambah {label}
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        flexWrap: isMobile ? 'wrap' : undefined,
      }}>
        <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : 1, maxWidth: isMobile ? undefined : 280 }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <Input
            placeholder={`Cari kategori ${label.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={isMobile ? { paddingLeft: 30, fontSize: 16, height: 40 } : { paddingLeft: 30 }}
          />
        </div>
        <div style={{
          marginLeft: isMobile ? undefined : 'auto', display: 'flex', alignItems: 'center', gap: 8,
          flexWrap: isMobile ? 'wrap' : undefined,
        }}>
          {isIncome && (
            <div style={{
              display: 'flex', gap: 2, background: 'var(--surface-alt)',
              borderRadius: 8, padding: 3, border: '1px solid var(--border)',
            }}>
              {[{ label: 'Semua', v: false }, { label: 'Hanya Jasa', v: true }].map(({ label: pl, v }) => (
                <button
                  key={String(v)}
                  onClick={() => setJasaOnly(v)}
                  style={{
                    padding: isMobile ? '8px 12px' : '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                    background: jasaOnly === v ? 'var(--text)' : 'transparent',
                    color: jasaOnly === v ? '#fff' : 'var(--text-secondary)',
                    transition: 'background 0.12s, color 0.12s',
                  }}
                >
                  {pl}
                </button>
              ))}
            </div>
          )}
          <Button
            variant={showInactive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowInactive(s => !s)}
            className={isMobile ? 'h-10' : undefined}
          >
            {showInactive ? 'Sembunyikan Nonaktif' : 'Tampilkan Nonaktif'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)', overflow: 'hidden',
      }}>
        {displayed.length === 0 ? (
          <EmptyState
            message={
              jasaOnly
                ? 'Tidak ada kategori jasa aktif.'
                : `Belum ada kategori ${label.toLowerCase()}. Tambah kategori pertama untuk mulai input transaksi.`
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isMobile ? 'px-3' : undefined}>NAMA</TableHead>
                {showTypeColumn && <TableHead style={{ width: 130 }}>TIPE</TableHead>}
                {isMobile
                  ? <TableHead className="px-2" style={{ textAlign: 'center', width: 56 }}>TRX</TableHead>
                  : <TableHead style={{ textAlign: 'center', width: 100 }}>TRANSAKSI</TableHead>}
                {canEdit && <TableHead className={isMobile ? 'px-1' : undefined} style={{ width: 88 }} />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map(cat => {
                const count = txnCountByCategory[cat.id] ?? 0
                const isSystem = SYSTEM_CATEGORY_NAMES.has(cat.name)
                const canDelete = count === 0 && !isSystem && cat.isActive
                return (
                  <TableRow key={cat.id}>
                    <TableCell className={isMobile ? 'px-3' : undefined}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: isMobile ? 'wrap' : undefined }}>
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                        {isSystem && (
                          <span
                            title="Dipakai sistem (Bubut Luar, laporan Dyno, aturan supplier). Nama tidak bisa diubah."
                            style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.04em' }}
                          >
                            SISTEM
                          </span>
                        )}
                        {!cat.isActive && (
                          <Badge variant="default">NONAKTIF</Badge>
                        )}
                      </div>
                      {isIncome && isMobile && (
                        <div style={{ marginTop: 4 }}>
                          <Badge variant={cat.isJasa ? 'paid' : 'open'}>
                            {cat.isJasa ? 'JASA' : 'BARANG/LAIN'}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    {showTypeColumn && (
                      <TableCell>
                        <Badge variant={cat.isJasa ? 'paid' : 'open'}>
                          {cat.isJasa ? 'JASA' : 'BARANG/LAIN'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className={isMobile ? 'px-2' : undefined} style={{ textAlign: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>
                        {count}
                      </span>
                    </TableCell>
                    {canEdit && (
                    <TableCell className={isMobile ? 'px-1' : undefined}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button variant="ghost" size="sm" className={actionBtnClass} onClick={() => onEdit(cat)} title="Edit" aria-label="Edit">
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => canDelete && onDelete(cat)}
                          title={
                            isSystem
                              ? 'Kategori sistem — tidak bisa dinonaktifkan'
                              : !cat.isActive
                                ? 'Sudah nonaktif'
                                : canDelete
                                  ? 'Nonaktifkan kategori'
                                  : `Dipakai di ${count} transaksi — tidak bisa dihapus`
                          }
                          disabled={!canDelete}
                          style={!canDelete ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                          aria-label="Nonaktifkan"
                          className={cn(canDelete && 'text-[var(--accent)] hover:text-[var(--accent-dark)] hover:bg-[var(--accent-tint)]', actionBtnClass)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterKategoriPage() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'
  const isMobile = useIsMobile()

  const { data: categoryRows = [], error: loadError } = useCategories(true)
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()

  const categories = useMemo<Category[]>(
    () => categoryRows.map(c => ({
      id: c.id, name: c.name, type: c.type, isJasa: c.is_jasa, isActive: c.is_active, createdAt: c.created_at,
    })),
    [categoryRows]
  )
  const categoryIds = useMemo(() => categoryRows.map(c => c.id), [categoryRows])
  const { data: txnCountByCategory = {} } = useCategoryLineCounts(categoryIds)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<Category | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories])
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories])

  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'income', isJasa: false },
  })
  const watchedType = watch('type')
  const watchedIsJasa = watch('isJasa')

  if (loadError) {
    return <EmptyState message={`Gagal memuat data: ${errorMessage(loadError)}`} />
  }

  const editingIsSystem = dialogMode === 'edit' && !!editing && SYSTEM_CATEGORY_NAMES.has(editing.name)

  function openAdd(type: 'income' | 'expense') {
    reset({ name: '', type, isJasa: false })
    setDialogMode('add')
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    reset({ name: cat.name, type: cat.type, isJasa: cat.isJasa })
    setDialogMode('edit')
    setEditing(cat)
    setDialogOpen(true)
  }

  function openDelete(cat: Category) {
    setPendingDelete(cat)
    setConfirmOpen(true)
  }

  async function onSubmit(data: FormData) {
    // Type is fixed after creation: switching income/expense would re-classify historical lines
    const type = dialogMode === 'edit' && editing ? editing.type : data.type
    const name = editingIsSystem && editing ? editing.name : data.name.trim()
    const isJasa = type === 'income' ? data.isJasa : false

    const duplicate = categories.some(c =>
      c.type === type && c.name.toLowerCase() === name.toLowerCase() && c.id !== editing?.id
    )
    if (duplicate) {
      setError('name', { message: 'Nama kategori sudah dipakai' })
      return
    }

    try {
      if (dialogMode === 'add') {
        await createMutation.mutateAsync({ name, type, is_jasa: isJasa, is_active: true })
        toast('Kategori ditambahkan', { description: `"${name}" berhasil ditambahkan.`, variant: 'success' })
      } else if (editing) {
        const reactivate = !editing.isActive
        await updateMutation.mutateAsync({
          id: editing.id,
          input: { name, is_jasa: isJasa, ...(reactivate ? { is_active: true } : {}) },
        })
        toast(reactivate ? 'Kategori diaktifkan kembali' : 'Kategori diperbarui', {
          description: `"${name}" berhasil disimpan.`, variant: 'success',
        })
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
      toast('Kategori dinonaktifkan', { description: `"${pendingDelete.name}" tidak ditampilkan di list aktif.` })
    } catch (err) {
      toast('Gagal menonaktifkan', { description: errorMessage(err), variant: 'destructive' })
    } finally {
      setPendingDelete(null)
    }
  }

  function handleTypeChange(newType: 'income' | 'expense') {
    setValue('type', newType)
    if (newType === 'expense') setValue('isJasa', false)
  }

  return (
    <>
      <div style={{ marginBottom: isMobile ? 16 : 32 }}>
        <PageHeader
          title="KATEGORI"
          subtitle="Kelola kategori pemasukan dan pengeluaran transaksi"
        />
      </div>

      <CategorySection
        type="income"
        categories={incomeCategories}
        txnCountByCategory={txnCountByCategory}
        onAdd={() => openAdd('income')}
        onEdit={openEdit}
        onDelete={openDelete}
        canEdit={isOwner}
      />

      <CategorySection
        type="expense"
        categories={expenseCategories}
        txnCountByCategory={txnCountByCategory}
        onAdd={() => openAdd('expense')}
        onEdit={openEdit}
        onDelete={openDelete}
        canEdit={isOwner}
      />

      {/* Add / Edit dialog */}
      <AddEditDialog
        open={dialogOpen}
        mode={dialogMode}
        title={dialogMode === 'add' ? 'Tambah Kategori' : `Edit: ${editing?.name ?? ''}`}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        submitLabel={dialogMode === 'add' ? 'Tambah' : editing && !editing.isActive ? 'Simpan & Aktifkan' : 'Simpan'}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <FormField
          label="Nama Kategori"
          htmlFor="k-name"
          required
          error={errors.name?.message ?? (editingIsSystem ? 'Kategori sistem — nama tidak bisa diubah.' : undefined)}
        >
          <Input id="k-name" placeholder="Contoh: Servis Berat" readOnly={editingIsSystem} {...register('name')} />
        </FormField>

        <FormField label="Tipe">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['income', 'expense'] as const).map(t => {
              const active = watchedType === t
              const color = t === 'income' ? 'var(--success)' : 'var(--accent)'
              const tint = t === 'income' ? 'var(--success-tint)' : 'var(--accent-tint)'
              const locked = dialogMode === 'edit'
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => !locked && handleTypeChange(t)}
                  disabled={locked}
                  title={locked ? 'Tipe tidak bisa diubah setelah kategori dibuat' : undefined}
                  style={{
                    opacity: locked && !active ? 0.4 : 1,
                    flex: 1, padding: isMobile ? '10px 8px' : '9px 16px', borderRadius: 8, border: '2px solid',
                    borderColor: active ? color : 'var(--border)',
                    background: active ? tint : 'transparent',
                    color: active ? color : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: 13, cursor: locked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'income' ? '↑ PEMASUKAN' : '↓ PENGELUARAN'}
                </button>
              )
            })}
          </div>
        </FormField>

        {watchedType === 'income' && (
          <FormField label="Jasa Mekanik">
            <button
              type="button"
              onClick={() => setValue('isJasa', !watchedIsJasa)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            >
              <div style={{
                width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 2,
                background: watchedIsJasa ? 'var(--success)' : 'var(--border)',
                position: 'relative', transition: 'background 0.15s',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 2, left: watchedIsJasa ? 18 : 2, transition: 'left 0.15s',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {watchedIsJasa ? 'Ya, Kategori Jasa' : 'Bukan Kategori Jasa'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                  Aktifkan kalau kategori ini melibatkan jasa mekanik dan butuh perhitungan komisi (Jasa, Dyno, Bubut Dalam, Bubut Luar).
                </div>
              </div>
            </button>
          </FormField>
        )}
      </AddEditDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Nonaktifkan Kategori?"
        message={`"${pendingDelete?.name ?? 'Kategori ini'}" akan dinonaktifkan. Data historis tetap aman. Bisa diaktifkan kembali kapan saja.`}
        confirmLabel="Nonaktifkan"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  )
}
