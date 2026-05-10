import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useTransactionStore } from '@/store/transactions'
import { useAuthStore } from '@/store/auth'
import { useCategoryStore } from '@/store/master/categories'
import { useMechanicStore } from '@/store/master/mechanics'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { CustomerSupplierAutocomplete } from './CustomerSupplierAutocomplete'
import { LineItemCard } from './LineItemCard'
import { createEmptyLine, getBasisKomisi } from '../utils'
import type { Line } from '../types'
import type { TransactionType, PaymentMethod } from '@/store/types'

// ─── Schema (header only — full schema added in T7) ──────────────────────────

const headerSchema = z.object({
  noReferensi: z.string().min(1, 'Wajib diisi'),
  tgl: z.string().min(1, 'Wajib diisi'),
  tipe: z.enum(['income', 'expense']),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'qris']),
  notes: z.string().optional(),
})

type HeaderForm = z.infer<typeof headerSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NO_REF_REGEX = /^(TRX|EXP)-\d{8}-\d{3}$/

function generateNextNoReferensi(
  tipe: TransactionType,
  dateStr: string,
  transactions: Array<{ noReferensi: string; tipe: TransactionType }>,
): string {
  const prefix = tipe === 'income' ? 'TRX' : 'EXP'
  const compact = dateStr.replace(/-/g, '')
  const dayPattern = `${prefix}-${compact}-`
  const existing = transactions
    .filter((t) => t.noReferensi.startsWith(dayPattern) && !t.noReferensi.endsWith('-VENDOR'))
    .map((t) => parseInt(t.noReferensi.slice(-3), 10))
    .filter((n) => !isNaN(n))
  const max = existing.length > 0 ? Math.max(...existing) : 0
  return `${dayPattern}${String(max + 1).padStart(3, '0')}`
}

type NoRefStatus = 'UNIK' | 'DUPLIKAT' | 'INVALID FORMAT'

function getNoRefStatus(
  noRef: string,
  transactions: Array<{ noReferensi: string; id: string }>,
  currentId?: string,
): NoRefStatus {
  if (!NO_REF_REGEX.test(noRef)) return 'INVALID FORMAT'
  const dup = transactions.some((t) => t.noReferensi === noRef && t.id !== currentId)
  return dup ? 'DUPLIKAT' : 'UNIK'
}

