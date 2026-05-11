# NQ21 PERFORMANCE

Back-office tracking app untuk bengkel motor NQ21. Catat transaksi internal, hitung komisi mekanik mingguan, visibility cash flow.

**Live demo**: https://nq21.vercel.app

## Status

| Milestone | Status | Tag |
|-----------|--------|-----|
| M001 Foundation | ✅ | vM001 |
| M002 Master Data UI | ✅ | vM002 |
| M003 Transaksi UI | ✅ | vM003 |
| M004 Dashboard + Laporan | ✅ | vM004 |
| M005 Komisi & Slip | ✅ | vM005 |
| M007 PWA + Polish | ✅ | vM007 |
| M006 Backend Integration | ⏸ Deferred | — |

App saat ini **FE-only** (Zustand local state). M006 Backend (Hono + Neon + Drizzle) di-defer pending real user validation.

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Owner | `nanang` | `nanang` |
| Kasir | `sari` | `sari` |

## Stack

- **Frontend**: React 18 + Vite + TypeScript strict
- **UI**: Tailwind v3 + shadcn/ui + custom NQ21 design system
- **State**: Zustand (mock, localStorage persist)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa + Workbox (installable, offline static cache)

## Features

- Input transaksi MASUK/KELUAR multi-line dengan mekanik + komisi
- Bubut Luar dual-leg auto-create (income + vendor expense linked)
- Periode komisi mingguan — tutup periode, generate payout, slip print
- 4 Laporan: Per Kategori, Cash Flow, Jasa & Mekanik, Dyno
- Master data CRUD: Customer, Supplier, Kategori, Mekanik & Rate, User
- Command palette (Ctrl+K) global search
- PWA installable + offline mode

## Development

```bash
git clone https://github.com/adityap1098-cmd/nq21.git
cd nq21
npm install
npm run dev
```

Open http://localhost:5173

## Documentation

- `plan.md` — full spec + domain model + milestone plan
- `CLAUDE.md` — development rules + decision log
- `PROGRESS.md` — detailed task tracker + decisions per milestone
- `design/` — visual references (v1 + v2 design files)
- `docs/` — autopilot prompts (historical reference)
