import { useState, useMemo } from 'react'
import { useCategoryStore } from '@/store/master/categories'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { MechanicChipRow } from './MechanicChipRow'
import { getBasisKomisi, formatRupiahInput, parseRupiahInput, hasLineData } from '../utils'
import type { Line } from '../types'
import type { TransactionType } from '@/store/types'

// ─── CurrencyInput ────────────────────────────────────────────────────────────

interface CurrencyInputProps {
  id?: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  placeholder?: string
}

function CurrencyInput({ id, value, onChange, disabled, placeholder = '0' }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)
  const displayValue = focused
    ? (value === 0 ? '' : String(value))
    : formatRupiahInput(value)

  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 10, top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 12, color: 'var(--text-muted)',
        fontFamily: 'var(--mono)', pointerEvents: 'none',
      }}>
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(parseRupiahInput(e.target.value))}
        style={{
          width: '100%', height: 36,
          paddingLeft: 32, paddingRight: 12,
          borderRadius: 8, border: '1px solid var(--border)',
          background: disabled ? 'var(--surface-alt)' : 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'var(--mono)', fontSize: 13,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LineItemCardProps {
  line: Line
  index: number
  tipe: TransactionType
  onChange: (updates: Partial<Line>) => void
  onDelete: () => void
  canDelete: boolean
  hasBubutLuar: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LineItemCard({
  line,
  index,
  tipe,
  onChange,
  onDelete,
  canDelete,
  hasBubutLuar,
}: LineItemCardProps) {
  const { categories } = useCategoryStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const filteredCategories = useMemo(
    () =>
      categories
        .filter((c) => c.isActive && c.type === tipe)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, tipe]
  )

  const selectedCat = categories.find((c) => c.id === line.categoryId)
  const isJasa = selectedCat?.isJasa ?? false
  const isBubutLuar = selectedCat?.name === 'Bubut Luar'
  const bubutLuarCatId = categories.find((c) => c.name === 'Bubut Luar')?.id

  const basis = getBasisKomisi(line)
  const lineLabel = `LINE ${String(index + 1).padStart(2, '0')}`

  function handleDeleteClick() {
    if (hasLineData(line)) {
      setShowDeleteConfirm(true)
    } else {
      onDelete()
    }
  }

  function handleCategoryChange(catId: string) {
    onChange({ categoryId: catId || null, mechanics: [] })
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 16,
      background: 'var(--surface-alt)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* LINE nn pill */}
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.18em', color: 'var(--accent)',
          background: 'var(--accent-tint)',
          padding: '3px 8px', borderRadius: 4, flexShrink: 0,
        }}>
          {lineLabel}
        </div>

        {/* Kategori select */}
        <select
          value={line.categoryId ?? ''}
          onChange={(e) => handleCategoryChange(e.target.value)}
          style={{
            flex: 1, maxWidth: 280, height: 34,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '0 10px',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--body)',
            cursor: 'pointer', color: 'var(--text)',
            outline: 'none',
          }}
        >
          <option value="" disabled>Pilih kategori...</option>
          {filteredCategories.map((cat) => {
            const isDisabled =
              cat.name === 'Bubut Luar' &&
              hasBubutLuar &&
              cat.id !== line.categoryId
            return (
              <option key={cat.id} value={cat.id} disabled={isDisabled}>
                {cat.name}{cat.isJasa ? ' · komisi' : ''}{isDisabled ? ' (sudah ada)' : ''}
              </option>
            )
          })}
        </select>

        {/* JASA badge */}
        {isJasa && !isBubutLuar && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            padding: '3px 8px', borderRadius: 4,
            background: 'var(--success-tint)', color: 'var(--success)',
            flexShrink: 0,
          }}>
            JASA
          </span>
        )}

        {/* BUBUT LUAR badge */}
        {isBubutLuar && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            padding: '3px 8px', borderRadius: 4,
            background: 'var(--accent-tint)', color: 'var(--accent)',
            flexShrink: 0,
          }}>
            DUAL-LEG
          </span>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={!canDelete}
          title={!canDelete ? 'Minimal 1 line item' : `Hapus ${lineLabel}`}
          style={{
            marginLeft: 'auto', flexShrink: 0,
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: canDelete ? 'var(--text-muted)' : 'var(--border)',
            fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canDelete ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          ×
        </button>
      </div>

      {/* ── hasBubutLuar hint (when another line already has Bubut Luar) ──── */}
      {hasBubutLuar && line.categoryId !== bubutLuarCatId && bubutLuarCatId && (
        <div style={{
          fontSize: 11, fontFamily: 'var(--mono)',
          color: 'var(--warning)', letterSpacing: '0.04em',
          display: line.categoryId === null ? 'none' : 'none', // hidden unless category == BL attempted
        }} />
      )}

      {/* ── Inputs ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isJasa ? '1fr 1fr 152px' : '1fr',
        gap: 12,
        alignItems: 'end',
      }}>

        {/* Nominal */}
        <div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: 6,
          }}>
            Nominal (Rp)
          </div>
          <CurrencyInput
            id={`nominal-${line.id}`}
            value={line.nominal}
            onChange={(v) => onChange({ nominal: v })}
          />
        </div>

        {/* Biaya Material — only for isJasa */}
        {isJasa && (
          <div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-muted)', marginBottom: 6,
            }}>
              Biaya Material (Rp)
            </div>
            <CurrencyInput
              id={`material-${line.id}`}
              value={line.biayaMaterial}
              onChange={(v) => onChange({ biayaMaterial: v })}
            />
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.06em',
            }}>
              Basis = nominal − material
            </div>
          </div>
        )}

        {/* Basis pill — only for isJasa */}
        {isJasa && (
          <div style={{
            background: 'var(--text)', color: '#fff',
            borderRadius: 8, padding: '0 16px',
            height: 50,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)',
            }}>
              BASIS
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, marginTop: 2,
            }}>
              {basis > 0 ? `Rp ${formatRupiahInput(basis)}` : 'Rp 0'}
            </div>
          </div>
        )}
      </div>

      {/* ── Mekanik chip row ─────────────────────────────────────────────────── */}
      {isJasa && (
        <MechanicChipRow
          lineId={line.id}
          mechanics={line.mechanics}
          basis={basis}
          categoryId={line.categoryId}
          onChange={(mechs) => onChange({ mechanics: mechs })}
        />
      )}

      {/* ── Bubut Luar vendor placeholder (T6) ──────────────────────────────── */}
      {isBubutLuar && (
        <div style={{
          padding: '12px 14px',
          background: 'var(--accent-tint)',
          border: '1px dashed var(--accent)',
          borderRadius: 8,
          fontSize: 12, color: 'var(--accent)',
          fontFamily: 'var(--mono)', letterSpacing: '0.06em',
        }}>
          BUBUT LUAR · DUAL-LEG — vendor panel implementasi di T6
        </div>
      )}

      {/* ── Notes ───────────────────────────────────────────────────────────── */}
      <div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 6,
        }}>
          Catatan line (opsional)
        </div>
        <textarea
          value={line.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="Catatan untuk line ini..."
          style={{
            width: '100%', borderRadius: 8, padding: '8px 12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)', fontSize: 12,
            resize: 'vertical', outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Hapus ${lineLabel}?`}
        message="Data line ini akan hilang permanen."
        confirmLabel="Hapus Line"
        variant="destructive"
        onConfirm={onDelete}
      />
    </div>
  )
}
