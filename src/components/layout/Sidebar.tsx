import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Plus, List, PieChart, BarChart2,
  Wrench, Zap, Calendar, Users, User, Truck, Tag,
  UserCog, Settings, LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  num?: string
  exact?: boolean
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'UTAMA',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={16} />, exact: true },
    ],
  },
  {
    title: 'TRANSAKSI',
    items: [
      { label: 'Input Transaksi', to: '/transaksi/baru',  icon: <Plus size={16} />, exact: true },
      { label: 'Daftar Transaksi', to: '/transaksi',      icon: <List size={16} />, exact: true },
    ],
  },
  {
    title: 'LAPORAN',
    items: [
      { label: 'Per Kategori',   to: '/laporan/kategori',  icon: <PieChart size={16} />,  num: '1' },
      { label: 'Cash Flow',      to: '/laporan/cash-flow', icon: <BarChart2 size={16} />, num: '2' },
      { label: 'Jasa & Mekanik', to: '/laporan/jasa',      icon: <Wrench size={16} />,   num: '3' },
      { label: 'Dyno',           to: '/laporan/dyno',      icon: <Zap size={16} />,      num: '4' },
    ],
  },
  {
    title: 'KOMISI',
    items: [
      { label: 'Periode Mingguan', to: '/komisi/periode', icon: <Calendar size={16} /> },
      { label: 'Mekanik & Komisi', to: '/komisi/mekanik', icon: <Users size={16} /> },
    ],
  },
  {
    title: 'MASTER',
    items: [
      { label: 'Customer',       to: '/master/customer', icon: <User size={16} /> },
      { label: 'Supplier',       to: '/master/supplier', icon: <Truck size={16} /> },
      { label: 'Kategori',       to: '/master/kategori', icon: <Tag size={16} /> },
      { label: 'Mekanik & Rate', to: '/master/mekanik',  icon: <UserCog size={16} /> },
      { label: 'User / Akun',    to: '/master/user',     icon: <Settings size={16} /> },
    ],
  },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const displayName = user?.name ?? '—'

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to)

  return (
    <aside
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        width: 240,
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: 'var(--text)',
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--display)',
              fontSize: 19,
              color: '#fff',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            N
          </span>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              bottom: -2,
              left: -2,
              width: 10,
              height: 4,
              background: 'var(--accent)',
            }}
          />
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--display)',
              fontSize: 17,
              letterSpacing: '0.06em',
              color: 'var(--text)',
              lineHeight: 1,
            }}
          >
            NQ21
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 8.5,
              letterSpacing: '0.32em',
              color: 'var(--text-muted)',
              marginTop: 3,
              textTransform: 'uppercase',
            }}
          >
            PERFORMANCE
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, paddingBottom: 8 }}>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div
              style={{
                padding: '18px 14px 8px',
                fontFamily: 'var(--mono)',
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              {section.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
              {section.items.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? '#fff' : 'var(--text-secondary)',
                      background: active ? 'var(--text)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-alt)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                      }
                    }}
                  >
                    {item.num ? (
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          background: active ? 'rgba(255,255,255,0.16)' : 'var(--surface-alt)',
                          border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                          borderRadius: 4,
                          fontFamily: 'var(--mono)',
                          fontSize: 10,
                          fontWeight: 600,
                          color: active ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {item.num}
                      </span>
                    ) : null}
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        color: active ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontFamily: 'var(--display)',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {displayName[0]?.toUpperCase() ?? 'U'}
        </div>
        <div style={{ lineHeight: 1.2, minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9.5,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            {user?.role?.toUpperCase() ?? ''}
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          title="Keluar"
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            width: 30,
            height: 30,
            borderRadius: 6,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-tint)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-tint)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
