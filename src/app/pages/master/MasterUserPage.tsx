import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUserStore } from '@/store/master/users'
import { useAuditStore } from '@/store/audit'
import { useAuthStore } from '@/store/auth'
import { MasterCRUDPage, type ColumnConfig } from '@/components/nq21/MasterCRUDPage'
import { AddEditDialog } from '@/components/nq21/AddEditDialog'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { FormField } from '@/components/nq21/FormField'
import { AccessDenied } from '@/components/nq21/AccessDenied'
import { DateDisplay } from '@/components/nq21/DateDisplay'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import type { AppUser, AuditLog } from '@/store/types'

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  username: z.string().regex(/^[a-z0-9_]{3,30}$/i, 'Username: 3-30 karakter, huruf/angka/underscore saja'),
  role: z.enum(['owner', 'kasir']),
  isActive: z.boolean(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Role filter pills ────────────────────────────────────────────────────────

type RoleFilter = 'all' | 'owner' | 'kasir'

function RoleFilterPills({ value, onChange }: { value: RoleFilter; onChange: (v: RoleFilter) => void }) {
  const options: { label: string; v: RoleFilter }[] = [
    { label: 'Semua', v: 'all' },
    { label: 'Owner', v: 'owner' },
    { label: 'Kasir', v: 'kasir' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 2, background: 'var(--surface-alt)',
      borderRadius: 8, padding: 3, border: '1px solid var(--border)',
    }}>
      {options.map(opt => (
        <button
          key={opt.v}
          onClick={() => onChange(opt.v)}
          style={{
            padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            background: value === opt.v ? 'var(--text)' : 'transparent',
            color: value === opt.v ? '#fff' : 'var(--text-secondary)',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Columns ──────────────────────────────────────────────────────────────────

function buildColumns(authUserName: string | undefined): ColumnConfig<AppUser>[] {
  return [
    {
      key: 'name',
      label: 'Nama',
      sortable: true,
      render: u => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: u.isActive ? 'var(--text)' : 'var(--text-muted)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--display)', fontSize: 13,
          }}>
            {u.name[0].toUpperCase()}
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>{u.name}</span>
            {u.name === authUserName && (
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                (kamu)
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      label: 'Username',
      render: u => (
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13 }}>
          {u.username}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: u => u.role === 'owner'
        ? <Badge variant="expense">OWNER</Badge>
        : <Badge variant="closed">KASIR</Badge>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: u => (
        <Badge variant={u.isActive ? 'paid' : 'default'}>
          {u.isActive ? 'AKTIF' : 'NONAKTIF'}
        </Badge>
      ),
    },
    {
      key: 'lastLoginAt',
      label: 'Login Terakhir',
      render: u => u.lastLoginAt
        ? <DateDisplay value={u.lastLoginAt} />
        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Belum pernah</span>,
    },
  ]
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MasterUserPage() {
  const { users, add, update, softDelete } = useUserStore()
  const { log: auditLog } = useAuditStore()
  const { user: authUser } = useAuthStore()

  // Access control — owner only
  if (authUser?.role !== 'owner') {
    return (
      <AccessDenied
        title="Akses Terbatas"
        message="Halaman ini hanya untuk Owner. Hubungi admin kalau butuh akses."
      />
    )
  }

  return <MasterUserContent users={users} add={add} update={update} softDelete={softDelete} auditLog={auditLog} authUser={authUser} />
}

// Split into inner component so hooks run unconditionally above the early return
interface ContentProps {
  users: AppUser[]
  add: (u: Omit<AppUser, 'id' | 'createdAt'>) => void
  update: (id: string, patch: Partial<AppUser>) => void
  softDelete: (id: string) => void
  auditLog: (entry: Omit<AuditLog, 'id' | 'createdAt'>) => void
  authUser: { name: string; role: 'owner' | 'kasir' }
}

function MasterUserContent({ users, add, update, softDelete, auditLog, authUser }: ContentProps) {
  const [showInactive, setShowInactive] = useState(false)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null)

  const displayUsers = useMemo(() => {
    let list = showInactive ? users : users.filter(u => u.isActive)
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter)
    return list
  }, [users, showInactive, roleFilter])

  const columns = useMemo(() => buildColumns(authUser.name), [authUser.name])

  const {
    register, handleSubmit, reset, watch, setValue, setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', username: '', role: 'kasir', isActive: true, password: '', confirmPassword: '' },
  })
  const watchedRole = watch('role')
  const watchedIsActive = watch('isActive')

  function openAdd() {
    reset({ name: '', username: '', role: 'kasir', isActive: true, password: '', confirmPassword: '' })
    setDialogMode('add')
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(u: AppUser) {
    reset({ name: u.name, username: u.username, role: u.role, isActive: u.isActive, password: '', confirmPassword: '' })
    setDialogMode('edit')
    setEditing(u)
    setDialogOpen(true)
  }

  function handleDelete(u: AppUser) {
    // Guard: can't delete yourself
    if (u.name === authUser.name) {
      toast('Tidak bisa', { description: 'Tidak bisa menghapus akun sendiri.', variant: 'destructive' })
      return
    }
    // Guard: last active owner
    if (u.role === 'owner') {
      const activeOwners = users.filter(x => x.role === 'owner' && x.isActive)
      if (activeOwners.length <= 1) {
        toast('Tidak bisa', { description: 'Minimal harus ada 1 Owner aktif.', variant: 'destructive' })
        return
      }
    }
    setPendingDelete(u)
    setConfirmOpen(true)
  }

  function onSubmit(data: FormData) {
    // Password validation
    if (dialogMode === 'add') {
      if (!data.password || data.password.length < 6) {
        setError('password', { message: 'Password minimal 6 karakter' })
        return
      }
    }
    if (data.password && data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Password tidak cocok' })
      return
    }
    // Username unique check
    const isDuplicate = users.some(u =>
      u.username.toLowerCase() === data.username.toLowerCase() && u.id !== editing?.id
    )
    if (isDuplicate) {
      setError('username', { message: 'Username sudah dipakai' })
      return
    }
    // Last active owner guard (edit mode — can't deactivate last owner)
    if (dialogMode === 'edit' && editing?.role === 'owner' && !data.isActive) {
      const activeOwners = users.filter(u => u.role === 'owner' && u.isActive && u.id !== editing.id)
      if (activeOwners.length === 0) {
        setError('isActive', { message: 'Minimal 1 Owner harus tetap aktif' })
        return
      }
    }

    const payload: Omit<AppUser, 'id' | 'createdAt'> = {
      name: data.name,
      username: data.username,
      role: data.role,
      isActive: data.isActive,
      ...(data.password ? { password: data.password } : {}),
    }

    if (dialogMode === 'add') {
      add(payload)
      auditLog({ userId: authUser.name, action: 'create', entityType: 'user', entityId: 'new', afterData: { name: data.name, username: data.username, role: data.role } })
      toast('User ditambahkan', { description: `${data.name} (${data.username}) berhasil ditambahkan.`, variant: 'success' })
    } else if (editing) {
      const patch: Partial<AppUser> = { name: data.name, username: data.username, role: data.role, isActive: data.isActive }
      if (data.password) patch.password = data.password
      update(editing.id, patch)
      auditLog({ userId: authUser.name, action: 'update', entityType: 'user', entityId: editing.id, afterData: { name: data.name } })
      toast('User diperbarui', { description: `${data.name} berhasil disimpan.`, variant: 'success' })
    }
    setDialogOpen(false)
  }

  function confirmDelete() {
    if (!pendingDelete) return
    softDelete(pendingDelete.id)
    auditLog({ userId: authUser.name, action: 'delete', entityType: 'user', entityId: pendingDelete.id, afterData: { isActive: false } })
    toast('User dinonaktifkan', { description: `${pendingDelete.name} tidak bisa login.` })
    setPendingDelete(null)
  }

  return (
    <>
      <MasterCRUDPage
        title="User / Akun"
        description="Kelola akun login dan hak akses pengguna NQ21"
        addButtonLabel="+ Tambah User"
        data={displayUsers}
        columns={columns}
        searchKeys={['name', 'username']}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyState={{
          message: 'Belum ada user terdaftar.',
          action: { label: '+ Tambah User Pertama', onClick: openAdd },
        }}
        enableFilters={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RoleFilterPills value={roleFilter} onChange={setRoleFilter} />
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
        title={dialogMode === 'add' ? 'Tambah User' : `Edit: ${editing?.name ?? ''}`}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        submitLabel={dialogMode === 'add' ? 'Tambah' : 'Simpan'}
      >
        {/* Nama */}
        <FormField label="Nama Lengkap" htmlFor="u-name" required error={errors.name?.message}>
          <Input id="u-name" placeholder="Contoh: Budi Santoso" {...register('name')} />
        </FormField>

        {/* Username + Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField label="Username" htmlFor="u-uname" required error={errors.username?.message}>
            <Input id="u-uname" placeholder="huruf/angka/underscore" {...register('username')} />
          </FormField>

          <FormField label="Role">
            <div style={{ display: 'flex', gap: 6 }}>
              {(['kasir', 'owner'] as const).map(r => {
                const active = watchedRole === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setValue('role', r)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, border: '2px solid',
                      borderColor: active ? (r === 'owner' ? 'var(--accent)' : 'var(--text)') : 'var(--border)',
                      background: active ? (r === 'owner' ? 'var(--accent-tint)' : 'var(--surface-alt)') : 'transparent',
                      color: active ? (r === 'owner' ? 'var(--accent)' : 'var(--text)') : 'var(--text-secondary)',
                      fontWeight: 800, fontSize: 11, letterSpacing: '0.06em',
                      textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {r === 'owner' ? 'OWNER' : 'KASIR'}
                  </button>
                )
              })}
            </div>
          </FormField>
        </div>

        {/* Password + Confirm */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormField
            label={dialogMode === 'add' ? 'Password' : 'Password Baru'}
            htmlFor="u-pwd"
            required={dialogMode === 'add'}
            error={errors.password?.message}
          >
            <Input
              id="u-pwd"
              type="password"
              placeholder={dialogMode === 'edit' ? 'Kosongin kalau tidak ganti' : 'Min 6 karakter'}
              {...register('password')}
            />
          </FormField>

          <FormField label="Konfirmasi Password" htmlFor="u-cpwd" error={errors.confirmPassword?.message}>
            <Input
              id="u-cpwd"
              type="password"
              placeholder="Ulangi password"
              {...register('confirmPassword')}
            />
          </FormField>
        </div>

        {/* isActive */}
        <FormField label="Status Akun" error={(errors.isActive as { message?: string } | undefined)?.message}>
          <button
            type="button"
            onClick={() => setValue('isActive', !watchedIsActive)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{
              width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 2,
              background: watchedIsActive ? 'var(--accent)' : 'var(--border)',
              position: 'relative', transition: 'background 0.15s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: watchedIsActive ? 18 : 2, transition: 'left 0.15s',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {watchedIsActive ? 'Akun Aktif' : 'Akun Nonaktif'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Akun nonaktif tidak bisa login ke sistem.
              </div>
            </div>
          </button>
        </FormField>
      </AddEditDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Nonaktifkan User?"
        message={`${pendingDelete?.name ?? 'User ini'} akan dinonaktifkan dan tidak bisa login. Data historis tetap aman.`}
        confirmLabel="Nonaktifkan"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </>
  )
}
