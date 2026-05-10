import { useState } from 'react'
import type { Mechanic, Category, CommissionRate } from '@/store/types'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface RateMatrixTableProps {
  mechanics: Mechanic[]
  jasaCategories: Category[]
  rates: CommissionRate[]
  onRateChange: (mechanicId: string, categoryId: string, value: number) => void
}

interface EditingCell { mechanicId: string; categoryId: string }

function getRate(rates: CommissionRate[], mechanicId: string, categoryId: string): number {
  return rates.find(r => r.mechanicId === mechanicId && r.categoryId === categoryId)?.ratePercent ?? 0
}

export function RateMatrixTable({ mechanics, jasaCategories, rates, onRateChange }: RateMatrixTableProps) {
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [draft, setDraft] = useState('')

  function startEdit(mechanicId: string, categoryId: string) {
    setDraft(String(getRate(rates, mechanicId, categoryId)))
    setEditing({ mechanicId, categoryId })
  }

  function commitEdit() {
    if (!editing) return
    const parsed = parseFloat(draft)
    const value = isNaN(parsed) ? 0 : Math.round(Math.min(100, Math.max(0, parsed)) * 10) / 10
    onRateChange(editing.mechanicId, editing.categoryId, value)
    setEditing(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(null)
  }

  if (mechanics.length === 0) {
    return (
      <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        Belum ada mekanik aktif di rate matrix.
      </div>
    )
  }

  return (
    <div style={{ overflow: 'auto' }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ minWidth: 200 }}>MEKANIK</TableHead>
            {jasaCategories.map(cat => (
              <TableHead key={cat.id} style={{ textAlign: 'center', minWidth: 110 }}>
                <div>{cat.name.toUpperCase()}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'none', marginTop: 2 }}>
                  JASA · KOMISI
                </div>
              </TableHead>
            ))}
            <TableHead style={{ textAlign: 'center', width: 80 }}>AKTIF</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {mechanics.map(m => {
            const activeCount = jasaCategories.filter(c => getRate(rates, m.id, c.id) > 0).length

            return (
              <TableRow key={m.id}>
                {/* Mechanic avatar + name */}
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: m.isActive ? 'var(--text)' : 'var(--text-muted)',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--display)', fontSize: 14, flexShrink: 0,
                    }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                        {new Date(m.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Rate cells */}
                {jasaCategories.map(cat => {
                  const rate = getRate(rates, m.id, cat.id)
                  const isEditingThis = editing?.mechanicId === m.id && editing?.categoryId === cat.id

                  return (
                    <TableCell key={cat.id} style={{ textAlign: 'center', padding: '6px 8px' }}>
                      {isEditingThis ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={draft}
                          autoFocus
                          onChange={e => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleKeyDown}
                          style={{
                            width: 64, textAlign: 'center',
                            fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700,
                            border: '2px solid var(--accent)', borderRadius: 4,
                            padding: '2px 4px', outline: 'none',
                            background: 'var(--surface)', color: 'var(--text)',
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(m.id, cat.id)}
                          title={`Edit rate ${cat.name} untuk ${m.name}`}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '2px 6px', borderRadius: 4, width: '100%',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-alt)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700,
                              color: rate > 0 ? 'var(--text)' : 'var(--text-muted)',
                            }}>
                              {rate}
                            </span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>%</span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, marginTop: 3 }}>
                            <div style={{
                              height: '100%', width: `${rate}%`,
                              background: 'var(--accent)', borderRadius: 1, transition: 'width 0.2s',
                            }} />
                          </div>
                        </button>
                      )}
                    </TableCell>
                  )
                })}

                {/* Active category count */}
                <TableCell style={{ textAlign: 'center' }}>
                  <Badge variant="default">{activeCount}/{jasaCategories.length}</Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Footer hint */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid var(--border)',
        fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--mono)', letterSpacing: '0.04em',
      }}>
        Klik sel untuk edit inline · Enter atau blur untuk simpan · Esc untuk batal
      </div>
    </div>
  )
}
