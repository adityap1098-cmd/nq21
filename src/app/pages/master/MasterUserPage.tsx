import { useAuthStore } from '@/store/auth'
import { useProfiles } from '@/features/profiles/hooks'
import { PageHeader } from '@/components/nq21/PageHeader'
import { AccessDenied } from '@/components/nq21/AccessDenied'
import { EmptyState } from '@/components/nq21/EmptyState'
import { DateDisplay } from '@/components/nq21/DateDisplay'
import { Badge } from '@/components/ui/badge'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'

// Creating a login needs the Supabase admin (service role) key, which must never ship to the
// browser. Accounts are managed in the Supabase Dashboard; a DB trigger creates the profile row.
const DASHBOARD_USERS_URL = 'https://supabase.com/dashboard/project/nmbgprrueuxvrqrmmvmo/auth/users'
const DASHBOARD_PROFILES_URL = 'https://supabase.com/dashboard/project/nmbgprrueuxvrqrmmvmo/editor'

const STEPS = [
  'Buka Supabase Dashboard → Authentication → Users → Add user → Create new user.',
  'Isi email + password, centang "Auto Confirm User". Akun otomatis jadi KASIR aktif.',
  'Untuk ganti nama, jadikan owner, atau nonaktifkan: Table Editor → tabel profiles → ubah kolom name / role / is_active.',
  'Akun yang is_active = false langsung tidak bisa baca/tulis data, walau masih login.',
]

export default function MasterUserPage() {
  const { user } = useAuthStore()

  if (user?.role !== 'owner') {
    return (
      <AccessDenied
        title="Akses Terbatas"
        message="Halaman ini hanya untuk Owner. Hubungi admin kalau butuh akses."
      />
    )
  }

  return <UserList currentUserId={user.id} />
}

function UserList({ currentUserId }: { currentUserId: string }) {
  const { data: profiles = [], isLoading, error } = useProfiles()
  const isMobile = useIsMobile()

  if (error) {
    return <EmptyState message={`Gagal memuat akun: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`} />
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <PageHeader
          title="USER / AKUN"
          subtitle="Akun login NQ21. Tambah dan ubah akun dilakukan di Supabase Dashboard."
        />
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)', overflow: 'hidden', marginBottom: 24,
      }}>
        {isLoading ? (
          <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)' }}>Memuat akun...</div>
        ) : profiles.length === 0 ? (
          <EmptyState message="Belum ada akun." />
        ) : isMobile ? (
          <div>
            {profiles.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  padding: '12px 14px',
                  borderBottom: idx === profiles.length - 1 ? 'none' : '1px solid var(--border)',
                }}
              >
                <div style={{ overflowWrap: 'anywhere' }}>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  {p.id === currentUserId && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      (kamu)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12 }}>
                  {p.role === 'owner'
                    ? <Badge variant="expense">OWNER</Badge>
                    : <Badge variant="closed">KASIR</Badge>}
                  <Badge variant={p.is_active ? 'paid' : 'default'}>
                    {p.is_active ? 'AKTIF' : 'NONAKTIF'}
                  </Badge>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Dibuat <DateDisplay value={p.created_at} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAMA</TableHead>
                <TableHead style={{ width: 120 }}>ROLE</TableHead>
                <TableHead style={{ width: 120 }}>STATUS</TableHead>
                <TableHead style={{ width: 160 }}>DIBUAT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    {p.id === currentUserId && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                        (kamu)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.role === 'owner'
                      ? <Badge variant="expense">OWNER</Badge>
                      : <Badge variant="closed">KASIR</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? 'paid' : 'default'}>
                      {p.is_active ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </TableCell>
                  <TableCell><DateDisplay value={p.created_at} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div style={{
        background: 'var(--surface-alt)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)', padding: isMobile ? '14px 14px' : '16px 20px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
          Cara tambah / ubah akun
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          {STEPS.map(step => <li key={step}>{step}</li>)}
        </ol>
        <div style={{
          display: 'flex', gap: isMobile ? 4 : 16, marginTop: 12, fontSize: 13, fontWeight: 700,
          flexDirection: isMobile ? 'column' : undefined,
          lineHeight: isMobile ? 2.4 : undefined,
        }}>
          <a href={DASHBOARD_USERS_URL} target="_blank" rel="noopener noreferrer">Buka Authentication → Users ↗</a>
          <a href={DASHBOARD_PROFILES_URL} target="_blank" rel="noopener noreferrer">Buka Table Editor ↗</a>
        </div>
      </div>
    </>
  )
}
