import type { PayoutLine } from '@/store/selectors'
import type { CommissionRate } from '@/store/types'
import { fmtShortDate, shortenNoRef, FMT } from '../utils'

interface Props {
  lines: PayoutLine[]
  mechanicId: string
  rates: CommissionRate[]
  isPeriodClosed?: boolean
}

const fmtN = (n: number) => `Rp ${FMT.format(n)}`

const TH_STYLE = (right?: boolean): React.CSSProperties => ({
  textAlign: right ? 'right' : 'left',
  fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.16em',
  textTransform: 'uppercase', color: 'var(--text-muted)',
  padding: '10px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600,
})

const TD_STYLE = (right?: boolean, last?: boolean): React.CSSProperties => ({
  padding: '11px 8px',
  borderBottom: last ? 'none' : '1px dashed var(--border)',
  verticalAlign: 'middle' as const,
  textAlign: right ? 'right' : 'left',
})

export function SlipTable({ lines, mechanicId, rates, isPeriodClosed }: Props) {
  if (lines.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
        {isPeriodClosed
          ? 'Detail baris tersimpan saat periode ditutup — rekap komisi tetap valid.'
          : 'Belum ada transaksi jasa di periode ini.'}
      </div>
    )
  }

  return (
    <table className="slip-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          <th style={TH_STYLE()}>TGL</th>
          <th style={TH_STYLE()}>NO REFERENSI</th>
          <th style={TH_STYLE()}>CUSTOMER</th>
          <th style={TH_STYLE()}>KATEGORI</th>
          <th className="text-right" style={TH_STYLE(true)}>NOMINAL</th>
          <th className="text-right" style={TH_STYLE(true)}>MATERIAL</th>
          <th className="text-right" style={TH_STYLE(true)}>BASIS</th>
          <th className="text-center" style={TH_STYLE(true)}>SHARE</th>
          <th className="text-center" style={TH_STYLE(true)}>RATE</th>
          <th className="text-right" style={TH_STYLE(true)}>KOMISI</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, idx) => {
          const isLast = idx === lines.length - 1
          const masterRate = line.rateOverride !== undefined
            ? rates.find(r => r.mechanicId === mechanicId && r.categoryId === line.categoryId)?.ratePercent
            : undefined
          const hasOverride = line.rateOverride !== undefined
            && masterRate !== undefined
            && masterRate !== line.rate

          return (
            <tr
              key={`${line.transactionId}-${line.categoryId}-${idx}`}
              style={{
                background: line.isBackdated ? 'rgba(184,110,0,0.04)' : 'transparent',
                borderLeft: line.isBackdated ? '3px solid var(--warning)' : undefined,
              }}
            >
              {/* TGL */}
              <td className="col-tgl" style={TD_STYLE(false, isLast)}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {fmtShortDate(line.tgl)}
                  {line.isBackdated && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', marginLeft: 4,
                      padding: '1px 4px', borderRadius: 3,
                      fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700,
                      background: 'var(--warning-tint)', color: 'var(--warning)',
                      letterSpacing: '0.06em',
                    }}>
                      BDTD
                    </span>
                  )}
                </span>
              </td>

              {/* NO REFERENSI — full on screen, short on print */}
              <td style={{ ...TD_STYLE(false, isLast), fontFamily: 'var(--mono)', fontSize: 11 }}>
                <span className="col-noref-full">{line.noReferensi}</span>
                <span className="col-noref-short" style={{ fontFamily: 'var(--mono)' }}>{shortenNoRef(line.noReferensi)}</span>
              </td>

              {/* CUSTOMER */}
              <td className="col-customer" style={{ ...TD_STYLE(false, isLast), maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line.customerName}
                {line.customerMotor && (
                  <span className="meta-motor" style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>
                    ({line.customerMotor})
                  </span>
                )}
              </td>

              {/* KATEGORI */}
              <td className="col-kategori" style={TD_STYLE(false, isLast)}>
                <span style={{
                  display: 'inline-block', padding: '2px 6px', borderRadius: 3,
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                  background: 'var(--surface-alt)', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {line.categoryName}
                </span>
                {line.itemName && (
                  <div className="item-name" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {line.itemName}
                  </div>
                )}
              </td>

              {/* NOMINAL */}
              <td className="col-mono text-right" style={{ ...TD_STYLE(true, isLast), fontFamily: 'var(--mono)', textAlign: 'right' }}>
                {fmtN(line.nominal)}
              </td>

              {/* MATERIAL */}
              <td className="col-mono text-right" style={{ ...TD_STYLE(true, isLast), fontFamily: 'var(--mono)', color: 'var(--text-muted)', textAlign: 'right' }}>
                −{fmtN(line.biayaMaterial)}
              </td>

              {/* BASIS */}
              <td className="col-mono text-right" style={{ ...TD_STYLE(true, isLast), fontFamily: 'var(--mono)', fontWeight: 600, textAlign: 'right' }}>
                {fmtN(line.basis)}
              </td>

              {/* SHARE */}
              <td className="col-mono text-center" style={{ ...TD_STYLE(true, isLast), fontFamily: 'var(--mono)', textAlign: 'right' }}>
                {line.sharePercent}%
              </td>

              {/* RATE */}
              <td className="col-mono text-center" style={{ ...TD_STYLE(true, isLast), fontFamily: 'var(--mono)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                {hasOverride ? (
                  <>
                    <span className="rate-override-old" style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: 4 }}>
                      {masterRate}%
                    </span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{line.rate}%</span>
                  </>
                ) : (
                  `${line.rate}%`
                )}
              </td>

              {/* KOMISI */}
              <td className="col-mono col-komisi text-right" style={{ ...TD_STYLE(true, isLast), fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', textAlign: 'right' }}>
                {fmtN(line.komisi)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
