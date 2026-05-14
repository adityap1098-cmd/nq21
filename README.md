# NQ21 PERFORMANCE

Back-office tracking app untuk bengkel motor NQ21. Catat transaksi, hitung komisi mekanik mingguan, visibility cash flow — multi-device, real-time sync.

**Live**: https://nq21.vercel.app

## Status

| Milestone | Status | Tag |
|-----------|--------|-----|
| M001 Foundation | ✅ | vM001 |
| M002 Master Data UI | ✅ | vM002 |
| M003 Transaksi UI | ✅ | vM003 |
| M004 Dashboard + Laporan | ✅ | vM004 |
| M005 Komisi & Slip | ✅ | vM005 |
| M007 PWA + Polish | ✅ | vM007 |
| M006-V2 Backend (Supabase) | ✅ | vM006-V2 |

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@nq21.app` | _(tanya admin)_ |
| Kasir | `kasir@nq21.app` | _(tanya admin)_ |

## Stack

- **Frontend**: React 18 + Vite + TypeScript strict
- **UI**: Tailwind v3 + shadcn/ui + custom NQ21 design system
- **Server state**: TanStack Query (v5)
- **Backend**: Supabase (PostgreSQL + Auth + RLS) — replaces Hono+Neon+Drizzle
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa + Workbox (installable, offline static cache)

## Features

- Input transaksi MASUK/KELUAR multi-line dengan mekanik + komisi
- Bubut Luar dual-leg auto-create (income + vendor expense linked, atomic)
- Periode komisi mingguan — tutup periode, generate payout, slip print PDF
- 4 Laporan: Per Kategori, Cash Flow, Jasa & Mekanik, Dyno
- Master data CRUD: Customer, Supplier, Kategori, Mekanik & Rate, User
- Dashboard KPI + Cash Flow chart (7/30/90 hari)
- Command palette (Ctrl+K) global search
- Multi-device real-time sync via Supabase
- Audit log per aksi (create/update/delete transaksi, close period, mark paid)
- PWA installable + offline static cache

## Development

```bash
git clone https://github.com/adityap1098-cmd/nq21.git
cd nq21
npm install
```

Buat `.env.local`:
```
VITE_SUPABASE_URL=https://nmbgprrueuxvrqrmmvmo.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key dari Supabase dashboard>
```

```bash
npm run dev
```

Open http://localhost:5173

Seed master data: jalankan `docs/M006-V2-seed.sql` di Supabase SQL Editor (idempotent, aman di-run ulang).

## Documentation

- `plan.md` — full spec + domain model + milestone plan
- `CLAUDE.md` — development rules + decision log (termasuk M006-V2 decisions)
- `PROGRESS.md` — detailed task tracker + migration coverage
- `docs/M006-V2-seed.sql` — seed SQL untuk categories + mechanics + commission rates
- `design/` — visual references (v1 + v2 design files)
