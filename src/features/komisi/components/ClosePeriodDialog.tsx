import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import type { CommissionPeriod } from '@/store/types'
import type { PayoutComputed } from '@/store/selectors'
import { fmtPeriodFull, fmtRp, getInitial, FMT } from '../utils'

interface Props {
  open: boolean
  period: CommissionPeriod
  payouts: PayoutComputed[]
  onClose: () => void
  onConfirm: () => Promise<void>
}

function nextWeekRange(weekEnd: string): string {
  const [y, m, d] = weekEnd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const nextStart = new Date(date)
  nextStart.setDate(date.getDate() + 1)
  const nextEnd = new Date(date)
  nextEnd.setDate(date.getDate() + 7)
  const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
  return `${fmt(nextStart)}–${fmt(nextEnd)} ${nextEnd.getFullYear()}`
}

export function ClosePeriodDialog({ open, period, payouts, onClose, onConfirm }: Props) {
  const [isClosing, setIsClosing] = useState(false)

  const totalJobs = payouts.reduce((a, p) => a + p.totalJobs, 0)
  const totalBasis = payouts.reduce((a, p) => a + p.totalBasis, 0)
  const totalKomisi = payouts.reduce((a, p) => a + p.totalKomisi, 0)
  const backdatedCount = payouts.flatMap(p => p.lines).filter(l => l.isBackdated).length
  const nextRange = nextWeekRange(period.weekEnd)

  async function handleConfirm() {
    setIsClosing(true)
    try {
      await onConfirm()
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !isClosing) onClose() }}>
      <DialogContent style={{ maxWidth: 560, padding: '32px 36px' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '0.012em' }}>
            Tutup Periode {fmtPeriodFull(period.weekStart, period.weekEnd)}?
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', marginTop: 4 }}>
            Setelah ditutup, periode TIDAK BISA dibuka kembali. Komisi mekanik akan di-generate sebagai slip bagi hasil.
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan komisi */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.16em',
            color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700,
          }}>
            RINGKASAN KOMISI YANG AKAN DI-GENERATE
          </div>

          <div style={{
            border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 600 }}>MEKANIK</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 600 }}>JOBS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 600 }}>BASIS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 600 }}>KOMISI</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr key={p.mechanicId} style={{ borderTop: i === 0 ? '1px solid var(--border)' : '1px dashed var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--accent)', color: '#fff',
                          display: 'grid', placeItems: 'center',
                          fontFamily: 'var(--display)', fontSize: 14, flexShrink: 0,
                        }}>
                          {getInitial(p.mechanicName)}
                        </div>
                        <span style={{ fontFamily: 'var(--display)', fontSize: 13 }}>{p.mechanicName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {p.totalJobs}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {fmtRp(p.totalBasis)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                      {fmtRp(p.totalKomisi)}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ borderTop: '2px solid var(--text)', background: 'var(--surface-alt)' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', fontWeight: 700 }}>
                    TOTAL — {payouts.length} MEKANIK
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>
                    {totalJobs}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>
                    {fmtRp(totalBasis)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--display)', fontSize: 16, color: 'var(--accent)' }}>
                    Rp {FMT.format(totalKomisi)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Backdated warning */}
        {backdatedCount > 0 && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 6,
            background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.2)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{
              display: 'inline-block', padding: '1px 6px', borderRadius: 3,
              fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700,
              background: 'var(--accent)', color: '#fff', letterSpacing: '0.08em', flexShrink: 0,
            }}>
              BACKDATED ENTRIES
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
              {backdatedCount} jasa terdeteksi backdated — komisi tetap dibayarkan.
            </span>
          </div>
        )}

        {/* Warning cards */}
        <div style={{
          marginTop: 12, padding: '12px 14px', borderRadius: 6,
          background: 'var(--warning-tint)', border: '1px solid rgba(184,110,0,0.25)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--warning)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span>⚠</span>
            <span>Pastikan semua transaksi minggu ini sudah ter-input</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--warning)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span>⚠</span>
            <span>Periode baru ({nextRange}) akan otomatis dibuat</span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--warning)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span>⚠</span>
            <span>Audit log akan di-track</span>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            onClick={onClose}
            disabled={isClosing}
            style={{
              padding: '9px 16px', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: isClosing ? 'not-allowed' : 'pointer',
              opacity: isClosing ? 0.5 : 1,
            }}
          >
            BATAL
          </button>
          <button
            onClick={handleConfirm}
            disabled={isClosing}
            style={{
              padding: '9px 20px', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: 'var(--accent)', border: '1px solid var(--accent)',
              color: '#fff', cursor: isClosing ? 'not-allowed' : 'pointer',
              opacity: isClosing ? 0.8 : 1,
            }}
          >
            {isClosing ? 'MENUTUP...' : 'TUTUP PERIODE'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
