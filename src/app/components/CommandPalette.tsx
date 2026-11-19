import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Search, FileText, User, Truck, Wrench, X } from 'lucide-react'
import { useUiStore } from '@/store/ui'
import { supabase } from '@/lib/supabase'

const _fmt = new Intl.NumberFormat('id-ID')

type ResultType = 'transaction' | 'customer' | 'supplier' | 'mekanik'

interface ResultItem {
  id: string
  type: ResultType
  primary: string
  secondary: string
  href: string
}

interface Group {
  label: string
  items: ResultItem[]
  overflow: number
}

const MAX_PER_GROUP = 6
const SEARCH_DEBOUNCE_MS = 250

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** Escape LIKE wildcards so the user's text is matched literally. */
function toIlikePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

interface TxSearchRow {
  id: string
  no_referensi: string
  tipe: 'income' | 'expense'
  total_nominal: number
  customer: { name: string } | null
  supplier: { name: string } | null
}

interface SearchPage<T> {
  rows: T[]
  count: number
}

function toGroup(label: string, items: ResultItem[], total: number): Group | null {
  if (items.length === 0) return null
  return { label, items, overflow: Math.max(0, total - items.length) }
}

async function searchAll(q: string): Promise<Group[]> {
  const pattern = toIlikePattern(q)
  const [txRes, custRes, suppRes, mechRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, no_referensi, tipe, total_nominal, customer:customers(name), supplier:suppliers(name)', { count: 'exact' })
      .ilike('no_referensi', pattern)
      .is('deleted_at', null)
      .order('tgl', { ascending: false })
      .limit(MAX_PER_GROUP),
    supabase
      .from('customers')
      .select('id, name, motor_type', { count: 'exact' })
      .ilike('name', pattern)
      .eq('is_active', true)
      .order('name')
      .limit(MAX_PER_GROUP),
    supabase
      .from('suppliers')
      .select('id, name, phone, is_vendor_bubut', { count: 'exact' })
      .ilike('name', pattern)
      .eq('is_active', true)
      .order('name')
      .limit(MAX_PER_GROUP),
    supabase
      .from('mechanics')
      .select('id, name', { count: 'exact' })
      .ilike('name', pattern)
      .eq('is_active', true)
      .order('name')
      .limit(MAX_PER_GROUP),
  ])
  for (const r of [txRes, custRes, suppRes, mechRes]) if (r.error) throw r.error

  const tx: SearchPage<TxSearchRow> = { rows: (txRes.data ?? []) as unknown as TxSearchRow[], count: txRes.count ?? 0 }
  const cust = { rows: (custRes.data ?? []) as Array<{ id: string; name: string; motor_type: string | null }>, count: custRes.count ?? 0 }
  const supp = { rows: (suppRes.data ?? []) as Array<{ id: string; name: string; phone: string | null; is_vendor_bubut: boolean }>, count: suppRes.count ?? 0 }
  const mech = { rows: (mechRes.data ?? []) as Array<{ id: string; name: string }>, count: mechRes.count ?? 0 }

  return [
    toGroup('TRANSAKSI', tx.rows.map((t) => ({
      id: t.id,
      type: 'transaction' as const,
      primary: t.no_referensi,
      secondary: `${t.customer?.name ?? t.supplier?.name ?? '—'} · ${t.tipe === 'income' ? '▲' : '▼'} Rp ${_fmt.format(t.total_nominal)}`,
      href: `/transaksi/${t.id}`,
    })), tx.count),
    toGroup('CUSTOMER', cust.rows.map((c) => ({
      id: c.id,
      type: 'customer' as const,
      primary: c.name,
      secondary: c.motor_type ?? '—',
      href: '/master/customer',
    })), cust.count),
    toGroup('SUPPLIER', supp.rows.map((sp) => ({
      id: sp.id,
      type: 'supplier' as const,
      primary: sp.name,
      secondary: `${sp.phone ?? '—'}${sp.is_vendor_bubut ? ' · Vendor Bubut' : ''}`,
      href: '/master/supplier',
    })), supp.count),
    toGroup('MEKANIK', mech.rows.map((m) => ({
      id: m.id,
      type: 'mekanik' as const,
      primary: m.name,
      secondary: 'Mekanik aktif',
      href: '/master/mekanik',
    })), mech.count),
  ].filter((g): g is Group => g !== null)
}

