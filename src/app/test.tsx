// @ts-nocheck — dev test page, unused imports intentional
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
import {
  PageHeader, KpiCard, Section, EmptyState,
  FormField, FilterPillGroup, PeriodSelector,
  CurrencyDisplay, DateDisplay, ConfirmDialog, AvatarStack,
} from '@/components/nq21'
import { toast } from '@/hooks/use-toast'
import { Wrench, Users, TrendingUp, AlertCircle } from 'lucide-react'

export default function TestPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [period, setPeriod] = useState('week')
  const [filter, setFilter] = useState('semua')

  const MECHANICS = [
    { name: 'Budi', initial: 'B' },
    { name: 'Agus', initial: 'A' },
    { name: 'Joko', initial: 'J' },
    { name: 'Doni', initial: 'D' },
    { name: 'Riko', initial: 'R' },
  ]

  return (
    <div className="p-8 bg-[var(--bg)] min-h-screen space-y-10 max-w-[1400px]">

      {/* ── PageHeader ─────────────────────────────── */}
      <PageHeader
        title="NQ21 PERFORMANCE"
        subtitle="Design system test — M001-T4"
        action={<Button variant="accent">Transaksi Baru</Button>}
      />

      <Separator />

      {/* ── KPI Cards ──────────────────────────────── */}
      <Section title="KPI Cards" subtitle="4-column grid">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            label="Pendapatan Minggu Ini"
            value={<CurrencyDisplay value={28790000} size="lg" />}
            change={{ value: '+12.4%', up: true, context: 'vs minggu lalu' }}
            icon={<TrendingUp size={14} />}
          />
          <KpiCard
            label="Pengeluaran"
            value={<CurrencyDisplay value={9220000} size="lg" />}
            change={{ value: '+3.1%', up: false, context: 'vs minggu lalu' }}
            icon={<AlertCircle size={14} />}
          />
          <KpiCard
            label="Laba Kotor"
            value={<CurrencyDisplay value={19570000} size="lg" />}
            change={{ value: '+18.2%', up: true, context: 'vs minggu lalu' }}
            icon={<TrendingUp size={14} />}
          />
          <KpiCard
            label="Komisi Pending"
            value={<CurrencyDisplay value={2185000} size="lg" />}
            change={{ value: '4 mekanik', up: true, context: 'periode aktif' }}
            icon={<Wrench size={14} />}
            accent
          />
        </div>
      </Section>

      {/* ── Filter Pills + Period Selector ─────────── */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">Filter Pills + Period Selector</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="field-label">FilterPillGroup:</span>
            <FilterPillGroup
              options={[
                { label: 'Semua', value: 'semua' },
                { label: 'Income', value: 'income' },
                { label: 'Expense', value: 'expense' },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="field-label">PeriodSelector:</span>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        </CardContent>
      </Card>

      {/* ── FormField ──────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">FormField Wrapper</span></CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <FormField label="No. Referensi" htmlFor="noref" required>
            <Input id="noref" placeholder="TRX-20260510-001" className="font-mono" />
          </FormField>
          <FormField label="Kategori" helper="Pilih dari master kategori">
            <Select>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="jasa">Jasa</SelectItem>
                <SelectItem value="oli">Oli</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Nominal" error="Nominal harus lebih dari 0" htmlFor="nominal">
            <Input id="nominal" placeholder="0" className="font-mono" />
          </FormField>
        </CardContent>
      </Card>

      {/* ── Currency + Date Display ─────────────────── */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">CurrencyDisplay + DateDisplay</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-8 items-baseline flex-wrap">
            <div><span className="field-label block mb-2">SM</span><CurrencyDisplay value={500000} size="sm" /></div>
            <div><span className="field-label block mb-2">MD</span><CurrencyDisplay value={1750000} size="md" /></div>
            <div><span className="field-label block mb-2">LG</span><CurrencyDisplay value={28790000} size="lg" /></div>
          </div>
          <Separator />
          <div className="flex gap-8 items-center flex-wrap">
            <div><span className="field-label block mb-2">Short</span><DateDisplay value="2026-05-10" format="short" /></div>
            <div><span className="field-label block mb-2">Long</span><DateDisplay value="2026-05-10" format="long" /></div>
            <div><span className="field-label block mb-2">Datetime</span><DateDisplay value="2026-05-10T08:30:00" format="datetime" /></div>
            <div><span className="field-label block mb-2">Invalid</span><DateDisplay value="invalid" /></div>
          </div>
        </CardContent>
      </Card>

      {/* ── AvatarStack ─────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">AvatarStack</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="field-label">Compact (max 4):</span>
            <AvatarStack items={MECHANICS} max={4} />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="field-label">With names:</span>
            <AvatarStack items={MECHANICS.slice(0, 3)} showNames />
          </div>
        </CardContent>
      </Card>

      {/* ── EmptyState ──────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">EmptyState</span></CardTitle></CardHeader>
        <CardContent>
          <EmptyState
            icon={<Users size={32} />}
            message="Belum ada transaksi untuk periode ini."
            action={<Button variant="accent" size="sm">Input Transaksi</Button>}
          />
        </CardContent>
      </Card>

      {/* ── ConfirmDialog + Toast ───────────────────── */}
      <Card>
        <CardHeader><CardTitle><span className="field-label">ConfirmDialog + Toast</span></CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Buka Confirm (Destructive)
          </Button>
          <Button variant="default" onClick={() => toast('Transaksi disimpan', { variant: 'success', description: 'TRX-20260510-001 berhasil.' })}>
            Toast Success
          </Button>
          <Button variant="ghost" onClick={() => toast('Gagal menyimpan', { variant: 'destructive', description: 'Periksa koneksi.' })}>
            Toast Error
          </Button>
          <Button variant="ghost" onClick={() => toast('Catatan', { description: 'Perubahan belum disimpan.' })}>
            Toast Default
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Transaksi"
        message="Transaksi TRX-20260510-001 akan dihapus permanen. Aksi ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() => toast('Transaksi dihapus', { variant: 'destructive' })}
      />

      <Separator />

      {/* ── Existing shadcn components ──────────────── */}
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
