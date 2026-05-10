import { useEffect, useMemo, useState } from 'react'
import { useMechanicStore } from '@/store/master/mechanics'
import { useTransactionStore } from '@/store/transactions'
import { useAuthStore } from '@/store/auth'
import { useUserStore } from '@/store/master/users'
import { useCategoryStore } from '@/store/master/categories'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import type { LineMechanic } from '../types'
import type {
  Mechanic, CommissionRate, Transaction, TransactionLine, TransactionLineMechanic,
} from '@/store/types'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

function getRate(
  mechanicId: string | null,
  categoryId: string | null,
  rates: CommissionRate[],
): number {
  if (!mechanicId || !categoryId) return 0
  return rates.find((r) => r.mechanicId === mechanicId && r.categoryId === categoryId)?.ratePercent ?? 0
}

function calcKomisi(basis: number, share: number, rate: number): number {
  return Math.round(basis * (share / 100) * (rate / 100))
}

function getDefaultMechanicId(
  userId: string | null,
  transactions: Transaction[],
  lines: TransactionLine[],
  lineMechanics: TransactionLineMechanic[],
  jasaCategoryIds: Set<string>,
  activeMechanics: Mechanic[],
): string | null {
  if (activeMechanics.length === 0) return null

  if (userId) {
    const userTxs = [...transactions]
      .filter((tx) => tx.createdBy === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    for (const tx of userTxs) {
      const jasaLines = lines.filter(
        (l) => l.transactionId === tx.id && jasaCategoryIds.has(l.categoryId),
      )
      for (const line of jasaLines) {
        const lm = lineMechanics.find((m) => m.transactionLineId === line.id)
        if (lm && activeMechanics.some((m) => m.id === lm.mechanicId)) {
          return lm.mechanicId
        }
      }
    }
  }

  return activeMechanics[0].id
}

function evenShareRedistribute(existing: LineMechanic[], newMechanicId: string): LineMechanic[] {
  const n = existing.length + 1
  const base = parseFloat((100 / n).toFixed(2))
  const newMechs: LineMechanic[] = existing.map((m) => ({ ...m, sharePercent: base }))
  const lastShare = parseFloat((100 - base * existing.length).toFixed(2))
  newMechs.push({ mechanicId: newMechanicId, sharePercent: lastShare })
  return newMechs
}

function proportionalRedistribute(existing: LineMechanic[], deleteIdx: number): LineMechanic[] {
  const remaining = existing.filter((_, i) => i !== deleteIdx)
  if (remaining.length === 0) return []

  const totalRemaining = remaining.reduce((s, m) => s + m.sharePercent, 0)

  if (totalRemaining === 0) {
    const base = parseFloat((100 / remaining.length).toFixed(2))
    return remaining.map((m, i) => ({
      ...m,
      sharePercent:
        i === remaining.length - 1
          ? parseFloat((100 - base * (remaining.length - 1)).toFixed(2))
          : base,
    }))
  }

  let accum = 0
  return remaining.map((m, i) => {
    if (i === remaining.length - 1) {
      return { ...m, sharePercent: parseFloat((100 - accum).toFixed(2)) }
    }
    const share = parseFloat((m.sharePercent / totalRemaining * 100).toFixed(2))
    accum += share
    return { ...m, sharePercent: share }
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MechanicChipRowProps {
  // lineId reserved for T7 audit log — not used in T4
  lineId: string
  mechanics: LineMechanic[]
  basis: number
  categoryId: string | null
  onChange: (mechanics: LineMechanic[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MechanicChipRow({
  mechanics,
  basis,
  categoryId,
  onChange,
}: MechanicChipRowProps) {
  const { mechanics: allMechanics, rates } = useMechanicStore()
  const { transactions, lines: txLines, lineMechanics } = useTransactionStore()
  const { user } = useAuthStore()
  const { users } = useUserStore()
  const { categories } = useCategoryStore()

  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null)

  const activeMechanics = useMemo(
    () => allMechanics.filter((m) => m.isActive),
    [allMechanics],
  )

  const currentUserId = useMemo(
    () => (user ? users.find((u) => u.name === user.name)?.id ?? null : null),
    [user, users],
  )

  const jasaCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.isJasa).map((c) => c.id)),
    [categories],
  )

  // Initialize with default mechanic when category is set and mechanics is empty
  useEffect(() => {
    if (mechanics.length > 0 || !categoryId) return
    const defaultId = getDefaultMechanicId(
      currentUserId,
      transactions,
      txLines,
      lineMechanics,
      jasaCategoryIds,
      activeMechanics,
    )
    if (defaultId) {
      onChange([{ mechanicId: defaultId, sharePercent: 100 }])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, mechanics.length])

  // Derived state
  const takenIds = new Set(mechanics.map((m) => m.mechanicId).filter(Boolean) as string[])
  const availableMechanics = activeMechanics.filter((m) => !takenIds.has(m.id))
  const canAddMore = availableMechanics.length > 0

  const totalShare = parseFloat(mechanics.reduce((s, m) => s + m.sharePercent, 0).toFixed(2))
  const shareOk = Math.abs(totalShare - 100) < 0.02
  const shareOver = totalShare > 100.01

  const lineKomisi = mechanics.reduce((s, m) => {
    return s + calcKomisi(basis, m.sharePercent, getRate(m.mechanicId, categoryId, rates))
  }, 0)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleAddMechanic() {
    if (!canAddMore) return
    onChange(evenShareRedistribute(mechanics, availableMechanics[0].id))
  }

  function handleCycleAvatar(idx: number) {
    const curId = mechanics[idx].mechanicId
    const otherTaken = new Set(
      mechanics.filter((_, i) => i !== idx).map((m) => m.mechanicId).filter(Boolean) as string[],
    )
    const pool = activeMechanics.filter((m) => !otherTaken.has(m.id))
    if (pool.length <= 1) return
    const curPoolIdx = pool.findIndex((m) => m.id === curId)
    const nextId = pool[(curPoolIdx + 1) % pool.length].id
    onChange(mechanics.map((m, i) => (i === idx ? { ...m, mechanicId: nextId } : m)))
  }

  function handleShareChange(idx: number, raw: string) {
    const val = parseFloat(raw)
    const clamped = isNaN(val) ? 0 : Math.min(100, Math.max(0, parseFloat(val.toFixed(2))))
    onChange(mechanics.map((m, i) => (i === idx ? { ...m, sharePercent: clamped } : m)))
  }

  function handleDeleteRequest(idx: number) {
    if (mechanics.length <= 1) return
    const chip = mechanics[idx]
    const rate = getRate(chip.mechanicId, categoryId, rates)
    const komisi = calcKomisi(basis, chip.sharePercent, rate)
    if (chip.sharePercent > 10 || komisi > 0) {
      setConfirmDeleteIdx(idx)
    } else {
      onChange(proportionalRedistribute(mechanics, idx))
    }
  }

  function confirmDelete() {
    if (confirmDeleteIdx === null) return
    onChange(proportionalRedistribute(mechanics, confirmDeleteIdx))
    setConfirmDeleteIdx(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ marginTop: 2 }}>

      {/* ── Section header ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          Mekanik
        </div>
        {mechanics.length > 0 && (
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 4,
            background: shareOk
              ? 'var(--success-tint)'
              : shareOver ? 'var(--accent-tint)' : 'var(--warning-tint)',
            color: shareOk
              ? 'var(--success)'
              : shareOver ? 'var(--accent)' : 'var(--warning)',
          }}>
            Total share: {totalShare}%
          </div>
        )}
      </div>

      {/* ── Chip row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

        {mechanics.map((chip, idx) => {
          const mech = allMechanics.find((m) => m.id === chip.mechanicId)
          const rate = getRate(chip.mechanicId, categoryId, rates)
          const komisi = calcKomisi(basis, chip.sharePercent, rate)
          const rateIsZero = chip.mechanicId !== null && categoryId !== null && rate === 0
          const canCycle =
            activeMechanics.filter((m) =>
              !mechanics.filter((_, i) => i !== idx).some((o) => o.mechanicId === m.id),
            ).length > 1

          return (
            <div
              key={`${chip.mechanicId}-${idx}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px 4px 4px',
                background: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                fontSize: 12, fontWeight: 600,
              }}
            >
              {/* Avatar — click to cycle */}
              <button
                type="button"
                onClick={() => handleCycleAvatar(idx)}
                title={canCycle ? 'Klik untuk ganti mekanik' : 'Hanya 1 mekanik tersedia'}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: canCycle ? 'var(--text)' : 'var(--text-muted)',
                  color: '#fff', border: 'none',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'Anton, sans-serif', fontSize: 11,
                  cursor: canCycle ? 'pointer' : 'default',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >
                {mech ? getInitial(mech.name) : '?'}
              </button>

              {/* Name */}
              <span style={{ paddingRight: 2, color: 'var(--text)' }}>
                {mech?.name ?? '—'}
              </span>

              {/* Share input */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)',
              }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={chip.sharePercent}
                  onChange={(e) => handleShareChange(idx, e.target.value)}
                  style={{
                    width: 32, border: 'none', background: 'transparent',
                    padding: 0, fontFamily: 'var(--mono)', fontSize: 11,
                    fontWeight: 600, textAlign: 'right', outline: 'none',
                    color: 'var(--text)',
                  }}
                />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  %
                </span>
              </div>

              {/* Separator */}
              <span style={{ color: 'var(--border)', userSelect: 'none' }}>·</span>

              {/* Rate */}
              <span
                style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  color: rateIsZero ? 'var(--warning)' : 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  cursor: rateIsZero ? 'help' : 'default',
                }}
                title={
                  rateIsZero
                    ? `Rate ${mech?.name ?? ''} untuk kategori ini = 0%. Atur di Master Mekanik.`
                    : undefined
                }
              >
                {rate}%{rateIsZero ? ' ⚠' : ''}
              </span>

              {/* Komisi */}
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700,
                color: 'var(--accent)',
              }}>
                Rp {komisi.toLocaleString('id-ID')}
              </span>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDeleteRequest(idx)}
                disabled={mechanics.length <= 1}
                title={mechanics.length <= 1 ? 'Minimal 1 mekanik' : `Hapus ${mech?.name ?? ''}`}
                style={{
                  width: 18, height: 18, border: 'none', background: 'transparent',
                  color: mechanics.length <= 1 ? 'var(--border)' : 'var(--text-muted)',
                  cursor: mechanics.length <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: 14, lineHeight: 1, padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          )
        })}

        {/* Add mechanic button */}
        <button
          type="button"
          onClick={handleAddMechanic}
          disabled={!canAddMore}
          title={
            !canAddMore
              ? `Semua ${activeMechanics.length} mekanik aktif sudah dipilih. Tambah mekanik di Master Mekanik.`
              : 'Tambah mekanik ke line ini'
          }
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px',
            background: 'transparent',
            border: `1px dashed ${canAddMore ? 'var(--border-strong)' : 'var(--border)'}`,
            borderRadius: 999,
            fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '0.04em',
            color: canAddMore ? 'var(--text-muted)' : 'var(--border)',
            cursor: canAddMore ? 'pointer' : 'not-allowed',
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
          TAMBAH MEKANIK
        </button>
      </div>

      {/* ── Komisi line total ──────────────────────────────────────────────── */}
      {mechanics.length > 0 && (
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9.5,
            letterSpacing: '0.18em', color: 'var(--text-muted)',
          }}>
            KOMISI LINE
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
            color: 'var(--accent)', marginTop: 2,
          }}>
            Rp {lineKomisi.toLocaleString('id-ID')}
          </div>
        </div>
      )}

      {/* ── Confirm delete dialog ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDeleteIdx !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteIdx(null) }}
        title={`Hapus ${allMechanics.find((m) => m.id === mechanics[confirmDeleteIdx ?? 0]?.mechanicId)?.name ?? 'mekanik'}?`}
        message={`Share ${mechanics[confirmDeleteIdx ?? 0]?.sharePercent ?? 0}% akan didistribusikan ke chip lain secara proporsional.`}
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
