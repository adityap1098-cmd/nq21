import { useMemo } from 'react'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelector } from '@/components/nq21/PeriodSelector'
import { useTransactionStore } from '@/store/transactions'
import { useCategoryStore } from '@/store/master/categories'
import { getReportPerKategori, type KategoriReport } from '@/store/selectors'
import { exportCSV, fmtRupiah, fmtDate } from '@/lib/csv'
import { usePeriodFilter } from '@/lib/hooks/usePeriodFilter'

const _fmt = new Intl.NumberFormat('id-ID')

function fmtRp(n: number) {
  return `Rp ${_fmt.format(n)}`
}

function csvDateSlug(dateStr: string): string {
  // "2026-05-04" → "04mei2026"
  const MONTHS = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des']
  const [y, m, d] = dateStr.split('-')
  return `${d}${MONTHS[parseInt(m) - 1]}${y}`
}

// ── Panel ─────────────────────────────────────────────────────────────────────

function Panel({
  title,
  tag,
  tagIcon,
  total,
  rows,
  totalTrx,
  tint,
  totalColor,
  emptyMsg,
}: {
  title: string
  tag: string
  tagIcon: string
  total: number
  rows: KategoriReport[]
  totalTrx: number
  tint: string
  totalColor: string
  emptyMsg: string
}) {
  const showHint = rows.length > 0 && rows.length < 5
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        minHeight: 380,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Section head */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              background: tint,
              opacity: 0.9,
              fontSize: 10,
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: totalColor,
            }}
          >
            {tagIcon} {tag}
          </span>
          <span
            style={{
              fontFamily: 'var(--display)',
              fontSize: 16,
              letterSpacing: '0.04em',
              color: 'var(--text)',
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            TOTAL
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: totalColor }}>
            {fmtRp(total)}
          </div>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {emptyMsg}
        </div>
      ) : (
        <div style={{ flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 12px 8px 20px', textAlign: 'left', width: 28 }}>#</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                KATEGORI
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                JML TRX
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                NOMINAL
              </th>
              <th style={{ padding: '8px 20px 8px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.categoryId}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
              >
                <td style={{ padding: '10px 12px 10px 20px', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                  {i + 1}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: tint, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.categoryName}</div>
                      {row.isJasa && (
                        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', letterSpacing: '0.08em' }}>
                          JASA · KOMISI AKTIF
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {row.transactionCount}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', position: 'relative', overflow: 'hidden', minWidth: 140 }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${row.percentage}%`,
                      background: tint,
                      opacity: 0.12,
                    }}
                  />
                  <span style={{ position: 'relative', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>
                    {fmtRp(row.totalNominal)}
                  </span>
                </td>
                <td style={{ padding: '10px 20px 10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {row.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
            {/* Grand total row */}
            <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
              <td style={{ padding: '10px 12px 10px 20px' }} />
              <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em' }}>
                GRAND TOTAL
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                {totalTrx}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: totalColor }}>
                {fmtRp(total)}
              </td>
              <td style={{ padding: '10px 20px 10px 12px' }} />
            </tr>
            {showHint && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '10px 20px 14px',
                    textAlign: 'center',
                    fontSize: 11,
                    fontStyle: 'italic',
                    color: 'var(--text-muted)',
                    opacity: 0.6,
                  }}
                >
                  Tidak ada kategori lain di periode ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LaporanKategoriPage() {
  const { transactions, lines } = useTransactionStore()
  const { categories } = useCategoryStore()
  const { preset, range, setPreset } = usePeriodFilter('week')

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, { name: c.name, type: c.type, isJasa: c.isJasa }])),
    [categories],
  )

  const report = useMemo(
    () => getReportPerKategori(transactions, lines, range, categoryMap),
    [transactions, lines, range, categoryMap],
  )

  const { income, expense, summary } = report
  const totalTrxIncome = income.reduce((s, r) => s + r.transactionCount, 0)
  const totalTrxExpense = expense.reduce((s, r) => s + r.transactionCount, 0)
  const isEmpty = income.length === 0 && expense.length === 0

  function handleExport() {
    type ExportRow = {
      tipe: string
      kategori: string
      jasa: string
      trx: string
      nominal: string
      pct: string
    }
    const allRows: ExportRow[] = [
      ...income.map((r) => ({
        tipe: 'INCOME',
        kategori: r.categoryName,
        jasa: r.isJasa ? 'Ya' : 'Tidak',
        trx: String(r.transactionCount),
        nominal: fmtRupiah(r.totalNominal),
        pct: r.percentage.toFixed(1),
      })),
      ...expense.map((r) => ({
        tipe: 'EXPENSE',
        kategori: r.categoryName,
        jasa: r.isJasa ? 'Ya' : 'Tidak',
        trx: String(r.transactionCount),
        nominal: fmtRupiah(r.totalNominal),
        pct: r.percentage.toFixed(1),
      })),
    ]
    exportCSV(
      allRows,
      [
        { key: 'tipe',     label: 'TIPE' },
        { key: 'kategori', label: 'KATEGORI' },
        { key: 'jasa',     label: 'IS JASA' },
        { key: 'trx',      label: 'JML TRX' },
        { key: 'nominal',  label: 'NOMINAL (RP)' },
        { key: 'pct',      label: '% DARI TOTAL' },
      ],
      `nq21-laporan-kategori-${csvDateSlug(range.start)}-${csvDateSlug(range.end)}`,
    )
  }

  const labaPositif = summary.labaKotor >= 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <PageHeader
        title="Per Kategori"
        subtitle={`LAPORAN #1 · Pendapatan & pengeluaran per kategori · ${fmtDate(range.start)} – ${fmtDate(range.end)}`}
        action={
          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'var(--text)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            ↓ EXPORT CSV
          </button>
        }
      />

      {/* Period filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          PERIODE
        </span>
        <PeriodSelector value={preset} onChange={(v) => setPreset(v as 'today' | 'week' | 'month' | 'custom')} />
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
          {fmtDate(range.start)} → {fmtDate(range.end)}
        </span>
      </div>

      {/* Global empty state */}
      {isEmpty ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 32px',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
            Belum Ada Transaksi
          </div>
          <div style={{ fontSize: 13 }}>Tidak ada transaksi pada periode ini.</div>
        </div>
      ) : (
        <>
          {/* Split panels — CSS grid stretch keeps both panels equal height */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <Panel
              title="PENDAPATAN"
              tag="INCOME"
              tagIcon="▲"
              total={summary.totalIncome}
              rows={income}
              totalTrx={totalTrxIncome}
              tint="var(--text)"
              totalColor="var(--success, #16a34a)"
              emptyMsg="Tidak ada pendapatan pada periode ini."
            />
            <Panel
              title="PENGELUARAN"
              tag="EXPENSE"
              tagIcon="▼"
              total={summary.totalExpense}
              rows={expense}
              totalTrx={totalTrxExpense}
              tint="var(--accent)"
              totalColor="var(--accent)"
              emptyMsg="Tidak ada pengeluaran pada periode ini."
            />
          </div>

          {/* Profit banner */}
          <div
            style={{
              background: 'var(--text)',
              color: 'var(--bg)',
              borderRadius: 8,
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 32,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.15em', opacity: 0.55, marginBottom: 4 }}>
                SELISIH · LABA KOTOR
              </div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '0.04em' }}>
                {labaPositif ? 'Profit Periode Ini' : 'Defisit Periode Ini'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  + {fmtRp(summary.totalIncome)}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', opacity: 0.5, marginTop: 2 }}>
                  PENDAPATAN
                </div>
              </div>
              <div style={{ opacity: 0.3, fontSize: 18 }}>−</div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'rgba(255,100,100,0.9)' }}>
                  − {fmtRp(summary.totalExpense)}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', opacity: 0.5, marginTop: 2 }}>
                  PENGELUARAN
                </div>
              </div>
              <div style={{ opacity: 0.3, fontSize: 18 }}>=</div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 32 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: labaPositif ? '#4ade80' : 'rgba(255,100,100,0.9)' }}>
                  {labaPositif ? '+' : '−'} {fmtRp(Math.abs(summary.labaKotor))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
