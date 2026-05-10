import { useState } from 'react'
import { MasterCRUDPage, type ColumnConfig } from '@/components/nq21/MasterCRUDPage'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { Badge } from '@/components/ui/badge'

interface DummyCustomer {
  id: string
  name: string
  motorType?: string
  notes?: string
}

const DUMMY: DummyCustomer[] = [
  { id: '1', name: 'Andi Wijaya', motorType: 'Vario 150', notes: 'Reguler' },
  { id: '2', name: 'Pak Hendro', motorType: 'CB150R', notes: 'VIP' },
  { id: '3', name: 'Rio Pratama', motorType: 'R15' },
  { id: '4', name: 'Ferdian Maulana', motorType: 'Nmax' },
  { id: '5', name: 'CV Maju Jaya' },
]

const columns: ColumnConfig<DummyCustomer>[] = [
  { key: 'name', label: 'Nama', sortable: true },
  {
    key: 'motorType',
    label: 'Motor',
    render: c =>
      c.motorType
        ? <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{c.motorType}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>,
  },
  {
    key: 'notes',
    label: 'Catatan',
    render: c =>
      c.notes ? <Badge variant="default">{c.notes}</Badge> : null,
  },
]

export default function TestMasterCRUDPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<DummyCustomer | null>(null)
  const [data, setData] = useState(DUMMY)

  function handleEdit(item: DummyCustomer) {
    setDialogMode('edit')
    setEditing(item)
    setDialogOpen(true)
  }

  function handleDelete(item: DummyCustomer) {
    if (confirm(`Hapus "${item.name}"?`)) {
      setData(d => d.filter(x => x.id !== item.id))
    }
  }

  function handleAdd() {
    setDialogMode('add')
    setEditing(null)
    setDialogOpen(true)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 24,
        }}
      >
        M002-T1 — MasterCRUDPage Test
      </div>

      <MasterCRUDPage
        title="Customer"
        description="Daftar pelanggan bengkel NQ21"
        data={data}
        columns={columns}
        searchKeys={['name', 'motorType']}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyState={{
          message: 'Belum ada customer. Tambahkan customer pertama.',
          action: { label: '+ Tambah Customer', onClick: handleAdd },
        }}
      />

      <AddEditDialog
        open={dialogOpen}
        mode={dialogMode}
        title={dialogMode === 'add' ? 'Tambah Customer' : `Edit: ${editing?.name ?? ''}`}
        description="Isi data customer — form fields di-render oleh parent via children slot."
        onClose={() => setDialogOpen(false)}
        onSubmit={() => { setDialogOpen(false) }}
      >
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--surface-alt)',
            border: '1px dashed var(--border)',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ marginBottom: 4, fontWeight: 600, color: 'var(--text-secondary)' }}>
            children slot — form fields via React Hook Form
          </div>
          {editing
            ? <div>Editing: <b style={{ color: 'var(--text)' }}>{editing.name}</b></div>
            : <div>Mode: tambah customer baru</div>
          }
        </div>
      </AddEditDialog>
    </div>
  )
}
