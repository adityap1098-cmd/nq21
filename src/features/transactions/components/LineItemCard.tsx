import { useState, useMemo } from 'react'
import { useCategories } from '@/features/categories/hooks'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { MechanicChipRow } from './MechanicChipRow'
import { ItemNameAutocomplete } from './ItemNameAutocomplete'
import { CustomerSupplierAutocomplete } from './CustomerSupplierAutocomplete'
import { getBasisKomisi, formatRupiahInput, parseRupiahInput, hasLineData } from '../utils'
import type { Line } from '../types'
import type { TransactionType } from '@/store/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemNameLabel(cat: { name: string; is_jasa: boolean } | null | undefined): { label: string; placeholder: string } | null {
  if (!cat) return null
  if (cat.is_jasa) return { label: 'Detail Jasa', placeholder: 'Cth: Tune Up, Bleeding Rem, Ganti Oli + Filter' }
  switch (cat.name) {
    case 'Oli':          return { label: 'Merk Oli',       placeholder: 'Cth: Shell Helix Ultra 5W-40, Motul 5100' }
    case 'Sparepart':   return { label: 'Nama Sparepart',  placeholder: 'Cth: Filter Oli K&N, Kampas Rem Brembo' }
    case 'Bubut Luar':
    case 'Bubut Dalam': return { label: 'Detail Bubut',    placeholder: 'Cth: Press Bearing, Skir Klep, Korter' }
    case 'Gaji':
    case 'Listrik & Air':
    case 'Sewa':
    case 'Lain-lain':   return { label: 'Keterangan',      placeholder: 'Cth: Gaji April, Listrik bulan ini' }
    default:             return { label: 'Detail',          placeholder: 'Keterangan tambahan (opsional)' }
  }
}

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

