import { useEffect, useMemo, useState } from 'react'
import { useMechanics, useCommissionRates } from '@/features/mechanics/hooks'
import { useAuthStore } from '@/store/auth'
import { ConfirmDialog } from '@/components/nq21/ConfirmDialog'
import { toast } from '@/hooks/use-toast'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { useLastJasaMechanicIds } from '../lookups'
import { evenIntegerShares, proportionalIntegerShares } from '../utils'
import type { LineMechanic } from '../types'
import type { Mechanic, CommissionRate } from '@/features/mechanics/hooks'

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

function getMasterRate(
  mechanicId: string | null,
  categoryId: string | null,
  rates: CommissionRate[],
): number {
  if (!mechanicId || !categoryId) return 0
  return rates.find((r) => r.mechanic_id === mechanicId && r.category_id === categoryId)?.rate_percent ?? 0
}

function getEffectiveRate(chip: LineMechanic, categoryId: string | null, rates: CommissionRate[]): number {
  if (chip.rateOverride !== undefined) return chip.rateOverride
  return getMasterRate(chip.mechanicId, categoryId, rates)
}

function calcKomisi(basis: number, share: number, rate: number): number {
  return Math.round(basis * (share / 100) * (rate / 100))
}

/** Decision G: mechanics of the user's last jasa line (still active), else all active mechanics. */
function getDefaultMechanics(lastJasaIds: string[], activeMechanics: Mechanic[]): LineMechanic[] {
  const activeIds = new Set(activeMechanics.map((m) => m.id))
  const fromHistory = lastJasaIds.filter((id) => activeIds.has(id))
  const ids = fromHistory.length > 0 ? fromHistory : activeMechanics.map((m) => m.id)
  const shares = evenIntegerShares(ids.length)
  return ids.map((mechanicId, i) => ({ mechanicId, sharePercent: shares[i] }))
}

function evenShareRedistribute(existing: LineMechanic[], newMechanicId: string): LineMechanic[] {
  const all: LineMechanic[] = [...existing, { mechanicId: newMechanicId, sharePercent: 0 }]
  const shares = evenIntegerShares(all.length)
  return all.map((m, i) => ({ ...m, sharePercent: shares[i] }))
}

