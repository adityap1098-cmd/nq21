# NQ21 PERFORMANCE — Progress Tracker

---

## Status Saat Ini

**Milestone aktif**: M001 — Design Foundation
**Phase**: FE-only (M001-M005)
**Last updated**: 2026-05-10

---

## Pre-M001: Setup Visual Reference ✅

- [x] Fetch design bundle dari Anthropic Design (2026-05-10)
- [x] Save bundle ke `design/` folder
- [x] Compare bundle vs plan.md Section 12 — reported ke user
- [x] User confirm decisions: badge 10px/0.04em, CSS font vars, sidebar light, body defaults
- [x] Update plan.md Section 12 dengan refinements bundle
- [x] Update CLAUDE.md: hybrid visual reference (bundle + demo.html)
- [x] Fix demo.html badge letter-spacing 0.06em → 0.04em

**Visual reference strategy (LOCKED):**
- `design/project/NQ21 Performance.html` → Login, Dashboard, 4 Laporan
- `demo.html` → Input Transaksi, Master Data, Komisi
- Design tokens unified dari bundle

---

## M001 — Design Foundation

**DoD**: App shell jalan, navigation antar halaman berfungsi, login mock redirect ke dashboard OK.

### Tasks

- [x] **M001-T1**: Project scaffold — React + Vite + TypeScript strict + Tailwind v3 + shadcn/ui init
- [x] **M001-T2**: Design system base — utility classes, Button/Badge/Card/Input NQ21 tokens, test page
- [x] **M001-T3**: App shell — sidebar 240px persistent + topbar 64px sticky + React Router 18 routes
  > Sidebar: brand glyph, 5 nav sections (UTAMA/TRANSAKSI/LAPORAN/KOMISI/MASTER), active states, footer
  > Topbar: crumb, search bar, period pill, bell, CTA button
  > router.tsx: all 18 routes with placeholder pages
- [x] **M001-T4**: Component library dasar — 11 custom NQ21 components + toast system
  > `src/components/nq21/`: PageHeader, KpiCard, Section, EmptyState, FormField, FilterPillGroup, PeriodSelector, CurrencyDisplay, DateDisplay, ConfirmDialog, AvatarStack
  > `src/hooks/use-toast.ts` + `src/components/ui/toaster.tsx` — module-level toast store, Toaster wired ke Layout
  > test.tsx updated — visual sanity check semua component di `/test`
- [x] **M001-T5**: Login page + auth polish
  > Visual ref: `design/project/NQ21 Performance.html` (seksi: Login)
  > T5.1: demo creds box wrapped in `import.meta.env.DEV` (absent in prod bundle ✅)
  > T5.1: `/login` redirect ke `/` saat sudah logged in ✅
  > T5.1: sessionStorage persist confirmed (`nq21-auth`), logout → user null ✅
  > Layout: split grid `1.05fr / 0.95fr`, min-height 100vh
  > Left panel: dark bg (`--text`), brand mark centered, tagline, version stamp
  > Right panel: form — username + password + submit button + error state
  > Form: React Hook Form + Zod (username required, password min 4)
  > Mock auth: hardcoded `{ owner: 'nanang', kasir: 'sari' }` → redirect `/dashboard`
  > Route `/login` sudah ada di router.tsx, tinggal implement komponen
- [ ] **M001-T6**: Dashboard skeleton
  > Visual ref: `design/project/NQ21 Performance.html` (seksi: Dashboard)
  > KPI block (4 cards): Pendapatan, Pengeluaran, Laba Kotor, Komisi Pending
  > Cash Flow chart (Recharts bar): in vs out, 7 hari, filter 7H/30H/90H
  > Top Kategori panel: rank list dengan bar track
  > Recent Transactions panel: tabel 5 baris, badge MASUK/KELUAR
  > Periode Komisi panel: card per periode + mekanik mini grid
  > Semua pakai hardcoded mock data (Zustand store belum di-setup, pakai const lokal dulu)
- [ ] **M001-T7**: Zustand store setup
  > File: `src/store/` — 1 store per domain
  > `useTransactionStore` — mock transactions + lines + line_mechanics
  > `useMechanicStore` — mock mechanics + commission_rates
  > `useCategoryStore` — mock categories (semua default income + expense)
  > `useCustomerStore` — mock customers (5-10 entries)
  > `useSupplierStore` — mock suppliers (5 entries)
  > `usePeriodStore` — mock commission periods (1 open + 1 closed)
  > Mirror schema plan.md Section 2 — tipe dari `src/features/transactions/schema.ts`
  > Setelah store jalan: replace hardcoded mock data di Dashboard (T6) dengan store
- ~~**M001-T8**~~: _(merged into T3 — React Router setup selesai di T3)_

### Blockers
_(none)_

### Notes
- T4 praktis done — cuma tinggal ToastProvider wiring (minor, bisa inline di T5 atau T6)
- T5 dan T6 independent, bisa dikerjain dalam urutan apapun
- T7 sebaiknya setelah T6 supaya store bisa langsung dipakai replace mock di dashboard

---

## M002 — Master Data UI ⏳

Tasks akan di-breakdown saat M001 selesai.

**Halaman**: Master Customer, Supplier, Kategori, Mekanik & Rate, User/Akun
**Visual ref**: `demo.html`

---

## M003 — Transaksi UI ⏳

Tasks akan di-breakdown saat M002 selesai.

**Visual ref**: `demo.html`

---

## M004 — Laporan & Dashboard UI ⏳

Tasks akan di-breakdown saat M003 selesai.

**Visual ref**: `design/project/NQ21 Performance.html` (seksi: Dashboard + Laporan #1–#4)

---

## M005 — Komisi UI ⏳

Tasks akan di-breakdown saat M004 selesai.

**Visual ref**: `demo.html`

---

## Milestone History

_(kosong — belum ada milestone yang selesai)_