const STATUS_STYLES: Record<NoRefStatus, { color: string; bg: string }> = {
  UNIK: { color: 'var(--success)', bg: 'var(--success-tint)' },
  DUPLIKAT: { color: 'var(--accent)', bg: 'var(--accent-tint)' },
  'INVALID FORMAT': { color: 'var(--warning)', bg: 'var(--warning-tint)' },
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TransactionFormProps {
  mode?: 'add' | 'edit'
  transactionId?: string
}

export function TransactionForm({ mode = 'add', transactionId }: TransactionFormProps) {
  const { user } = useAuthStore()
  const { transactions } = useTransactionStore()
  const { categories } = useCategoryStore()
  const { rates } = useMechanicStore()
  const today = format(new Date(), 'yyyy-MM-dd')

  const form = useForm<HeaderForm>({
    resolver: zodResolver(headerSchema),
    defaultValues: {
      noReferensi: '',
      tgl: today,
      tipe: 'income',
      paymentMethod: 'cash',
      notes: '',
    },
  })

  const { watch, setValue, register } = form
  const tipe = watch('tipe') as TransactionType
  const tgl = watch('tgl')
  const noReferensi = watch('noReferensi')
  const paymentMethod = watch('paymentMethod') as PaymentMethod

  // Line items state (hybrid approach — Decision A)
  const [lines, setLines] = useState<Line[]>(() => [createEmptyLine()])

  // Tipe-change confirm dialog (when lines have data)
  const [pendingTipe, setPendingTipe] = useState<TransactionType | null>(null)

  // Auto-generate noRef on tipe/tgl change; also clear customer/supplier selection (Decision E)
  useEffect(() => {
    if (mode === 'add') {
      setValue('noReferensi', generateNextNoReferensi(tipe, tgl, transactions))
    }
    setValue('customerId', undefined)
    setValue('supplierId', undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipe, tgl, mode])

  const noRefStatus: NoRefStatus = noReferensi
    ? getNoRefStatus(noReferensi, transactions, transactionId)
    : 'INVALID FORMAT'

  const { color: statusColor, bg: statusBg } = STATUS_STYLES[noRefStatus]

  function handleRegenNoRef() {
    setValue('noReferensi', generateNextNoReferensi(tipe, tgl, transactions))
  }

  // ── Line helpers ────────────────────────────────────────────────────────────

  const bubutLuarCatName = 'Bubut Luar'
  const hasBubutLuar = lines.some(
    (l) => categories.find((c) => c.id === l.categoryId)?.name === bubutLuarCatName,
  )

  function addLine() {
    setLines((prev) => [...prev, createEmptyLine()])
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  function updateLine(id: string, updates: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    )
  }

  // ── Total komisi from all jasa lines ────────────────────────────────────────
  const totalKomisi = useMemo(() => {
    return lines.reduce((sum, line) => {
      const cat = categories.find((c) => c.id === line.categoryId)
      if (!cat?.isJasa) return sum
      const basis = getBasisKomisi(line)
      return sum + line.mechanics.reduce((s, m) => {
        const rate = rates.find(
          (r) => r.mechanicId === m.mechanicId && r.categoryId === line.categoryId,
        )?.ratePercent ?? 0
        return s + Math.round(basis * (m.sharePercent / 100) * (rate / 100))
      }, 0)
    }, 0)
  }, [lines, categories, rates])

  // ── Tipe toggle with confirm ─────────────────────────────────────────────────

  function handleTipeClick(next: TransactionType) {
    if (next === tipe) return
    const hasData = lines.some((l) => l.categoryId !== null || l.nominal > 0)
    if (hasData) {
      setPendingTipe(next)
    } else {
      setValue('tipe', next)
      setLines([createEmptyLine()])
    }
  }

  function confirmTipeChange() {
    if (pendingTipe) {
      setValue('tipe', pendingTipe)
      setLines([createEmptyLine()])
    }
    setPendingTipe(null)
  }

  const isOwner = user?.role === 'owner'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: 24,
      padding: '24px 32px',
      alignItems: 'start',
    }}>

      {/* ── Left: Form steps ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Step 01 — Identitas ─────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--text-muted)', marginBottom: 20,
          }}>
            LANGKAH 01 — IDENTITAS TRANSAKSI
          </div>

          {/* No Referensi */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              No. Referensi
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                {...register('noReferensi')}
                style={{ fontFamily: 'var(--mono)', flex: 1 }}
                placeholder="TRX-YYYYMMDD-NNN"
              />
              <button
                type="button"
                onClick={handleRegenNoRef}
                title="Generate ulang"
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-alt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <RefreshCw size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                padding: '4px 10px', borderRadius: 6,
                background: statusBg, color: statusColor,
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {noRefStatus}
              </div>
            </div>
          </div>

          {/* Tgl + Tipe row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>

            {/* Tanggal */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Tanggal
              </div>
              {isOwner ? (
                <Input type="date" {...register('tgl')} />
              ) : (
                <div style={{
                  height: 36, padding: '0 12px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-alt)',
                  display: 'flex', alignItems: 'center',
                  fontSize: 13, color: 'var(--text)',
                  fontFamily: 'var(--mono)',
                }}>
                  {tgl
                    ? format(new Date(tgl + 'T00:00:00'), 'd MMMM yyyy', { locale: localeId })
                    : '—'}
                </div>
              )}
            </div>

            {/* Tipe toggle */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Tipe
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['income', 'expense'] as const).map((t) => {
                  const active = tipe === t
                  const isIncome = t === 'income'
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTipeClick(t)}
                      style={{
                        flex: 1, height: 36, borderRadius: 8, cursor: 'pointer',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                        border: `1.5px solid ${active
                          ? isIncome ? 'var(--success)' : 'var(--accent)'
                          : 'var(--border)'}`,
                        background: active
                          ? isIncome ? 'var(--success-tint)' : 'var(--accent-tint)'
                          : 'transparent',
                        color: active
                          ? isIncome ? 'var(--success)' : 'var(--accent)'
                          : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isIncome ? '↑ MASUK' : '↓ KELUAR'}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Customer / Supplier autocomplete */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {tipe === 'income' ? 'Customer' : 'Supplier'}
              <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>
            </div>
            <CustomerSupplierAutocomplete
              type={tipe === 'income' ? 'customer' : 'supplier'}
              value={tipe === 'income'
                ? (watch('customerId') ?? null)
                : (watch('supplierId') ?? null)}
              onChange={(id) => {
                if (tipe === 'income') setValue('customerId', id ?? undefined)
                else setValue('supplierId', id ?? undefined)
              }}
            />
          </div>

          {/* Payment method pills */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Metode Pembayaran
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['cash', 'transfer', 'qris'] as const).map((m) => {
                const label = m === 'cash' ? 'Cash' : m === 'transfer' ? 'Transfer' : 'QRIS'
                const active = paymentMethod === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setValue('paymentMethod', m)}
                    style={{
                      flex: 1, height: 36, borderRadius: 8, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${active ? 'var(--text)' : 'var(--border)'}`,
                      background: active ? 'var(--text)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Step 02 — Line Items ─────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}>

          {/* Step header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'var(--text-muted)',
            }}>
              LANGKAH 02 — ITEM TRANSAKSI
            </div>
            <button
              type="button"
              onClick={addLine}
              style={{
                height: 30, padding: '0 14px', borderRadius: 6,
                border: '1.5px solid var(--border)',
                background: 'var(--surface-alt)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              TAMBAH LINE
            </button>
          </div>

          {/* Line cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lines.map((line, index) => (
              <LineItemCard
                key={line.id}
                line={line}
                index={index}
                tipe={tipe}
                onChange={(updates) => updateLine(line.id, updates)}
                onDelete={() => removeLine(line.id)}
                canDelete={lines.length > 1}
                hasBubutLuar={hasBubutLuar}
              />
            ))}
          </div>
        </div>

        {/* ── Step 03 — Catatan ───────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--text-muted)', marginBottom: 16,
          }}>
            LANGKAH 03 — CATATAN
          </div>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Catatan tambahan (opsional)..."
            style={{
              width: '100%', borderRadius: 8, padding: '10px 12px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── Right: Sticky Summary (T5 full impl) ──────────────────────────── */}
      <div style={{ position: 'sticky', top: 80 }}>
        <div style={{
          background: 'var(--text)',
          borderRadius: 12,
          padding: '20px 24px',
          color: '#fff',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            opacity: 0.45, marginBottom: 16,
          }}>
            RINGKASAN
          </div>

          <div style={{
            fontFamily: 'var(--mono)', fontSize: 12,
            opacity: 0.6, marginBottom: 4,
          }}>
            {noReferensi || '—'}
          </div>

          <div style={{ fontSize: 12, opacity: 0.35, marginBottom: 28 }}>
            {tgl
              ? format(new Date(tgl + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: localeId })
              : '—'}
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              opacity: 0.45, marginBottom: 6,
            }}>
              TOTAL
            </div>
            <div style={{
              fontFamily: 'Anton, sans-serif',
              fontSize: 28, letterSpacing: '0.02em',
            }}>
              Rp {lines.reduce((sum, l) => sum + l.nominal, 0).toLocaleString('id-ID')}
            </div>
          </div>

          {totalKomisi > 0 && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'var(--accent-tint)',
              borderRadius: 8,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
                color: 'var(--accent)', marginBottom: 3,
              }}>
                KOMISI
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16,
                color: 'var(--accent)',
              }}>
                Rp {totalKomisi.toLocaleString('id-ID')}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled
            style={{
              marginTop: 20,
              width: '100%', height: 44, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
              cursor: 'not-allowed',
            }}
          >
            SIMPAN
          </button>
        </div>
      </div>

      {/* ── Tipe change confirm ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={pendingTipe !== null}
        onOpenChange={(open) => { if (!open) setPendingTipe(null) }}
        title="Ganti tipe transaksi?"
        message="Line items yang sudah diisi akan direset. Lanjutkan?"
        confirmLabel="Ya, Ganti Tipe"
        variant="destructive"
        onConfirm={confirmTipeChange}
      />
    </div>
  )
}
