import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/nq21/PageHeader'
import { PeriodSelector } from '@/components/nq21/PeriodSelector'
import { exportCSV, fmtRupiah, fmtDate, fmtPercent } from '@/lib/csv'
import { usePeriodFilter } from '@/lib/hooks/usePeriodFilter'
import { useTransactionsWithLines } from '@/features/transactions/hooks'
import type { TransactionWithLines } from '@/features/transactions/hooks'
import { useMechanics, useCommissionRates } from '@/features/mechanics/hooks'
import type { CommissionRate } from '@/features/mechanics/hooks'
import { useCategories } from '@/features/categories/hooks'

const _fmt = new Intl.NumberFormat('id-ID')
const fmtRp = (n: number) => `Rp ${_fmt.format(n)}`

function fmtShortDate(iso: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const [, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`
}

function csvDateSlug(dateStr: string): string {
  const MONTHS = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des']
  const [y, m, d] = dateStr.split('-')
  return `${d}${MONTHS[parseInt(m) - 1]}${y}`
}

// ── Local types ───────────────────────────────────────────────────────────────

interface MechDetail {
  mechanicId: string
  mechanicName: string
  sharePercent: number
  rate: number
  rateOverride: number | undefined
  effectiveRate: number
  komisi: number
}

interface JasaDetailLine {
  transactionId: string
  noReferensi: string
  tgl: string
  customerName: string
  customerMotor: string | null | undefined
  categoryId: string
  categoryName: string
  itemName: string | null | undefined
  nominal: number
  biayaMaterial: number
  basis: number
  mechanics: MechDetail[]
  totalKomisi: number
}

interface MekanikJasaStats {
  mechanicId: string
  mechanicName: string
  isActive: boolean
  jobsCount: number
  totalBasis: number
  totalKomisi: number
  uniqueCategories: number
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MechAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent)', color: '#fff',
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--display)', fontSize: Math.round(size * 0.42),
      flexShrink: 0, letterSpacing: 0,
    }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

function MechanicKpiCard({ stat, isActive: isActiveFilter, isInactive, onClick }: {
  stat: MekanikJasaStats
  isActive: boolean
  isInactive: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isActiveFilter ? 'rgba(220,38,38,0.04)' : 'var(--surface)',
        border: `1px solid ${isActiveFilter ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8, padding: '14px 16px',
        cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <MechAvatar name={stat.mechanicName} size={38} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stat.mechanicName}
          </div>
          <span style={{
            display: 'inline-block', marginTop: 2, padding: '1px 6px', borderRadius: 3,
            fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em',
            background: isInactive ? 'var(--surface-alt)' : 'rgba(22,163,74,0.12)',
            color: isInactive ? 'var(--text-muted)' : '#16a34a',
          }}>
            {isInactive ? 'NONAKTIF' : 'AKTIF'}
          </span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 22, lineHeight: 1.1 }}>{stat.jobsCount}</div>
          <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>JASA</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600 }}>{fmtRp(stat.totalBasis)}</div>
          <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>BASIS</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{fmtRp(stat.totalKomisi)}</div>
          <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>KOMISI</div>
        </div>
      </div>
    </div>
  )
}

function MechStack({ line }: { line: JasaDetailLine }) {
  const multi = line.mechanics.length > 1
  return (
    <div>
      {line.mechanics.map((m, i) => (
        <div key={m.mechanicId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: i > 0 ? '3px 0 0' : '0', flexWrap: 'nowrap' }}>
          <MechAvatar name={m.mechanicName} size={18} />
          <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{m.mechanicName}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>{m.sharePercent}%</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)' }}>
            {m.rateOverride !== undefined ? (
              <>
                <s style={{ marginRight: 2 }}>{m.rate}%</s>
                <span style={{ color: 'var(--accent)' }}>{m.effectiveRate}%</span>
                <span title="Rate override aktif" style={{ marginLeft: 2, cursor: 'help' }}>⚠</span>
              </>
            ) : (
              <>{m.effectiveRate}%</>
            )}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginLeft: 2 }}>
            {fmtRp(m.komisi)}
          </span>
        </div>
      ))}
      {multi && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 3 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>∑ {fmtRp(line.totalKomisi)}</span>
        </div>
      )}
    </div>
  )
}

// ── Computation ───────────────────────────────────────────────────────────────

