import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Calendar, Bell, Plus } from 'lucide-react'

const PAGE_MAP: Record<string, { crumb: string }> = {
  '/dashboard':         { crumb: 'DASHBOARD' },
  '/transaksi/baru':    { crumb: 'TRANSAKSI / INPUT' },
  '/transaksi':         { crumb: 'TRANSAKSI / DAFTAR' },
  '/laporan/kategori':  { crumb: 'LAPORAN / KATEGORI' },
  '/laporan/cash-flow': { crumb: 'LAPORAN / CASH FLOW' },
  '/laporan/jasa':      { crumb: 'LAPORAN / JASA' },
  '/laporan/dyno':      { crumb: 'LAPORAN / DYNO' },
  '/komisi/periode':    { crumb: 'KOMISI / PERIODE' },
  '/komisi/mekanik':    { crumb: 'KOMISI / MEKANIK' },
  '/master/customer':   { crumb: 'MASTER / CUSTOMER' },
  '/master/supplier':   { crumb: 'MASTER / SUPPLIER' },
  '/master/kategori':   { crumb: 'MASTER / KATEGORI' },
  '/master/mekanik':    { crumb: 'MASTER / MEKANIK' },
  '/master/user':       { crumb: 'MASTER / USER' },
  '/test':              { crumb: 'TEST' },
}

function resolveCrumb(pathname: string): string {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname].crumb
  const match = Object.keys(PAGE_MAP).find((k) => pathname.startsWith(k + '/'))
  return match ? PAGE_MAP[match].crumb : ''
}

export default function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const crumb = resolveCrumb(pathname)

  return (
    <div
      style={{
        height: 64,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
        flexWrap: 'nowrap',
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        NQ21{' '}
        <span style={{ margin: '0 8px', color: 'var(--border-strong)' }}>/</span>
        <span style={{ color: 'var(--text)' }}>{crumb}</span>
      </div>

      {/* Search */}
      <div
        style={{
          flex: '1 1 200px',
          minWidth: 0,
          maxWidth: 380,
          marginLeft: 'auto',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Search size={14} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari no referensi, customer, mekanik..."
          style={{
            width: '100%',
            background: 'var(--surface-alt)',
            border: '1px solid transparent',
            borderRadius: 6,
            padding: '9px 44px 9px 36px',
            fontSize: 13,
            outline: 'none',
            color: 'var(--text)',
            fontFamily: 'var(--body)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = 'var(--surface)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = 'var(--surface-alt)'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '1px 5px',
            borderRadius: 3,
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Period pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          border: '1px solid var(--border)',
          borderRadius: 6,
          fontSize: 12,
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'var(--text-muted)', display: 'grid', placeItems: 'center' }}>
          <Calendar size={13} />
        </span>
        <strong style={{ color: 'var(--text)', fontWeight: 600 }}>10 Mei 2026</strong>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>Minggu ini</span>
      </div>

      {/* Bell */}
      <button
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-secondary)',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title="Notifikasi"
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-alt)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
        }}
      >
        <Bell size={16} />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 7,
            height: 7,
            background: 'var(--accent)',
            borderRadius: '50%',
            border: '2px solid var(--surface)',
            boxSizing: 'content-box',
          }}
        />
      </button>

      {/* CTA */}
      <button
        onClick={() => navigate('/transaksi/baru')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 16px',
          borderRadius: 6,
          border: 'none',
          background: 'var(--accent)',
          color: '#fff',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-dark)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.background = 'var(--accent)'
        }}
      >
        <Plus size={14} />
        TRANSAKSI BARU
      </button>
    </div>
  )
}
