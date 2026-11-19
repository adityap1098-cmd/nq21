import { Fragment, useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'

export interface ColumnConfig<T> {
  key: keyof T | string
  label: string
  render?: (item: T) => React.ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
}

interface EmptyStateConfig {
  icon?: React.ReactNode
  message: string
  action?: { label: string; onClick: () => void }
}

interface MasterCRUDPageProps<T extends { id: string }> {
  title: string
  description?: string
  addButtonLabel?: string
  data: T[]
  columns: ColumnConfig<T>[]
  searchKeys?: (keyof T)[]
  onAdd: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  emptyState?: EmptyStateConfig
  children?: React.ReactNode
  enableSearch?: boolean
  enableFilters?: React.ReactNode
}

export function MasterCRUDPage<T extends { id: string }>({
  title,
  description,
  addButtonLabel,
  data,
  columns,
  searchKeys,
  onAdd,
  onEdit,
  onDelete,
  emptyState,
  children,
  enableSearch = true,
  enableFilters,
}: MasterCRUDPageProps<T>) {
  const isMobile = useIsMobile()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    if (!searchTerm || !searchKeys?.length) return data
    const q = searchTerm.toLowerCase()
    return data.filter(item =>
      searchKeys.some(k => {
        const val = item[k]
        return String(val ?? '').toLowerCase().includes(q)
      })
    )
  }, [data, searchTerm, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? '')
      const bv = String((b as Record<string, unknown>)[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv, 'id') : bv.localeCompare(av, 'id')
    })
  }, [filtered, sortKey, sortDir])

  function handleSort(col: ColumnConfig<T>) {
    if (!col.sortable) return
    const k = String(col.key)
    if (sortKey === k) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir('asc')
    }
  }

  function getCellValue(item: T, key: keyof T | string): string {
    return String((item as Record<string, unknown>)[key as string] ?? '')
  }

  const showSearch = enableSearch && !!searchKeys?.length
  const showFilterRow = showSearch || !!enableFilters
  const hasActions = !!onEdit || !!onDelete
  const sortableColumns = columns.filter(c => c.sortable)

  function renderActions(item: T) {
    const btnClass = isMobile ? 'h-10 w-10 px-0' : undefined
    return (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexShrink: 0 }}>
        {onEdit && (
          <Button variant="ghost" size="sm" className={btnClass} onClick={() => onEdit(item)} title="Edit" aria-label="Edit">
            <Pencil size={13} />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            title="Hapus"
            aria-label="Nonaktifkan"
            className={cn('text-[var(--accent)] hover:text-[var(--accent-dark)] hover:bg-[var(--accent-tint)]', btnClass)}
          >
            <Trash2 size={13} />
          </Button>
        )}
      </div>
    )
  }

  function renderMobileList() {
    const [primary, ...rest] = columns
    return (
      <div>
        {sortableColumns.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
            padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>URUTKAN</span>
            {sortableColumns.map(col => {
              const active = sortKey === String(col.key)
              return (
                <button
                  key={String(col.key)}
                  type="button"
                  onClick={() => handleSort(col)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    minHeight: 32, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
                    background: active ? 'var(--text)' : 'var(--surface)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {col.label}
                  {active && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                </button>
              )
            })}
          </div>
        )}
        {sorted.map((item, idx) => (
          <div
            key={item.id}
            style={{
              padding: '12px 14px',
              borderBottom: idx === sorted.length - 1 ? 'none' : '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                {primary && (primary.render ? primary.render(item) : getCellValue(item, primary.key))}
              </div>
              {hasActions && renderActions(item)}
            </div>
            {rest.length > 0 && (
              <dl style={{
                display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '6px 12px',
                alignItems: 'center', margin: '8px 0 0',
              }}>
                {rest.map(col => {
                  const value = col.render ? col.render(item) : getCellValue(item, col.key)
                  if (value === null || value === undefined || value === '') return null
                  return (
                    <Fragment key={String(col.key)}>
                      <dt style={{
                        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--text-muted)',
                      }}>
                        {col.label}
                      </dt>
                      <dd style={{ margin: 0, minWidth: 0, fontSize: 13, overflowWrap: 'anywhere' }}>{value}</dd>
                    </Fragment>
                  )
                })}
              </dl>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={title.toUpperCase()}
        subtitle={description}
        action={
          <Button variant="accent" onClick={onAdd} className={isMobile ? 'h-10 w-full' : undefined}>
            {addButtonLabel ?? `+ Tambah ${title}`}
          </Button>
        }
      />

      {showFilterRow && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, marginBottom: 16,
          flexWrap: isMobile ? 'wrap' : undefined,
        }}>
          {showSearch && (
            <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : 1, maxWidth: isMobile ? undefined : 320 }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <Input
                placeholder={`Cari ${title}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={isMobile ? { paddingLeft: 32, fontSize: 16, height: 40 } : { paddingLeft: 32 }}
              />
            </div>
          )}
          {enableFilters && (
            <div style={{ marginLeft: showSearch && !isMobile ? 'auto' : undefined, maxWidth: '100%' }}>
              {enableFilters}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
        }}
      >
        {sorted.length === 0 ? (
          <EmptyState
            icon={emptyState?.icon}
            message={emptyState?.message ?? `Belum ada ${title.toLowerCase()}.`}
            action={
              emptyState?.action ? (
                <Button variant="accent" size="sm" onClick={emptyState.action.onClick}>
                  {emptyState.action.label}
                </Button>
              ) : undefined
            }
          />
        ) : isMobile ? (
          renderMobileList()
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (
                  <TableHead
                    key={String(col.key)}
                    style={{
                      width: col.width,
                      textAlign: col.align ?? 'left',
                      cursor: col.sortable ? 'pointer' : undefined,
                      userSelect: col.sortable ? 'none' : undefined,
                    }}
                    onClick={() => handleSort(col)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.sortable && sortKey === String(col.key) && (
                        sortDir === 'asc'
                          ? <ChevronUp size={11} />
                          : <ChevronDown size={11} />
                      )}
                    </span>
                  </TableHead>
                ))}
                {hasActions && <TableHead style={{ width: 88 }} />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(item => (
                <TableRow key={item.id}>
                  {columns.map(col => (
                    <TableCell
                      key={String(col.key)}
                      style={{ textAlign: col.align ?? 'left' }}
                    >
                      {col.render ? col.render(item) : getCellValue(item, col.key)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell>
                      {renderActions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {children}
    </div>
  )
}