interface PaletteSearchState {
  groups: Group[]
  isSearching: boolean
  isError: boolean
}

function useCommandPaletteSearch(query: string): PaletteSearchState {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  const isPending = debounced !== query.trim()
  const result = useQuery({
    queryKey: ['command-palette-search', debounced],
    enabled: debounced.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: () => searchAll(debounced),
  })
  return {
    groups: debounced ? (result.data ?? []) : [],
    isSearching: isPending || result.isFetching,
    isError: result.isError,
  }
}

function ResultIcon({ type }: { type: ResultType }) {
  const style = { flexShrink: 0, color: 'var(--text-muted)' } as const
  if (type === 'transaction') return <FileText size={14} style={style} />
  if (type === 'customer') return <User size={14} style={style} />
  if (type === 'supplier') return <Truck size={14} style={style} />
  return <Wrench size={14} style={style} />
}

export function CommandPalette() {
  const { commandPaletteOpen: isOpen, closeCommandPalette: close } = useUiStore()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeIdxRef = useRef(-1)
  const flatRef = useRef<ResultItem[]>([])

  const { groups, isSearching, isError: searchError } = useCommandPaletteSearch(query)
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Sync refs
  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])
  useEffect(() => { flatRef.current = flat }, [flat])

  // Auto-focus + reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIdx(-1)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Reset active when query changes
  useEffect(() => { setActiveIdx(-1) }, [query])

  // Keyboard handler
  useEffect(() => {
    if (!isOpen) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, flatRef.current.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        const item = flatRef.current[activeIdxRef.current]
        if (item) {
          navigate(item.href)
          close()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, close, navigate])

  if (!isOpen) return null

  // Flat index offset per group for active highlighting
  let globalOffset = 0

  const isOS_Mac =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
  const kbdHint = isOS_Mac ? '⌘K' : 'Ctrl+K'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 50,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 680,
          maxWidth: '95vw',
          background: 'var(--surface)',
          borderRadius: 10,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          zIndex: 51,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
        }}
      >
        {/* Search input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari transaksi, customer, supplier, mekanik..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 16,
              color: 'var(--text)',
              fontFamily: 'var(--body)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'grid',
                placeItems: 'center',
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {query.trim() === '' ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Mulai ketik untuk mencari...
            </div>
          ) : searchError ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--accent)',
              }}
            >
              Gagal mencari. Periksa koneksi lalu coba lagi.
            </div>
          ) : groups.length === 0 && isSearching ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Mencari...
            </div>
          ) : groups.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Tidak ada hasil untuk &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map((group) => {
              const groupStart = globalOffset
              globalOffset += group.items.length
              return (
                <div key={group.label}>
                  {/* Group header */}
                  <div
                    style={{
                      padding: '8px 16px 4px',
                      fontSize: 10,
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {group.label}
                  </div>

                  {/* Items */}
                  {group.items.map((item, i) => {
                    const idx = groupStart + i
                    const isActive = idx === activeIdx
                    return (
                      <div
                        key={item.id}
                        onClick={() => { navigate(item.href); close() }}
                        onMouseEnter={() => setActiveIdx(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '9px 16px',
                          cursor: 'pointer',
                          background: isActive ? 'var(--surface-alt, var(--bg))' : 'transparent',
                          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                          transition: 'background 0.08s',
                        }}
                      >
                        <ResultIcon type={item.type} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.primary}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.secondary}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Overflow hint */}
                  {group.overflow > 0 && (
                    <div style={{ padding: '4px 16px 8px', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      +{group.overflow} lagi — perjelas pencarian untuk hasil lebih spesifik
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}
        >
          {[
            ['↑↓', 'navigasi'],
            ['↵', 'buka'],
            ['Esc', 'tutup'],
            [kbdHint, 'toggle'],
          ].map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
              <kbd
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  color: 'var(--text)',
                }}
              >
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
