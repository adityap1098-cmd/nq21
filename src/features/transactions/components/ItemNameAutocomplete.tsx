import { useEffect, useMemo, useRef, useState } from 'react'
import { useTransactionStore } from '@/store/transactions'
import { getUniqueItemNames } from '../utils'

const MAX_SUGGESTIONS = 8

export interface ItemNameAutocompleteProps {
  value: string
  categoryId: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ItemNameAutocomplete({
  value,
  categoryId,
  onChange,
  placeholder = 'Keterangan tambahan (opsional)',
  disabled = false,
}: ItemNameAutocompleteProps) {
  const { lines: txLines } = useTransactionStore()

  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const allHistory = useMemo(
    () => (categoryId ? getUniqueItemNames(txLines, categoryId) : []),
    [txLines, categoryId],
  )

  const trimmed = value.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!trimmed) return allHistory.slice(0, MAX_SUGGESTIONS)
    return allHistory.filter((n) => n.toLowerCase().includes(trimmed)).slice(0, MAX_SUGGESTIONS)
  }, [allHistory, trimmed])

  const showDropdown = isOpen && suggestions.length > 0 && !disabled

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

  function handleSelect(name: string) {
    onChange(name)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') setIsOpen(true)
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex])
        } else {
          setIsOpen(false)
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

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); setActiveIndex(-1) }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={100}
        autoComplete="off"
        style={{
          width: '100%', height: 36,
          padding: '0 12px',
          borderRadius: 8, border: '1px solid var(--border)',
          background: disabled ? 'var(--surface-alt)' : 'var(--surface)',
          color: disabled ? 'var(--text-muted)' : 'var(--text)',
          fontSize: 13, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 10px 30px rgba(10,9,8,0.08)', overflow: 'hidden',
        }}>
          {suggestions.map((name, idx) => (
            <button
              key={name}
              type="button"
              onMouseDown={() => handleSelect(name)}
              onMouseEnter={() => setActiveIndex(idx)}
              style={{
                width: '100%', display: 'block', textAlign: 'left',
                padding: '9px 12px', border: 'none',
                borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                background: activeIndex === idx ? 'var(--surface-deep)' : 'transparent',
                fontSize: 13, color: 'var(--text)', cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
