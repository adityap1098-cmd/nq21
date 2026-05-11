import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import type { CommissionPeriod } from '@/store/types'
import type { PayoutComputed } from '@/store/selectors'
import { fmtPeriodFull, fmtRp, getInitial, FMT } from '../utils'

interface Props {
  open: boolean
  payout: PayoutComputed
  period: CommissionPeriod
  onClose: () => void
  onConfirm: (paidNotes?: string) => Promise<void>
}

export function MarkPaidDialog({ open, payout, period, onClose, onConfirm }: Props) {
  const [paidNotes, setPaidNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleConfirm() {
    setIsSaving(true)
    try {
      await onConfirm(paidNotes.trim() || undefined)
      setPaidNotes('')
    } finally {
      setIsSaving(false)
    }
  }

  function handleClose() {
    if (!isSaving) {
      setPaidNotes('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent style={{ maxWidth: 480, padding: '32px 36px' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '0.012em' }}>
            Tandai Pembayaran Komisi
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', marginTop: 4 }}>
            Konfirmasi pembayaran komisi untuk {payout.mechanicName}.
          </DialogDescription>
        </DialogHeader>

        {/* Info card */}
        <div style={{
          marginTop: 20, padding: '16px 18px', borderRadius: 8,
          background: 'var(--surface-alt)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Mechanic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--display)', fontSize: 18, flexShrink: 0,
            }}>
              {getInitial(payout.mechanicName)}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 15, letterSpacing: '0.012em' }}>
                {payout.mechanicName}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Mekanik
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>PERIODE</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fmtPeriodFull(period.weekStart, period.weekEnd)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>JUMLAH JASA</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{payout.totalJobs} jobs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>TOTAL BASIS</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fmtRp(payout.totalBasis)}</span>
            </div>
          </div>

          {/* Total komisi accent */}
          <div style={{
            borderTop: '1px dashed var(--border)', paddingTop: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
              TOTAL KOMISI
            </span>
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Rp</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '0.012em', color: 'var(--accent)' }}>
                {FMT.format(payout.totalKomisi)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes textarea */}
        <div style={{ marginTop: 16 }}>
          <label style={{
            display: 'block', fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 6,
          }}>
            CATATAN PEMBAYARAN (OPSIONAL)
          </label>
          <textarea
            value={paidNotes}
            onChange={e => setPaidNotes(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="Cth: Transfer BCA 11/05/2026 14:30, atau Cash diserahkan ke Doni di bengkel"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--surface)',
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)',
              resize: 'vertical', outline: 'none', lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
              Catatan akan tersimpan di audit log untuk referensi.
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-muted)' }}>
              {paidNotes.length}/200
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={handleClose}
            disabled={isSaving}
            style={{
              padding: '9px 16px', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            BATAL
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving}
            style={{
              padding: '9px 20px', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: 'var(--text)', border: '1px solid var(--text)',
              color: '#fff', cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.8 : 1,
            }}
          >
            {isSaving ? 'MENYIMPAN...' : 'TANDAI DIBAYAR'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
