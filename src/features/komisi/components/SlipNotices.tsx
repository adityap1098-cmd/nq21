import { fmtRp } from '../utils'

const BANNER_BASE: React.CSSProperties = {
  position: 'relative', zIndex: 1,
  padding: '10px 14px', marginBottom: 18, borderRadius: 6,
  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
}

/** Banner + watermark (both printed) for slips of a period that is not closed yet. */
export function DraftSlipNotice() {
  return (
    <>
      <div
        className="slip-draft-watermark"
        aria-hidden="true"
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(-24deg)',
          fontFamily: 'var(--display)', fontSize: 160, lineHeight: 1,
          color: 'rgba(200,16,46,0.08)', letterSpacing: '0.05em',
          pointerEvents: 'none', userSelect: 'none', zIndex: 0, whiteSpace: 'nowrap',
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}
      >
        DRAFT
      </div>
      <div
        className="slip-draft-banner"
        role="note"
        style={{ ...BANNER_BASE, border: '2px dashed var(--accent)', color: 'var(--accent)', background: 'rgba(200,16,46,0.06)' }}
      >
        DRAFT — PERIODE BELUM DITUTUP
        <span style={{ display: 'block', fontWeight: 400, fontSize: 10, marginTop: 2 }}>
          Angka masih bisa berubah. Jangan dipakai sebagai bukti pembayaran.
        </span>
      </div>
    </>
  )
}

interface DriftProps {
  storedKomisi: number
  liveKomisi: number
}

/** Closed period whose live recomputation no longer matches the stored payout. */
export function StoredTotalDriftNotice({ storedKomisi, liveKomisi }: DriftProps) {
  return (
    <div
      className="slip-drift-banner"
      role="alert"
      style={{ ...BANNER_BASE, border: '1px solid var(--warning)', color: 'var(--warning)', background: 'var(--warning-tint)' }}
    >
      ⚠ Rate/kategori berubah setelah periode ditutup — angka resmi: {fmtRp(storedKomisi)} (tersimpan)
      <span style={{ display: 'block', fontWeight: 400, fontSize: 10, marginTop: 2 }}>
        Rincian baris di bawah dihitung ulang dengan data sekarang (total {fmtRp(liveKomisi)}) dan hanya untuk referensi.
      </span>
    </div>
  )
}
