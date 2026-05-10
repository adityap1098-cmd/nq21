import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Search } from 'lucide-react'
import { useCategoryStore } from '@/store/master/categories'
import { useTransactionStore } from '@/store/transactions'
import { useAuditStore } from '@/store/audit'
import { useAuthStore } from '@/store/auth'
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
import type { Category } from '@/store/types'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Maks 50 karakter'),
  type: z.enum(['income', 'expense']),
  isJasa: z.boolean(),
})
type FormData = z.infer<typeof schema>

// ── Section sub-component ────────────────────────────────────────────────────

interface SectionProps {
  type: 'income' | 'expense'
  categories: Category[]
  txnCountByCategory: Record<string, number>
  onAdd: () => void
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}

function CategorySection({ type, categories, txnCountByCategory, onAdd, onEdit, onDelete }: SectionProps) {
  const [search, setSearch] = useState('')
  const [jasaOnly, setJasaOnly] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const isIncome = type === 'income'
  const label = isIncome ? 'Pemasukan' : 'Pengeluaran'
  const accentColor = isIncome ? 'var(--success)' : 'var(--accent)'

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
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
        <Button variant="accent" size="sm" onClick={onAdd}>
          + Tambah {label}
        </Button>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <Input
            placeholder={`Cari kategori ${label.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
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
                    padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
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
                <TableHead>NAMA</TableHead>
                {isIncome && <TableHead style={{ width: 130 }}>TIPE</TableHead>}
                <TableHead style={{ textAlign: 'center', width: 100 }}>TRANSAKSI</TableHead>
                <TableHead style={{ width: 88 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map(cat => {
                const count = txnCountByCategory[cat.id] ?? 0
                const canDelete = count === 0
                return (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                        {!cat.isActive && (
                          <Badge variant="default">NONAKTIF</Badge>
                        )}
                      </div>
                    </TableCell>
                    {isIncome && (
                      <TableCell>
                        <Badge variant={cat.isJasa ? 'paid' : 'open'}>
                          {cat.isJasa ? 'JASA' : 'BARANG/LAIN'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell style={{ textAlign: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>
                        {count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(cat)} title="Edit">
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => canDelete && onDelete(cat)}
                          title={
                            canDelete
                              ? 'Nonaktifkan kategori'
                              : `Dipakai di ${count} transaksi — tidak bisa dihapus`
                          }
                          disabled={!canDelete}
                          style={!canDelete ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                          className={canDelete ? 'text-[var(--accent)] hover:text-[var(--accent-dark)] hover:bg-[var(--accent-tint)]' : ''}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
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
  const { categories, add, update, softDelete } = useCategoryStore()
  const { lines } = useTransactionStore()
  const { log: auditLog } = useAuditStore()
  const { user } = useAuthStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<Category | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories])
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories])

  const txnCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    lines.forEach(line => {
      counts[line.categoryId] = (counts[line.categoryId] ?? 0) + 1
    })
    return counts
  }, [lines])

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'income', isJasa: false },
  })
  const watchedType = watch('type')
  const watchedIsJasa = watch('isJasa')

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

  function onSubmit(data: FormData) {
    const isJasa = data.type === 'income' ? data.isJasa : false
    const payload = { name: data.name, type: data.type, isJasa, isActive: true }
    if (dialogMode === 'add') {
      add(payload)
      auditLog({ userId: user?.name ?? '', action: 'create', entityType: 'category', entityId: 'new', afterData: payload })
      toast('Kategori ditambahkan', { description: `"${data.name}" berhasil ditambahkan.`, variant: 'success' })
    } else if (editing) {
      update(editing.id, { name: data.name, type: data.type, isJasa })
      auditLog({ userId: user?.name ?? '', action: 'update', entityType: 'category', entityId: editing.id, afterData: { name: data.name } })
      toast('Kategori diperbarui', { description: `"${data.name}" berhasil disimpan.`, variant: 'success' })
    }
    setDialogOpen(false)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    softDelete(pendingDelete.id)
    auditLog({ userId: user?.name ?? '', action: 'delete', entityType: 'category', entityId: pendingDelete.id, afterData: { isActive: false } })
    toast('Kategori dinonaktifkan', { description: `"${pendingDelete.name}" tidak ditampilkan di list aktif.` })
    setPendingDelete(null)
  }

  function handleTypeChange(newType: 'income' | 'expense') {
    setValue('type', newType)
    if (newType === 'expense') setValue('isJasa', false)
  }

  return (
    <>
      <div style={{ marginBottom: 32 }}>
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
      />

      <CategorySection
        type="expense"
        categories={expenseCategories}
        txnCountByCategory={txnCountByCategory}
        onAdd={() => openAdd('expense')}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* Add / Edit dialog */}
      <AddEditDialog
        open={dialogOpen}
        mode={dialogMode}
        title={dialogMode === 'add' ? 'Tambah Kategori' : `Edit: ${editing?.name ?? ''}`}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        submitLabel={dialogMode === 'add' ? 'Tambah' : 'Simpan'}
      >
        <FormField label="Nama Kategori" htmlFor="k-name" required error={errors.name?.message}>
          <Input id="k-name" placeholder="Contoh: Servis Berat" {...register('name')} />
        </FormField>

        <FormField label="Tipe">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['income', 'expense'] as const).map(t => {
              const active = watchedType === t
              const color = t === 'income' ? 'var(--success)' : 'var(--accent)'
              const tint = t === 'income' ? 'var(--success-tint)' : 'var(--accent-tint)'
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  style={{
                    flex: 1, padding: '9px 16px', borderRadius: 8, border: '2px solid',
                    borderColor: active ? color : 'var(--border)',
                    background: active ? tint : 'transparent',
                    color: active ? color : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
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
