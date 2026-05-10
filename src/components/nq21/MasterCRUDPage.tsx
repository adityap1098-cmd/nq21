import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  onEdit: (item: T) => void
  onDelete: (item: T) => void
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

  return (
    <div>
      <PageHeader
        title={title.toUpperCase()}
        subtitle={description}
        action={
          <Button variant="accent" onClick={onAdd}>
            {addButtonLabel ?? `+ Tambah ${title}`}
          </Button>
        }
      />

      {showFilterRow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {showSearch && (
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
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
                style={{ paddingLeft: 32 }}
              />
            </div>
          )}
          {enableFilters && <div style={{ marginLeft: showSearch ? 'auto' : undefined }}>{enableFilters}</div>}
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
                <TableHead style={{ width: 88 }} />
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
                  <TableCell>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item)}
                        title="Hapus"
                        className="text-[var(--accent)] hover:text-[var(--accent-dark)] hover:bg-[var(--accent-tint)]"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
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