function computeJasaReport(
  txsWithLines: TransactionWithLines[],
  rates: CommissionRate[],
  filters?: { mechanicIds?: string[]; categoryIds?: string[] },
) {
  const safeTxs = txsWithLines
  const safeRates = rates

  const detailLines: JasaDetailLine[] = []
  const mechStats: Record<string, { totalBasis: number; totalKomisi: number; jobsCount: number; categoryIds: Set<string> }> = {}

  for (const tx of safeTxs) {
    for (const line of tx.transaction_lines) {
      const cat = line.categories
      if (!cat?.is_jasa) continue
      if (filters?.categoryIds?.length && !filters.categoryIds.includes(cat.id)) continue

      const lms = line.transaction_line_mechanics
      if (filters?.mechanicIds?.length) {
        const hasMatch = lms.some(lm => filters.mechanicIds!.includes(lm.mechanic_id))
        if (!hasMatch) continue
      }

      const basis = line.nominal - line.biaya_material

      const mechDetails: MechDetail[] = lms.map(lm => {
        const masterRate = safeRates.find(r => r.mechanic_id === lm.mechanic_id && r.category_id === cat.id)?.rate_percent ?? 0
        const rateOverride = lm.rate_override !== null ? lm.rate_override : undefined
        const effectiveRate = rateOverride !== undefined ? rateOverride : masterRate
        const komisi = Math.round(basis * (lm.share_percent / 100) * (effectiveRate / 100))
        const mechBasis = Math.round(basis * (lm.share_percent / 100))

        if (!mechStats[lm.mechanic_id]) {
          mechStats[lm.mechanic_id] = { totalBasis: 0, totalKomisi: 0, jobsCount: 0, categoryIds: new Set() }
        }
        mechStats[lm.mechanic_id].totalBasis += mechBasis
        mechStats[lm.mechanic_id].totalKomisi += komisi
        mechStats[lm.mechanic_id].jobsCount += 1
        mechStats[lm.mechanic_id].categoryIds.add(cat.id)

        return {
          mechanicId: lm.mechanic_id,
          mechanicName: lm.mechanics?.name ?? lm.mechanic_id,
          sharePercent: lm.share_percent,
          rate: masterRate,
          rateOverride,
          effectiveRate,
          komisi,
        }
      })

      detailLines.push({
        transactionId: tx.id,
        noReferensi: tx.no_referensi,
        tgl: tx.tgl,
        customerName: tx.customer?.name ?? '—',
        customerMotor: tx.customer?.motor_type,
        categoryId: cat.id,
        categoryName: cat.name,
        itemName: line.item_name,
        nominal: line.nominal,
        biayaMaterial: line.biaya_material,
        basis,
        mechanics: mechDetails,
        totalKomisi: mechDetails.reduce((s, m) => s + m.komisi, 0),
      })
    }
  }

  detailLines.sort((a, b) => b.tgl.localeCompare(a.tgl))

  const perMekanik: MekanikJasaStats[] = Object.entries(mechStats)
    .map(([mechanicId, s]) => {
      const name = safeTxs
        .flatMap(t => t.transaction_lines)
        .flatMap(l => l.transaction_line_mechanics)
        .find(lm => lm.mechanic_id === mechanicId)?.mechanics?.name ?? mechanicId
      return {
        mechanicId,
        mechanicName: name,
        isActive: true,
        jobsCount: s.jobsCount,
        totalBasis: s.totalBasis,
        totalKomisi: s.totalKomisi,
        uniqueCategories: s.categoryIds.size,
      }
    })
    .sort((a, b) => b.totalKomisi - a.totalKomisi)

  const totalBasis = perMekanik.reduce((s, m) => s + m.totalBasis, 0)
  const totalKomisi = perMekanik.reduce((s, m) => s + m.totalKomisi, 0)
  const totalJobs = detailLines.length

  return {
    perMekanik,
    detailLines,
    summary: { totalJobs, totalBasis, totalKomisi, avgKomisiPerJob: totalJobs > 0 ? Math.round(totalKomisi / totalJobs) : 0 },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LaporanJasaPage() {
  const navigate = useNavigate()
  const { preset, range, setPreset } = usePeriodFilter('week')
  const [mechanicFilter, setMechanicFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])

  const { data: txsWithLines = [], isLoading } = useTransactionsWithLines({ dateFrom: range.start, dateTo: range.end, tipe: 'income' })
  const { data: rates = [] } = useCommissionRates()
  const { data: mechanics = [] } = useMechanics(true)
  const { data: allCategories = [] } = useCategories()

  const jasaCategories = useMemo(() => allCategories.filter(c => c.is_jasa && c.type === 'income'), [allCategories])
  const mechanicMap = useMemo(() => Object.fromEntries(mechanics.map(m => [m.id, m])), [mechanics])

  const allReport = useMemo(
    () => computeJasaReport(txsWithLines, rates),
    [txsWithLines, rates],
  )

  const filteredReport = useMemo(
    () => mechanicFilter.length === 0 && categoryFilter.length === 0
      ? allReport
      : computeJasaReport(txsWithLines, rates, {
          mechanicIds: mechanicFilter.length > 0 ? mechanicFilter : undefined,
          categoryIds: categoryFilter.length > 0 ? categoryFilter : undefined,
        }),
    [txsWithLines, rates, mechanicFilter, categoryFilter, allReport],
  )

  const kpiMechanics = useMemo(() => {
    const statMap = Object.fromEntries(allReport.perMekanik.map(s => [s.mechanicId, s]))
    return mechanics.map(m => {
      const stat = statMap[m.id]
      if (stat) return { ...stat, isActive: m.is_active }
      return { mechanicId: m.id, mechanicName: m.name, isActive: m.is_active, jobsCount: 0, totalBasis: 0, totalKomisi: 0, uniqueCategories: 0 }
    })
  }, [mechanics, allReport.perMekanik])

  function toggleMechanic(id: string) {
    setMechanicFilter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleCategory(id: string) {
    setCategoryFilter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function resetFilters() { setMechanicFilter([]); setCategoryFilter([]) }

  const hasFilters = mechanicFilter.length > 0 || categoryFilter.length > 0
  const { detailLines, summary } = filteredReport

  function emptyMsg(): string {
    if (mechanicFilter.length > 0 && categoryFilter.length === 0) {
      const names = mechanicFilter.map(id => mechanicMap[id]?.name ?? id).join(', ')
      return `Mekanik ${names} belum ada transaksi jasa di periode ini.`
    }
    if (categoryFilter.length > 0 && mechanicFilter.length === 0) return 'Tidak ada jasa di kategori yang dipilih.'
    if (hasFilters) return 'Tidak ada transaksi jasa yang cocok dengan filter.'
    return 'Belum ada jasa mekanik di periode ini.'
  }

  function handleExport() {
    type ExRow = Record<string, unknown>
    const rows: ExRow[] = detailLines.flatMap(line =>
      line.mechanics.map(m => ({
        tgl: line.tgl,
        noReferensi: line.noReferensi,
        customer: line.customerName,
        kategori: line.categoryName,
        itemName: line.itemName ?? '',
        nominal: fmtRupiah(line.nominal),
        biayaMaterial: fmtRupiah(line.biayaMaterial),
        basis: fmtRupiah(line.basis),
        mekanik: m.mechanicName,
        share: fmtPercent(m.sharePercent),
        rate: fmtPercent(m.effectiveRate),
        isOverride: m.rateOverride !== undefined ? 'YA' : '',
        komisi: fmtRupiah(m.komisi),
      })),
    )
    exportCSV(
      rows,
      [
        { key: 'tgl',           label: 'Tanggal',             format: (v) => fmtDate(String(v)) },
        { key: 'noReferensi',   label: 'No Referensi' },
        { key: 'customer',      label: 'Customer' },
        { key: 'kategori',      label: 'Kategori' },
        { key: 'itemName',      label: 'Detail Jasa' },
        { key: 'nominal',       label: 'Nominal (Rp)' },
        { key: 'biayaMaterial', label: 'Biaya Material (Rp)' },
        { key: 'basis',         label: 'Basis (Rp)' },
        { key: 'mekanik',       label: 'Mekanik' },
        { key: 'share',         label: 'Share %' },
        { key: 'rate',          label: 'Rate %' },
        { key: 'isOverride',    label: 'Override' },
        { key: 'komisi',        label: 'Komisi (Rp)' },
      ],
      `nq21-laporan-jasa-${csvDateSlug(range.start)}-${csvDateSlug(range.end)}`,
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280 }}>
      <PageHeader
        title="Jasa & Mekanik"
        subtitle={`LAPORAN #3 · Rincian jasa dengan basis komisi dan distribusi per mekanik · ${fmtDate(range.start)} – ${fmtDate(range.end)}`}
        action={
          <button
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}
          >
            ↓ EXPORT CSV
          </button>
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>PERIODE</span>
        <PeriodSelector value={preset} onChange={(v) => setPreset(v as typeof preset)} />
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
          {fmtDate(range.start)} → {fmtDate(range.end)}
        </span>
      </div>

      {/* Mekanik KPI cards */}
      {kpiMechanics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpiMechanics.length, 4)}, 1fr)`, gap: 12, marginBottom: 16 }}>
          {kpiMechanics.map(stat => (
            <MechanicKpiCard
              key={stat.mechanicId}
              stat={stat}
              isActive={mechanicFilter.includes(stat.mechanicId)}
              isInactive={!mechanicMap[stat.mechanicId]?.is_active}
              onClick={() => toggleMechanic(stat.mechanicId)}
            />
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>MEKANIK</span>
          <div style={{ display: 'inline-flex', background: 'var(--surface-alt)', borderRadius: 6, padding: 3, gap: 2 }}>
            <button onClick={() => setMechanicFilter([])} style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 4, border: 'none', background: mechanicFilter.length === 0 ? 'var(--text)' : 'transparent', color: mechanicFilter.length === 0 ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>Semua</button>
            {kpiMechanics.map(stat => {
              const active = mechanicFilter.includes(stat.mechanicId)
              return (
                <button key={stat.mechanicId} onClick={() => toggleMechanic(stat.mechanicId)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '4px 8px', borderRadius: 4, border: 'none', background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.3)' : 'var(--border)', display: 'grid', placeItems: 'center', fontSize: 8, fontFamily: 'var(--display)', color: active ? '#fff' : 'var(--text-muted)' }}>
                    {stat.mechanicName[0]}
                  </div>
                  {stat.mechanicName}
                  <span style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)', padding: '0 4px', borderRadius: 3, fontSize: 9 }}>{stat.jobsCount}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>KATEGORI</span>
          <div style={{ display: 'inline-flex', background: 'var(--surface-alt)', borderRadius: 6, padding: 3, gap: 2 }}>
            <button onClick={() => setCategoryFilter([])} style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 4, border: 'none', background: categoryFilter.length === 0 ? 'var(--text)' : 'transparent', color: categoryFilter.length === 0 ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>Semua</button>
            {jasaCategories.map(cat => {
              const active = categoryFilter.includes(cat.id)
              return (
                <button key={cat.id} onClick={() => toggleCategory(cat.id)} style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 4, border: 'none', background: active ? 'var(--text)' : 'transparent', color: active ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}>
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {hasFilters && (
          <button onClick={resetFilters} style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer' }}>
            ↺ Reset Filter
          </button>
        )}
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'TOTAL JOBS',     value: summary.totalJobs.toString(), mono: false, accent: false },
          { label: 'TOTAL BASIS',    value: fmtRp(summary.totalBasis),    mono: true,  accent: false },
          { label: 'TOTAL KOMISI',   value: fmtRp(summary.totalKomisi),   mono: true,  accent: true  },
          { label: 'AVG KOMISI/JOB', value: fmtRp(summary.avgKomisiPerJob), mono: true, accent: false },
        ].map(({ label, value, mono, accent }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: mono ? 'var(--mono)' : 'var(--display)', fontSize: mono ? 14 : 26, fontWeight: mono ? 700 : undefined, color: accent ? 'var(--accent)' : 'var(--text)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 14, letterSpacing: '0.04em' }}>RINCIAN JASA</span>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--surface-alt)', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
            {detailLines.length} LINE
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat data...</div>
        ) : detailLines.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔧</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Belum Ada Data Jasa</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>{emptyMsg()}</div>
            {hasFilters ? (
              <button onClick={resetFilters} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)' }}>↺ Reset Filter</button>
            ) : (
              <button onClick={() => navigate('/transaksi/baru')} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700 }}>+ Input Transaksi Jasa</button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['TGL · REF', 'CUSTOMER', 'KATEGORI', 'NOMINAL', 'MATERIAL', 'BASIS', 'MEKANIK · SHARE · KOMISI'].map(h => (
                    <th key={h} style={{ padding: h === 'TGL · REF' ? '10px 12px 10px 20px' : '10px 12px', textAlign: ['NOMINAL','MATERIAL','BASIS'].includes(h) ? 'right' : 'left', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailLines.map(line => (
                  <tr
                    key={`${line.transactionId}-${line.categoryId}`}
                    onClick={() => navigate(`/transaksi/${line.transactionId}`)}
                    style={{ borderBottom: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <td style={{ padding: '10px 12px 10px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtShortDate(line.tgl)}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{line.noReferensi}</div>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 160 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.customerName}</div>
                      {line.customerMotor && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{line.customerMotor}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, background: 'var(--surface-alt)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600 }}>{line.categoryName}</span>
                      {line.itemName && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{line.itemName}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtRp(line.nominal)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {line.biayaMaterial > 0 ? `− ${fmtRp(line.biayaMaterial)}` : <span style={{ opacity: 0.3 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtRp(line.basis)}</td>
                    <td style={{ padding: '10px 12px' }}><MechStack line={line} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)', borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px 10px 20px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 700 }} colSpan={3}>GRAND TOTAL · {detailLines.length} LINE</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{fmtRp(detailLines.reduce((s, l) => s + l.nominal, 0))}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>{fmtRp(detailLines.reduce((s, l) => s + l.biayaMaterial, 0))}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{fmtRp(summary.totalBasis)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmtRp(summary.totalKomisi)} <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>KOMISI</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
