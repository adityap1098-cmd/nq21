import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, User, Truck, Wrench, X } from 'lucide-react'
import { useUiStore } from '@/store/ui'
import { useTransactionStore } from '@/store/transactions'
import { useCustomerStore } from '@/store/master/customers'
import { useSupplierStore } from '@/store/master/suppliers'
import { useMechanicStore } from '@/store/master/mechanics'

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

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q)
}

function useCommandPaletteSearch(query: string): Group[] {
  const { transactions, lines } = useTransactionStore()
  const { customers } = useCustomerStore()
  const { suppliers } = useSupplierStore()
  const { mechanics } = useMechanicStore()

  return useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []

    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]))
    const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]))

    const linesByTx: Record<string, typeof lines> = {}
    for (const l of lines) {
      if (!linesByTx[l.transactionId]) linesByTx[l.transactionId] = []
      linesByTx[l.transactionId].push(l)
    }

    const txCountByCustomer: Record<string, number> = {}
    const txCountBySupplier: Record<string, number> = {}
    for (const tx of transactions.filter((t) => !t.deletedAt)) {
      if (tx.customerId) txCountByCustomer[tx.customerId] = (txCountByCustomer[tx.customerId] ?? 0) + 1
      if (tx.supplierId) txCountBySupplier[tx.supplierId] = (txCountBySupplier[tx.supplierId] ?? 0) + 1
    }

    // Transactions
    const txMatches: ResultItem[] = []
    for (const tx of transactions.filter((t) => !t.deletedAt)) {
      const party = tx.customerId
        ? (customerMap[tx.customerId]?.name ?? '')
        : tx.supplierId
        ? (supplierMap[tx.supplierId]?.name ?? '')
        : ''
      const txLines = linesByTx[tx.id] ?? []
      const lineText = txLines
        .map((l) => [l.itemName, l.notes].filter(Boolean).join(' '))
        .join(' ')
      const searchable = [tx.noReferensi, party, lineText].join(' ')
      if (!matchesQuery(searchable, q)) continue
      txMatches.push({
        id: tx.id,
        type: 'transaction',
        primary: tx.noReferensi,
        secondary: `${party || '—'} · ${tx.tipe === 'income' ? '▲' : '▼'} Rp ${_fmt.format(tx.totalNominal)}`,
        href: `/transaksi/${tx.id}`,
      })
    }

    // Customers
    const custMatches: ResultItem[] = []
    for (const c of customers.filter((c) => c.isActive)) {
      const searchable = [c.name, c.motorType ?? '', c.phone ?? ''].join(' ')
      if (!matchesQuery(searchable, q)) continue
      const count = txCountByCustomer[c.id] ?? 0
      custMatches.push({
        id: c.id,
        type: 'customer',
        primary: c.name,
        secondary: `${c.motorType ?? '—'} · ${count} transaksi`,
        href: `/master/customer`,
      })
    }

    // Suppliers
    const suppMatches: ResultItem[] = []
    for (const s of suppliers.filter((s) => s.isActive)) {
      const searchable = [s.name, s.phone ?? ''].join(' ')
      if (!matchesQuery(searchable, q)) continue
      const count = txCountBySupplier[s.id] ?? 0
      suppMatches.push({
        id: s.id,
        type: 'supplier',
        primary: s.name,
        secondary: `${s.phone ?? '—'} · ${count} transaksi${s.isVendorBubut ? ' · Vendor Bubut' : ''}`,
        href: `/master/supplier`,
      })
    }

    // Mekanik
    const mechMatches: ResultItem[] = []
    for (const m of mechanics.filter((m) => m.isActive)) {
      if (!matchesQuery(m.name, q)) continue
      mechMatches.push({
        id: m.id,
        type: 'mekanik',
        primary: m.name,
        secondary: 'Mekanik aktif',
        href: `/master/mekanik`,
      })
    }

    const makeGroup = (label: string, matches: ResultItem[]): Group | null => {
      if (matches.length === 0) return null
      return {
        label,
        items: matches.slice(0, MAX_PER_GROUP),
        overflow: Math.max(0, matches.length - MAX_PER_GROUP),
      }
    }

    return [
      makeGroup('TRANSAKSI', txMatches),
      makeGroup('CUSTOMER', custMatches),
      makeGroup('SUPPLIER', suppMatches),
      makeGroup('MEKANIK', mechMatches),
    ].filter(Boolean) as Group[]
  }, [query, transactions, lines, customers, suppliers, mechanics])
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

  const groups = useCommandPaletteSearch(query)
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
