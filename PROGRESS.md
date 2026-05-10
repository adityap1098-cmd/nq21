# NQ21 PERFORMANCE — Progress Tracker

---

## Status Saat Ini

**Milestone aktif**: M002 — Master Data UI
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
- [x] **M001-T6**: Dashboard skeleton
  > Visual ref: `design/project/NQ21 Performance.html` (seksi: Dashboard)
  > KPI block (4 cards): Pendapatan, Pengeluaran, Laba Kotor, Komisi Pending
  > Cash Flow chart (Recharts bar): in vs out, 7 hari, filter 7H/30H/90H
  > Top Kategori panel: rank list dengan bar track
  > Recent Transactions panel: tabel 5 baris, badge MASUK/KELUAR
  > Periode Komisi panel: card per periode + mekanik mini grid
  > Semua pakai hardcoded mock data (Zustand store belum di-setup, pakai const lokal dulu)
- [x] **M001-T7**: Zustand store setup + Dashboard integration
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

### M001 COMPLETE ✅ — 2026-05-10
Semua task M001 selesai. Dashboard render live dari Zustand stores.
KPI verified: Pendapatan 28.79jt ✅ Pengeluaran 9.22jt ✅ Laba Kotor 19.57jt ✅ Komisi 2.19jt ✅

**Commits**: T3 `248e8fc` · T6 `86b07fc` · T7 `4cbe77e` · closer (pending)
**Tag**: vM001 (pending commit)

**Key decisions locked (plan.md Section 13):**
- `no_referensi` format: `TRX-YYYYMMDD-NNN` (income) / `EXP-YYYYMMDD-NNN` (expense), counter per-hari
- Mekanik awal: **Doni** — 1 mekanik, rates: Jasa 30% · Dyno 25% · Bubut Luar 20% · Bubut Dalam 40%
- Logo mark: "N" 36×36px, bg `--text` hitam, teks Anton 18px putih, strip 3px `var(--accent)` bawah, corner-radius 6
- Target resolusi: 1920×1080 minimum (sweet spot), support down to 1440×900 graceful degradation
- Input device: Kasir keyboard+mouse (density tinggi) · Owner touchscreen-aware, tap target min 44px di Dashboard/Laporan/Komisi
- Kategori Gaji: no supplier_id, aman (internal expense)
- Export PDF: gen client-side via browser print (`window.print()`), scope M005
- Periode komisi: default Senin–Minggu (sudah terkonfirmasi)

**Formula komisi (verified):**
`basis = nominal − biayaMaterial; komisi = Math.round(basis × (share/100) × (rate/100))`
Test case: 200k − 50k = 150k × 100% × 30% = **Rp 45.000 ✅**

---

## M002 — Master Data UI ⏳

**Halaman**: Master Customer, Supplier, Kategori, Mekanik & Rate, User/Akun
**Visual ref**: `demo.html` (Mekanik ✅ full page · Customer/Supplier/Kategori/User → derive dari general NQ21 table pattern)
**DoD**: Semua 5 master CRUD jalan dengan mock data, persisten di Zustand, routes live (bukan PlaceholderPage)

### Tasks

- [ ] **M002-T1**: Generic `MasterCRUDPage` shell component
  > `src/features/master/components/MasterCRUDPage.tsx`
  > Props: title, subtitle, CTA label, columns config, data[], renderRow, AddForm, EditForm
  > Shell: PageHeader + "Tambah" CTA button + search input (client filter) + NQ21 table + EmptyState
  > `AddEditDialog` wrapper: Dialog + form slot, controlled open/close
  > Foundation untuk T2-T6 supaya nggak duplikasi layout

- [ ] **M002-T2**: Master Mekanik & Rate ⭐
  > Visual ref: `demo.html` page-mekanik (full design tersedia)
  > Table: Avatar initial + Nama + rate matrix 4 kolom (Jasa/Dyno/Bubut Luar/Bubut Dalam) + Status badge + ⋯ menu
  > Rate matrix: setiap cell = `<input>` inline, blur → `upsertRate()` ke store
  > "Tambah Mekanik" dialog: name field saja (rates mulai 0, diisi inline)
  > Deactivate: softDelete → badge AKTIF/NONAKTIF toggle
  > Komisi formula callout card (formula explanation + contoh Rp45.000)
  > Store: `useMechanicStore`

- [ ] **M002-T3**: Master Customer
  > Table: Nama, Tipe Motor (opsional, italic), Notes snippet, Tgl masuk
  > Add/Edit dialog: name (required), motorType (optional), notes (optional)
  > Search client-side by name
  > Store: `useCustomerStore`

- [ ] **M002-T4**: Master Supplier
  > Table: Nama, Phone, badge VENDOR BUBUT (if isVendorBubut), Notes
  > Add/Edit dialog: name (required), phone (optional), isVendorBubut toggle, notes (optional)
  > Search by name
  > Store: `useSupplierStore`

- [ ] **M002-T5**: Master Kategori
  > Table: Nama, Tipe badge (MASUK/KELUAR), Jasa indicator dot, Status AKTIF badge
  > Add dialog: name, type toggle (income/expense), isJasa checkbox (visible only if income)
  > Soft delete: isActive toggle via ⋯ menu
  > Guard: kategori default (seeded) tidak bisa dihapus (display-only lock)
  > Store: `useCategoryStore`

- [ ] **M002-T6**: Master User/Akun
  > Owner-only: if role !== 'owner' → EmptyState "Akses Terbatas"
  > Table: Nama, Username (mono), Role badge (OWNER/KASIR), Status AKTIF badge
  > Add dialog: name, username, role select, password (mock plaintext FE-only)
  > Edit: name + role only (no password edit UI M002)
  > Store: `useUserStore`

- [ ] **M002-T7**: Route wiring + DoD verify
  > Update `router.tsx`: swap PlaceholderPage → actual components untuk 5 master routes
  > Manual test: CRUD flow (add → edit → deactivate) tiap halaman
  > Screenshot tiap halaman
  > Commit + update PROGRESS.md

### Blockers
- **Bundle v2** (design/v2/): URL `api.anthropic.com/v1/design/h/uEsF1DGyXKvCuNAECenGCA` → 404 (requires auth).
  Customer/Supplier/Kategori/User pages tidak ada visual ref eksplisit → derive dari demo.html general table + NQ21 component patterns. **Action needed: user share bundle v2 file atau konfirmasi derive-only OK.**

### Notes
- Stores untuk semua 5 entity sudah exist di `src/store/master/` (tinggal wire ke UI)
- T1 harus selesai sebelum T2-T6 (dependency)
- T2-T6 independent setelah T1 selesai — bisa dikerjain berurutan atau paralel
- `motorType` di CustomerStore dan `isVendorBubut` di SupplierStore = FE extension, belum di plan.md Section 2 DB schema — flag untuk konfirmasi M006

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
