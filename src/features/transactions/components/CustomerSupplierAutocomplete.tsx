import { useState, useRef, useEffect, useMemo } from 'react'
import { useCustomerStore } from '@/store/master/customers'
import { useSupplierStore } from '@/store/master/suppliers'
import { Badge } from '@/components/ui/badge'
import { InlineCreateDialog } from './InlineCreateDialog'
import type { Customer, Supplier } from '@/store/types'

interface Props {
  type: 'customer' | 'supplier'
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  disabled?: boolean
  filterSuppliers?: 'vendor-bubut' | 'all'
}

const MAX_RESULTS = 50

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

export function CustomerSupplierAutocomplete({
  type,
  value,
  onChange,
  placeholder,
  disabled = false,
  filterSuppliers = 'all',
}: Props) {
  const { customers } = useCustomerStore()
  const { suppliers } = useSupplierStore()

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createInitialName, setCreateInitialName] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset local state when type switches (tipe toggle in form)
  useEffect(() => {
    setQuery('')
    setIsOpen(false)
    setActiveIndex(-1)
  }, [type])

  // Click-outside close
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // All active items sorted A-Z
  const allItems = useMemo((): (Customer | Supplier)[] => {
    if (type === 'customer') {
      return customers.filter((c) => c.isActive).sort((a, b) => a.name.localeCompare(b.name))
    }
    return suppliers
      .filter((s) => s.isActive && (filterSuppliers === 'all' || s.isVendorBubut))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [type, customers, suppliers, filterSuppliers])

  const trimmedQuery = query.trim().toLowerCase()

  // Full filtered list (before cap)
  const fullResults = useMemo(() => {
    if (!trimmedQuery) return allItems
    return allItems.filter((item) => {
      const nm = item.name.toLowerCase().includes(trimmedQuery)
      if (type === 'customer') {
        return nm || ((item as Customer).motorType?.toLowerCase().includes(trimmedQuery) ?? false)
      }
      return nm
    })
  }, [allItems, trimmedQuery, type])

  const filteredItems = fullResults.slice(0, MAX_RESULTS)
  const hasMore = fullResults.length > MAX_RESULTS

  // Selected entity lookup
  const selectedEntity: Customer | Supplier | undefined =
    value
      ? (type === 'customer'
          ? customers.find((c) => c.id === value)
          : suppliers.find((s) => s.id === value))
      : undefined

  const isStale = value !== null && (!selectedEntity || !selectedEntity.isActive)

  // Input display: show entity name when selected; otherwise show query
  const inputDisplayValue = selectedEntity && !isStale ? selectedEntity.name : query

  const showBuatBaru = trimmedQuery.length > 0
  const totalItems = filteredItems.length + (showBuatBaru ? 1 : 0)
  const showDropdown = isOpen && !disabled && !isStale && totalItems > 0

  function handleSelect(id: string) {
    onChange(id)
    setQuery('')
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function handleBuatBaru() {
    setCreateInitialName(query.trim())
    setCreateDialogOpen(true)
    setIsOpen(false)
  }

  function handleCreateSuccess(id: string) {
    onChange(id)
    setQuery('')
    setCreateDialogOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    if (value !== null) onChange(null)
    setIsOpen(true)
    setActiveIndex(-1)
  }

  function handleFocus() {
    setIsOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true)
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filteredItems.length) {
          handleSelect(filteredItems[activeIndex].id)
        } else if (activeIndex === filteredItems.length && showBuatBaru) {
          handleBuatBaru()
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        inputRef.current?.blur()
        break
      case 'Tab':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  const defaultPlaceholder =
    type === 'customer' ? 'Cari atau ketik nama customer...' : 'Cari supplier...'

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputDisplayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: '100%', height: 36,
            padding: value && !isStale ? '0 32px 0 12px' : '0 12px',
            borderRadius: 8,
            border: `1px solid ${isStale ? 'var(--warning)' : isOpen ? 'var(--border-strong)' : 'var(--border)'}`,
            background: disabled ? 'var(--surface-alt)' : 'var(--surface)',
            color: disabled ? 'var(--text-muted)' : 'var(--text)',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
        {/* Clear button when selected */}
        {value && !isStale && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              onChange(null)
              setQuery('')
              inputRef.current?.focus()
            }}
            title="Hapus pilihan"
            style={{
              position: 'absolute', right: 8, top: '50%',
              transform: 'translateY(-50%)',
              width: 18, height: 18, borderRadius: '50%',
              border: 'none', background: 'var(--border)',
              color: 'var(--text-muted)', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0, lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Stale warning ──────────────────────────────────────────────────── */}
      {isStale && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 4, fontSize: 12, color: 'var(--warning)',
        }}>
          <span>Entity tidak aktif atau tidak ditemukan.</span>
          <button
            type="button"
            onClick={() => { onChange(null); setQuery('') }}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Hapus
          </button>
        </div>
      )}

      {/* ── Dropdown ───────────────────────────────────────────────────────── */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0, right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(10,9,8,0.08)',
          zIndex: 50,
          maxHeight: 280,
          overflowY: 'auto',
        }}>

          {/* Results */}
          {filteredItems.map((item, idx) => {
            const isCustomer = type === 'customer'
            const cust = isCustomer ? (item as Customer) : null
            const supp = !isCustomer ? (item as Supplier) : null
            const isActive = activeIndex === idx
            const metaLine = isCustomer
              ? [cust?.motorType, cust?.phone].filter(Boolean).join(' · ')
              : (supp?.phone ?? '')

            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => handleSelect(item.id)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: isActive ? 'var(--surface-deep)' : 'transparent',
                  border: 'none',
                  borderBottom: idx < filteredItems.length - 1 || showBuatBaru
                    ? '1px solid var(--border)' : 'none',
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--text)', color: '#fff',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'Anton, sans-serif', fontSize: 14,
                  flexShrink: 0,
                }}>
                  {getInitial(item.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                    {item.name}
                  </div>
                  {metaLine && (
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 11,
                      color: 'var(--text-muted)', marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {metaLine}
                    </div>
                  )}
                </div>
                {supp?.isVendorBubut && (
                  <Badge variant="vendor" style={{ flexShrink: 0 }}>VENDOR BUBUT</Badge>
                )}
              </button>
            )
          })}

          {/* "… dan N lainnya" */}
          {hasMore && (
            <div style={{
              padding: '8px 14px', fontSize: 12,
              color: 'var(--text-muted)', textAlign: 'center',
              borderTop: '1px solid var(--border)',
            }}>
              Persempit pencarian untuk melihat lebih banyak hasil.
            </div>
          )}

          {/* Empty state (query set but no results) */}
          {filteredItems.length === 0 && trimmedQuery && (
            <div style={{
              padding: '16px 14px', fontSize: 13,
              color: 'var(--text-muted)', textAlign: 'center',
            }}>
              Tidak ada {type === 'customer' ? 'customer' : 'supplier'} dengan nama "{query.trim()}"
            </div>
          )}

          {/* + Buat baru */}
          {showBuatBaru && (
            <button
              type="button"
              onMouseDown={handleBuatBaru}
              onMouseEnter={() => setActiveIndex(filteredItems.length)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: activeIndex === filteredItems.length
                  ? 'var(--surface-deep)' : 'var(--surface-alt)',
                border: 'none',
                borderTop: filteredItems.length > 0 ? '1px solid var(--border)' : 'none',
                textAlign: 'left', cursor: 'pointer',
                borderRadius: '0 0 8px 8px',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--accent-tint)', color: 'var(--accent)',
                display: 'grid', placeItems: 'center',
                fontSize: 18, fontWeight: 600, flexShrink: 0,
              }}>
                +
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                  Buat {type === 'customer' ? 'customer' : 'supplier'} baru:{' '}
                  <strong>"{query.trim()}"</strong>
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: 'var(--text-muted)', marginTop: 2,
                }}>
                  Tambah ke master
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ── Inline Create Dialog ────────────────────────────────────────────── */}
      <InlineCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        type={type}
        initialName={createInitialName}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
