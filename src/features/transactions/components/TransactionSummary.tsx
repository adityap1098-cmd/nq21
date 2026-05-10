import { useMemo } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { formatRupiahInput, computeKomisi } from '../utils'
import type { Line } from '../types'
import type { Category, CommissionRate, Mechanic, PaymentMethod, TransactionType } from '@/store/types'

export interface TransactionSummaryProps {
  noReferensi: string
  tgl: string
  tipe: TransactionType
  customerName: string | null
  supplierName: string | null
  paymentMethod: PaymentMethod
  lines: Line[]
  categories: Category[]
  mechanics: Mechanic[]
  rates: CommissionRate[]
  validationErrors: string[]
  isSubmitting?: boolean
  onSubmit: () => void
}

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }} />
}

export function TransactionSummary({
  noReferensi,
  tgl,
  tipe,
  customerName,
  supplierName,
  paymentMethod,
  lines,
  categories,
  mechanics,
  rates,
  validationErrors,
  isSubmitting = false,
  onSubmit,
}: TransactionSummaryProps) {
  const isValid = validationErrors.length === 0
  const isDisabled = !isValid || isSubmitting

  const partyName = tipe === 'income' ? customerName : supplierName
  const activeLines = useMemo(() => lines.filter((l) => l.categoryId !== null), [lines])

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.nominal, 0), [lines])

  const komisi = useMemo(
    () => computeKomisi(lines, categories, rates),
    [lines, categories, rates],
  )

  const bubutLuarLines = useMemo(
    () => activeLines.filter((l) => categories.find((c) => c.id === l.categoryId)?.name === 'Bubut Luar'),
    [activeLines, categories],
  )

  const tglFormatted = tgl
    ? format(new Date(tgl + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: localeId })
    : '—'

  const paymentLabel =
    paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'transfer' ? 'Transfer' : 'QRIS'

  const tooltipText = validationErrors.slice(0, 2).join(' · ')

  return (
    <div style={{
      position: 'sticky', top: 88,
      background: 'var(--text)', color: '#fff',
      borderRadius: 12, padding: 22,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>

      {/* ── 1. Header ───────────────────────────────────────────────────── */}
      <div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)',
          marginBottom: 6,
        }}>
          RINGKASAN
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700,
          letterSpacing: '0.02em', marginBottom: 4,
        }}>
          {noReferensi || '—'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          {tglFormatted}
        </div>
      </div>

      <Divider />

      {/* ── 2. Meta grid 2×2 ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
        {[
          {
            label: 'TIPE',
            value: tipe === 'income' ? 'MASUK' : 'KELUAR',
            color: tipe === 'income' ? 'var(--success)' : 'var(--accent)',
          },
          {
            label: tipe === 'income' ? 'CUSTOMER' : 'SUPPLIER',
            value: partyName ?? '—',
            color: undefined,
          },
          { label: 'METODE', value: paymentLabel, color: undefined },
          { label: 'LINE', value: `${activeLines.length} item`, color: undefined },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)',
            }}>
              {label}
            </span>
            <strong style={{
              fontSize: 12, fontWeight: 600, marginTop: 2,
              color: color ?? '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {value}
            </strong>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── 3. Line list ────────────────────────────────────────────────── */}
      {activeLines.length > 0 ? (
        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {activeLines.map((line) => {
            const cat = categories.find((c) => c.id === line.categoryId)
            const catName = cat?.name ?? '—'
            let label = catName
            if (cat?.isJasa && line.jasaName) {
              label = `${catName} — ${line.jasaName}`
            } else if (!cat?.isJasa && line.notes) {
              label = `${catName} — ${line.notes}`
            }
            return (
              <div key={line.id} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '6px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.8)',
                  flex: 1, marginRight: 10,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                  flexShrink: 0,
                }}>
                  Rp {formatRupiahInput(line.nominal) || '0'}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.3)',
          textAlign: 'center', padding: '6px 0', fontStyle: 'italic',
        }}>
          Belum ada item
        </div>
      )}

      <Divider />

      {/* ── 4b. Bubut Luar info ─────────────────────────────────────────── */}
      {bubutLuarLines.length > 0 && (
        <div style={{
          background: 'rgba(200,16,46,0.08)',
          border: '1px solid rgba(200,16,46,0.2)',
          borderRadius: 8, padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)',
          }}>
            BUBUT LUAR · DUAL-LEG
          </span>
          {bubutLuarLines.map((line) => {
            const vendorCost = line.bubutVendor?.vendorCost ?? 0
            const margin = line.nominal - vendorCost
            const marginColor = margin >= 0 ? 'var(--success)' : 'var(--accent)'
            return (
              <div key={line.id} style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                <span>Customer: </span>
                <span style={{ fontFamily: 'var(--mono)' }}>Rp {line.nominal.toLocaleString('id-ID')}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}> · </span>
                <span>Vendor: </span>
                <span style={{ fontFamily: 'var(--mono)' }}>Rp {vendorCost.toLocaleString('id-ID')}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}> · </span>
                <span>Margin: </span>
                <span style={{ fontFamily: 'var(--mono)', color: marginColor, fontWeight: 600 }}>
                  Rp {Math.abs(margin).toLocaleString('id-ID')}
                  {margin < 0 ? ' ⚠' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 4. TOTAL ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          letterSpacing: '0.18em', color: 'rgba(255,255,255,0.7)',
        }}>
          TOTAL
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Rp
          </span>
          <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, lineHeight: 1 }}>
            {total > 0 ? total.toLocaleString('id-ID') : '0'}
          </span>
        </div>
      </div>

      {/* ── 5. Komisi section ───────────────────────────────────────────── */}
      {komisi.total > 0 && (
        <div style={{
          background: 'rgba(200,16,46,0.12)',
          border: '1px solid rgba(200,16,46,0.3)',
          borderRadius: 8, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: komisi.perMechanic.size > 1 ? 8 : 0 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              letterSpacing: '0.18em', color: 'rgba(255,255,255,0.6)',
            }}>
              KOMISI MEKANIK
            </span>
            <strong style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--accent)' }}>
              Rp {komisi.total.toLocaleString('id-ID')}
            </strong>
          </div>

          {komisi.perMechanic.size > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[...komisi.perMechanic.entries()].map(([mechId, data]) => {
                const mech = mechanics.find((m) => m.id === mechId)
                return (
                  <div key={mechId} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 11, color: 'rgba(255,255,255,0.7)',
                  }}>
                    <span>
                      {data.hasOverride && (
                        <span style={{ color: 'var(--warning)', marginRight: 4 }}>⚠</span>
                      )}
                      {mech?.name ?? mechId}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)' }}>
                      Rp {data.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 6. Submit button ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        title={!isValid && tooltipText ? tooltipText : undefined}
        style={{
          width: '100%', height: 46, borderRadius: 10,
          background: isDisabled ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
          border: 'none',
          color: isDisabled ? 'rgba(255,255,255,0.35)' : '#fff',
          fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN TRANSAKSI'}
      </button>

      {/* ── 7. Audit footer ─────────────────────────────────────────────── */}
      <div style={{
        fontSize: 10, color: 'rgba(255,255,255,0.35)',
        textAlign: 'center', fontStyle: 'italic', marginTop: -6,
      }}>
        Audit log otomatis tersimpan
      </div>
    </div>
  )
}
