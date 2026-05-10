import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="p-8 bg-[var(--bg)] min-h-screen space-y-8 max-w-[1400px]">

      {/* Page Header Pattern */}
      <div className="flex items-stretch gap-3.5">
        <div className="accent-bar" />
        <div>
          <h1 className="page-title">NQ21 PERFORMANCE</h1>
          <p className="page-subtitle">Design system test — M001-T2.5</p>
        </div>
      </div>

      <Separator />

      {/* Buttons */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Button Variants</span></CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="accent">Transaksi Baru</Button>
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="accent" size="sm">Accent SM</Button>
          <Button variant="accent" size="lg">Accent LG</Button>
          <Button variant="default" disabled>Disabled</Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Badge Variants</span></CardTitle></CardHeader>
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

      {/* Filter Pills + Avatar row */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Filter Pills + Avatar</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button className="filter-pill active">Semua</button>
            <button className="filter-pill">Income</button>
            <button className="filter-pill">Expense</button>
            <button className="filter-pill">Minggu Ini</button>
          </div>
          <div className="flex items-center gap-3">
            {['B', 'A', 'J', 'D'].map((initial) => (
              <div key={initial} className="flex items-center gap-2">
                <Avatar>
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">Mekanik {initial}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Tabs</span></CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="income">
            <TabsList>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="semua">Semua</TabsTrigger>
            </TabsList>
            <TabsContent value="income" className="mt-4 text-sm text-[var(--text-secondary)]">
              Transaksi income period ini.
            </TabsContent>
            <TabsContent value="expense" className="mt-4 text-sm text-[var(--text-secondary)]">
              Transaksi expense period ini.
            </TabsContent>
            <TabsContent value="semua" className="mt-4 text-sm text-[var(--text-secondary)]">
              Semua transaksi.
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form elements */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Form Elements</span></CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="field-label" htmlFor="noref">No. Referensi</Label>
            <Input id="noref" placeholder="TRX-20260510-001" className="font-mono" />
          </div>
          <div>
            <Label className="field-label" htmlFor="kategori">Kategori</Label>
            <Select>
              <SelectTrigger id="kategori">
                <SelectValue placeholder="Pilih kategori..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jasa">Jasa</SelectItem>
                <SelectItem value="oli">Oli</SelectItem>
                <SelectItem value="dyno">Dyno</SelectItem>
                <SelectItem value="sparepart">Sparepart</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Dialog</span></CardTitle></CardHeader>
        <CardContent>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Buka Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Konfirmasi Hapus</DialogTitle>
                <DialogDescription>
                  Transaksi ini akan dihapus permanen. Lanjutkan?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button variant="accent" onClick={() => setDialogOpen(false)}>Hapus</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div>
        <span className="field-label block mb-3">KPI Cards</span>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Revenue Minggu Ini', value: 'Rp 12,4jt', sub: '↑ 8% vs minggu lalu', color: '' },
            { label: 'Total Komisi', value: 'Rp 2,1jt', sub: '4 mekanik', color: 'text-[var(--accent)]' },
            { label: 'Pengeluaran', value: 'Rp 4,8jt', sub: '7 transaksi', color: '' },
            { label: 'Laba Kotor', value: 'Rp 7,6jt', sub: 'Estimasi', color: 'text-[var(--success)]' },
          ].map((kpi) => (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-label mb-3">{kpi.label}</div>
              <div className={`kpi-value ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-2">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Typography</span></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="font-display text-4xl">Anton — Display Font</div>
          <div className="font-body text-base">Manrope — Body 14px / 1.45</div>
          <div className="font-mono text-sm">JetBrains Mono — TRX-20260510-001 · Rp 500.000</div>
          <Separator />
          <div className="field-label">Field Label — 11px uppercase 0.08em</div>
          <div className="kpi-label">KPI Label — 11px uppercase 0.1em</div>
        </CardContent>
      </Card>

    </div>
  )
}
