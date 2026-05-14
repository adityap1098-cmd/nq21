import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Calendar, Plus } from 'lucide-react'
import { useUiStore } from '@/store/ui'
import { useCommissionPeriods } from '@/features/komisi/hooks'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

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
  const openCommandPalette = useUiStore((s) => s.openCommandPalette)
  const crumb = resolveCrumb(pathname)

  const { data: periods = [] } = useCommissionPeriods()
  const activePeriod = periods.find(p => p.status === 'open')
  const periodLabel = activePeriod
    ? format(new Date(activePeriod.weekStart + 'T00:00:00'), 'd MMM yyyy', { locale: id })
    : format(new Date(), 'd MMM yyyy', { locale: id })
  const periodSub = activePeriod ? 'Periode Aktif' : 'Hari Ini'

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

      {/* Search — opens Command Palette */}
      <div
        role="button"
        tabIndex={0}
        onClick={openCommandPalette}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openCommandPalette() }}
        style={{
          flex: '1 1 200px',
          minWidth: 0,
          maxWidth: 380,
          marginLeft: 'auto',
          position: 'relative',
          cursor: 'pointer',
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
            pointerEvents: 'none',
          }}
        >
          <Search size={14} />
        </span>
        <div
          style={{
            width: '100%',
            background: 'var(--surface-alt)',
            border: '1px solid transparent',
            borderRadius: 6,
            padding: '9px 44px 9px 36px',
            fontSize: 13,
            color: 'var(--text-muted)',
            fontFamily: 'var(--body)',
            userSelect: 'none',
          }}
        >
          Cari no referensi, customer, mekanik...
        </div>
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
            pointerEvents: 'none',
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
        <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{periodLabel}</strong>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>{periodSub}</span>
      </div>

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