function proportionalRedistribute(existing: LineMechanic[], deleteIdx: number): LineMechanic[] {
  const remaining = existing.filter((_, i) => i !== deleteIdx)
  const shares = proportionalIntegerShares(remaining.map((m) => m.sharePercent))
  return remaining.map((m, i) => ({ ...m, sharePercent: shares[i] }))
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MechanicChipRowProps {
  // lineId reserved for T7 audit log
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
  // All mechanics (incl. inactive) so old lines still show who did the job;
  // only active ones can be picked, cycled to, or pre-filled.
  const { data: allMechanics = [], isSuccess: mechanicsReady } = useMechanics(true)
  const { user } = useAuthStore()
  // Commission rates and amounts are owner-only (RLS also hides commission_rates from kasir)
  const canSeeKomisi = user?.role === 'owner'
  const { data: rates = [] } = useCommissionRates({ enabled: canSeeKomisi })
  const lastJasa = useLastJasaMechanicIds(user?.id)
  const isMobile = useIsMobile()

  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null)
  const [editingRateIdx, setEditingRateIdx] = useState<number | null>(null)
  const [rateEditValue, setRateEditValue] = useState('')

  const activeMechanics = useMemo(() => allMechanics.filter((m) => m.is_active), [allMechanics])

  // Pre-fill only once both queries settled; a failed history lookup falls back to all active.
  const prefillReady = mechanicsReady && (lastJasa.isSuccess || lastJasa.isError || !user?.id)

  useEffect(() => {
    if (mechanics.length > 0 || !categoryId || !prefillReady) return
    const defaults = getDefaultMechanics(lastJasa.data ?? [], activeMechanics)
    if (defaults.length > 0) onChange(defaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, mechanics.length, prefillReady])

  // Derived
  const takenIds = new Set(mechanics.map((m) => m.mechanicId).filter(Boolean) as string[])
  const availableMechanics = activeMechanics.filter((m) => !takenIds.has(m.id))
  const canAddMore = availableMechanics.length > 0
  const multiMechanic = mechanics.length > 1

  const totalShare = mechanics.reduce((s, m) => s + m.sharePercent, 0)
  const shareOk = totalShare === 100
  const shareOver = totalShare > 100

  const lineKomisi = mechanics.reduce((s, m) => {
    return s + calcKomisi(basis, m.sharePercent, getEffectiveRate(m, categoryId, rates))
  }, 0)

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    const val = parseInt(raw, 10)
    const clamped = isNaN(val) ? 0 : Math.min(100, Math.max(0, val))
    onChange(mechanics.map((m, i) => (i === idx ? { ...m, sharePercent: clamped } : m)))
  }

  function handleDeleteRequest(idx: number) {
    if (mechanics.length <= 1) return
    const chip = mechanics[idx]
    const effectiveRate = getEffectiveRate(chip, categoryId, rates)
    const komisi = calcKomisi(basis, chip.sharePercent, effectiveRate)
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

  function startRateEdit(idx: number) {
    const masterRate = getMasterRate(mechanics[idx].mechanicId, categoryId, rates)
    const current = mechanics[idx].rateOverride ?? masterRate
    setEditingRateIdx(idx)
    setRateEditValue(String(current))
  }

  function commitRateEdit(idx: number) {
    const val = Number(rateEditValue)
    if (rateEditValue.trim() === '' || !Number.isInteger(val) || val < 0 || val > 100) {
      toast('Rate harus bilangan bulat 0–100%.', { variant: 'destructive', duration: 3000 })
      setEditingRateIdx(null)
      return
    }
    const masterRate = getMasterRate(mechanics[idx].mechanicId, categoryId, rates)
    const override = val === masterRate ? undefined : val
    onChange(mechanics.map((m, i) => (i === idx ? { ...m, rateOverride: override } : m)))
    setEditingRateIdx(null)
  }

  function resetRateOverride(idx: number) {
    onChange(mechanics.map((m, i) => (i === idx ? { ...m, rateOverride: undefined } : m)))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ marginTop: 2 }}>

      {/* ── Section header ──────────────────────────────────────────────────── */}
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

        {/* Share total badge — only when 2+ mechanics */}
        {multiMechanic && mechanics.length > 0 && (
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

      {/* ── Chip row ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

        {mechanics.map((chip, idx) => {
          const mech = allMechanics.find((m) => m.id === chip.mechanicId)
          const masterRate = getMasterRate(chip.mechanicId, categoryId, rates)
          const effectiveRate = getEffectiveRate(chip, categoryId, rates)
          const komisi = calcKomisi(basis, chip.sharePercent, effectiveRate)
          const hasOverride = chip.rateOverride !== undefined
          const rateIsZero = chip.mechanicId !== null && categoryId !== null && effectiveRate === 0
          const isEditingRate = editingRateIdx === idx
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
                // Phone: a full owner chip (share + rate + komisi) can be wider than the line card
                ...(isMobile && { maxWidth: '100%', flexWrap: 'wrap' as const, rowGap: 2, padding: '3px 6px 3px 3px', borderRadius: 22 }),
              }}
            >
              {/* Avatar */}
              <button
                type="button"
                onClick={() => handleCycleAvatar(idx)}
                title={canCycle ? 'Klik untuk ganti mekanik' : 'Hanya 1 mekanik tersedia'}
                style={{
                  width: isMobile ? 34 : 24, height: isMobile ? 34 : 24, borderRadius: '50%',
                  background: canCycle ? 'var(--text)' : 'var(--text-muted)',
                  color: '#fff', border: 'none',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'Anton, sans-serif', fontSize: isMobile ? 13 : 11,
                  cursor: canCycle ? 'pointer' : 'default',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >
                {mech ? getInitial(mech.name) : '?'}
              </button>

              {/* Name */}
              <span style={{ paddingRight: 2, color: 'var(--text)' }}>
                {mech?.name ?? '—'}
                {mech && !mech.is_active && (
                  <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                    (nonaktif)
                  </span>
                )}
              </span>

              {/* Share input — hidden when only 1 mechanic */}
              {multiMechanic && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 1,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '2px 4px', fontFamily: 'var(--mono)',
                }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={chip.sharePercent}
                    onChange={(e) => handleShareChange(idx, e.target.value)}
                    style={{
                      width: isMobile ? 40 : 32, border: 'none', background: 'transparent',
                      padding: 0, fontFamily: 'var(--mono)', fontSize: isMobile ? 16 : 11,
                      fontWeight: 600, textAlign: 'right', outline: 'none',
                      color: 'var(--text)',
                    }}
                  />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>%</span>
                </div>
              )}

              {/* Rate + komisi: owner only (kasir must not see or override commission) */}
              {canSeeKomisi && (<>
              {/* Separator */}
              <span style={{ color: 'var(--border)', userSelect: 'none' }}>·</span>

              {/* Rate display — editing / override / normal */}
              {isEditingRate ? (
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={rateEditValue}
                  autoFocus
                  onChange={(e) => setRateEditValue(e.target.value)}
                  onBlur={() => commitRateEdit(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRateEdit(idx)
                    if (e.key === 'Escape') setEditingRateIdx(null)
                  }}
                  style={{
                    width: isMobile ? 52 : 38, border: '1px solid var(--accent)', borderRadius: 4,
                    background: 'var(--surface)', padding: '1px 4px',
                    fontFamily: 'var(--mono)', fontSize: isMobile ? 16 : 11, fontWeight: 600,
                    textAlign: 'right', outline: 'none', color: 'var(--accent)',
                  }}
                />
              ) : hasOverride ? (
                <span
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                  title={`Rate override aktif. Klik untuk reset ke default ${masterRate}%.`}
                >
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: 'var(--text-muted)', textDecoration: 'line-through',
                    letterSpacing: '0.04em',
                  }}>
                    {masterRate}%
                  </span>
                  <button
                    type="button"
                    onClick={() => resetRateOverride(idx)}
                    style={{
                      fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                      color: 'var(--accent)', background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0, letterSpacing: '0.04em',
                      ...(isMobile && { minWidth: 32, minHeight: 32 }),
                    }}
                  >
                    {chip.rateOverride}%
                  </button>
                  <span style={{ fontSize: 9, color: 'var(--accent)', opacity: 0.7 }}>↩</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
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
                    {masterRate}%{rateIsZero ? ' ⚠' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => startRateEdit(idx)}
                    title="Override rate untuk transaksi ini"
                    style={{
                      fontSize: isMobile ? 13 : 9, background: 'none', border: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer', padding: 0,
                      lineHeight: 1, opacity: 0.6,
                      ...(isMobile && { minWidth: 32, minHeight: 32 }),
                    }}
                  >
                    ✏
                  </button>
                </span>
              )}

              {/* Komisi */}
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700,
                color: 'var(--accent)',
              }}>
                Rp {komisi.toLocaleString('id-ID')}
              </span>
              </>)}

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDeleteRequest(idx)}
                disabled={mechanics.length <= 1}
                title={mechanics.length <= 1 ? 'Minimal 1 mekanik' : `Hapus ${mech?.name ?? ''}`}
                style={{
                  width: isMobile ? 34 : 18, height: isMobile ? 34 : 18, border: 'none', background: 'transparent',
                  color: mechanics.length <= 1 ? 'var(--border)' : 'var(--text-muted)',
                  cursor: mechanics.length <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? 18 : 14, lineHeight: 1, padding: 0,
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
            padding: '4px 10px', background: 'transparent',
            border: `1px dashed ${canAddMore ? 'var(--border-strong)' : 'var(--border)'}`,
            borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600,
            letterSpacing: '0.04em',
            color: canAddMore ? 'var(--text-muted)' : 'var(--border)',
            cursor: canAddMore ? 'pointer' : 'not-allowed',
            ...(isMobile && { height: 42, padding: '0 14px' }),
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
          TAMBAH MEKANIK
        </button>
      </div>

      {/* ── Komisi line total ────────────────────────────────────────────────── */}
      {canSeeKomisi && mechanics.length > 0 && (
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

      {/* ── Confirm delete dialog ────────────────────────────────────────────── */}
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