const fieldLabelStyle = {
  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  color: 'var(--text-muted)', marginBottom: 5,
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
  const { data: categories = [] } = useCategories()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notesOpen, setNotesOpen] = useState(!!line.notes)

  const filteredCategories = useMemo(
    () =>
      categories
        .filter((c) => c.is_active && c.type === tipe)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, tipe]
  )

  const selectedCat = categories.find((c) => c.id === line.categoryId)
  const isJasa = selectedCat?.is_jasa ?? false
  const isBubutLuar = selectedCat?.name === 'Bubut Luar'
  const bubutLuarCatId = categories.find((c) => c.name === 'Bubut Luar')?.id

  const basis = getBasisKomisi(line)
  const lineLabel = `LINE ${String(index + 1).padStart(2, '0')}`
  const itemNameMeta = getItemNameLabel(selectedCat)

  function handleDeleteClick() {
    if (hasLineData(line)) {
      setShowDeleteConfirm(true)
    } else {
      onDelete()
    }
  }

  function handleCategoryChange(catId: string) {
    const newCat = categories.find((c) => c.id === catId)
    const newIsBubutLuar = newCat?.name === 'Bubut Luar'
    onChange({
      categoryId: catId || null,
      itemName: '',
      mechanics: [],
      bubutVendor: newIsBubutLuar
        ? (line.bubutVendor ?? { supplierId: null, vendorCost: 0 })
        : undefined,
    })
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 14,
      background: 'var(--surface-alt)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.18em', color: 'var(--accent)',
          background: 'var(--accent-tint)',
          padding: '3px 8px', borderRadius: 4, flexShrink: 0,
        }}>
          {lineLabel}
        </div>

        <select
          value={line.categoryId ?? ''}
          onChange={(e) => handleCategoryChange(e.target.value)}
          style={{
            flex: 1, maxWidth: 280, height: 34,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '0 10px',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--body)', cursor: 'pointer', color: 'var(--text)', outline: 'none',
          }}
        >
          <option value="" disabled>Pilih kategori...</option>
          {filteredCategories.map((cat) => {
            const isDisabled =
              cat.name === 'Bubut Luar' && hasBubutLuar && cat.id !== line.categoryId
            return (
              <option key={cat.id} value={cat.id} disabled={isDisabled}>
                {cat.name}{cat.is_jasa ? ' · komisi' : ''}{isDisabled ? ' (sudah ada)' : ''}
              </option>
            )
          })}
        </select>

        {isJasa && !isBubutLuar && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            padding: '3px 8px', borderRadius: 4,
            background: 'var(--success-tint)', color: 'var(--success)', flexShrink: 0,
          }}>
            JASA
          </span>
        )}
        {isBubutLuar && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            padding: '3px 8px', borderRadius: 4,
            background: 'var(--accent-tint)', color: 'var(--accent)', flexShrink: 0,
          }}>
            DUAL-LEG
          </span>
        )}

        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={!canDelete}
          title={!canDelete ? 'Minimal 1 line item' : `Hapus ${lineLabel}`}
          style={{
            marginLeft: 'auto', flexShrink: 0,
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: canDelete ? 'var(--text-muted)' : 'var(--border)',
            fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canDelete ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
          }}
        >
          ×
        </button>
      </div>

      {/* ── Row 1: itemName (60%) + Nominal (40%) — shown when category selected ── */}
      {(selectedCat || !line.categoryId) && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>
          <div>
            <div style={fieldLabelStyle}>
              {itemNameMeta?.label ?? 'Detail'}{' '}
              <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: 'var(--border)' }}>(opsional)</span>
            </div>
            <ItemNameAutocomplete
              value={line.itemName ?? ''}
              categoryId={line.categoryId}
              onChange={(v) => onChange({ itemName: v })}
              placeholder={itemNameMeta?.placeholder ?? 'Keterangan tambahan'}
              disabled={!line.categoryId}
            />
          </div>
          <div>
            <div style={fieldLabelStyle}>Nominal (Rp)</div>
            <CurrencyInput
              id={`nominal-${line.id}`}
              value={line.nominal}
              onChange={(v) => onChange({ nominal: v })}
            />
          </div>
        </div>
      )}

      {/* ── Row 2: Biaya Material + Basis pill (jasa only) ────────────────────── */}
      {isJasa && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={fieldLabelStyle}>Biaya Material (Rp)</div>
            <CurrencyInput
              id={`material-${line.id}`}
              value={line.biayaMaterial}
              onChange={(v) => onChange({ biayaMaterial: v })}
            />
          </div>
          <div style={{
            background: 'var(--text)', color: '#fff',
            borderRadius: 8, padding: '0 14px',
            height: 36, minWidth: 120,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)' }}>
              BASIS
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, marginTop: 1 }}>
              {basis > 0 ? `Rp ${formatRupiahInput(basis)}` : 'Rp 0'}
            </div>
          </div>
        </div>
      )}

      {/* ── Row 3: Mekanik chip row (jasa only) ──────────────────────────────── */}
      {isJasa && (
        <MechanicChipRow
          lineId={line.id}
          mechanics={line.mechanics}
          basis={basis}
          categoryId={line.categoryId}
          onChange={(mechs) => onChange({ mechanics: mechs })}
        />
      )}

      {/* ── Row 4: Bubut Luar extra panel (compact 1-row) ────────────────────── */}
      {isBubutLuar && (
        <div style={{
          padding: 12,
          background: 'linear-gradient(180deg, var(--accent-tint) 0%, var(--surface-alt) 100%)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              padding: '3px 8px', borderRadius: 4,
              background: 'var(--accent-tint)', color: 'var(--accent)',
            }}>
              BUBUT LUAR · DUAL-LEG
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Auto-create expense ke vendor
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={fieldLabelStyle}>Vendor Bubut Luar</div>
              <CustomerSupplierAutocomplete
                type="supplier"
                filterSuppliers="vendor-bubut"
                value={line.bubutVendor?.supplierId ?? null}
                onChange={(id) =>
                  onChange({ bubutVendor: { supplierId: id, vendorCost: line.bubutVendor?.vendorCost ?? 0 } })
                }
              />
            </div>
            <div>
              <div style={fieldLabelStyle}>Biaya ke Vendor (Rp)</div>
              <CurrencyInput
                value={line.bubutVendor?.vendorCost ?? 0}
                onChange={(v) =>
                  onChange({ bubutVendor: { supplierId: line.bubutVendor?.supplierId ?? null, vendorCost: v } })
                }
              />
            </div>
          </div>

          {line.nominal > 0 && (line.bubutVendor?.vendorCost ?? 0) > 0 && (() => {
            const vendorCost = line.bubutVendor!.vendorCost
            const margin = line.nominal - vendorCost
            const isNegative = margin < 0
            return (
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: 'var(--surface)', borderRadius: 6,
                fontFamily: 'var(--mono)', fontSize: 11,
                border: `1px solid ${isNegative ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Margin NQ21:{' '}
                  <strong style={{ color: isNegative ? 'var(--accent)' : 'var(--success)' }}>
                    {isNegative ? '− ' : ''}Rp {formatRupiahInput(Math.abs(margin))}
                  </strong>
                  {isNegative && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>⚠</span>}
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Row 5: Notes (collapsible) ────────────────────────────────────────── */}
      {!notesOpen ? (
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          style={{
            background: 'none', border: 'none', padding: 0,
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em',
            color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left',
            textDecoration: 'underline', textDecorationStyle: 'dotted',
          }}
        >
          + Catatan line
        </button>
      ) : (
        <div>
          <div style={fieldLabelStyle}>Catatan line (opsional)</div>
          <textarea
            value={line.notes ?? ''}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            placeholder="Catatan untuk line ini..."
            style={{
              width: '100%', borderRadius: 8, padding: '8px 12px',
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text)', fontSize: 12, resize: 'vertical', outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* ── hasBubutLuar hint (hidden — kept for DOM structure) ────────────────── */}
      {hasBubutLuar && line.categoryId !== bubutLuarCatId && bubutLuarCatId && (
        <div style={{ display: 'none' }} />
      )}

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
