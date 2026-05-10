import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestPage() {
  return (
    <div className="p-8 bg-[var(--bg)] min-h-screen space-y-10">

      {/* Page Header Pattern */}
      <section>
        <div className="flex items-stretch gap-3.5 mb-2">
          <div className="accent-bar" />
          <div>
            <h1 className="page-title">NQ21 PERFORMANCE</h1>
            <p className="page-subtitle">Design system test — M001-T2</p>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="field-label">Button Variants</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="accent">Transaksi Baru</Button>
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="accent" size="sm">Accent SM</Button>
          <Button variant="accent" size="lg">Accent LG</Button>
          <Button variant="default" disabled>Disabled</Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="field-label">Badge Variants</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="income">MASUK</Badge>
          <Badge variant="expense">KELUAR</Badge>
          <Badge variant="cash">CASH</Badge>
          <Badge variant="tf">TRANSFER</Badge>
          <Badge variant="qris">QRIS</Badge>
          <Badge variant="paid">PAID</Badge>
          <Badge variant="pending">PENDING</Badge>
          <Badge variant="open">OPEN</Badge>
          <Badge variant="closed">CLOSED</Badge>
        </CardContent>
      </Card>

      {/* Filter Pills */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="field-label">Filter Pills</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <button className="filter-pill active">Semua</button>
          <button className="filter-pill">Income</button>
          <button className="filter-pill">Expense</button>
          <button className="filter-pill">Minggu Ini</button>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div>
        <span className="field-label block mb-3">KPI Cards</span>
        <div className="grid grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="kpi-label mb-3">Revenue Minggu Ini</div>
            <div className="kpi-value">Rp 12,4jt</div>
            <div className="text-xs text-[var(--text-muted)] mt-2">↑ 8% vs minggu lalu</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label mb-3">Total Komisi</div>
            <div className="kpi-value text-[var(--accent)]">Rp 2,1jt</div>
            <div className="text-xs text-[var(--text-muted)] mt-2">4 mekanik</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label mb-3">Pengeluaran</div>
            <div className="kpi-value">Rp 4,8jt</div>
            <div className="text-xs text-[var(--text-muted)] mt-2">7 transaksi</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label mb-3">Laba Kotor</div>
            <div className="kpi-value text-[var(--success)]">Rp 7,6jt</div>
            <div className="text-xs text-[var(--text-muted)] mt-2">Estimasi</div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="field-label">Typography</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="font-display text-4xl">Anton — Display Font (Workshop Ops)</div>
          <div className="font-body text-base">Manrope — Body font, regular 14px, line-height 1.45</div>
          <div className="font-mono text-sm">JetBrains Mono — TRX-20260510-001 · Rp 500.000</div>
          <div className="field-label">Field Label — 11px uppercase 0.08em tracking</div>
          <div className="kpi-label">KPI Label — 11px uppercase 0.1em tracking</div>
        </CardContent>
      </Card>

    </div>
  )
}
