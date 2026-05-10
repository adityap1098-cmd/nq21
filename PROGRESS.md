# NQ21 PERFORMANCE — Progress Tracker

---

## Status Saat Ini

**Milestone aktif**: M003 — Transaksi UI
**Phase**: FE-only (M001-M005)
**Last updated**: 2026-05-11

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

- [x] **M002-T1**: Generic `MasterCRUDPage` shell component
  > `src/features/master/components/MasterCRUDPage.tsx`
  > Props: title, subtitle, CTA label, columns config, data[], renderRow, AddForm, EditForm
  > Shell: PageHeader + "Tambah" CTA button + search input (client filter) + NQ21 table + EmptyState
  > `AddEditDialog` wrapper: Dialog + form slot, controlled open/close
  > Foundation untuk T2-T6 supaya nggak duplikasi layout

- [x] **M002-T2**: Master Mekanik & Rate ⭐
  > Visual ref: `demo.html` page-mekanik (full design tersedia)
  > Table: Avatar initial + Nama + rate matrix 4 kolom (Jasa/Dyno/Bubut Luar/Bubut Dalam) + Status badge + ⋯ menu
  > Rate matrix: setiap cell = `<input>` inline, blur → `upsertRate()` ke store
  > "Tambah Mekanik" dialog: name field saja (rates mulai 0, diisi inline)
  > Deactivate: softDelete → badge AKTIF/NONAKTIF toggle
  > Komisi formula callout card (formula explanation + contoh Rp45.000)
  > Store: `useMechanicStore`

- [x] **M002-T3**: Master Customer
  > Table: Nama, Tipe Motor (opsional, italic), Notes snippet, Tgl masuk
  > Add/Edit dialog: name (required), motorType (optional), notes (optional)
  > Search client-side by name
  > Store: `useCustomerStore`

- [x] **M002-T4**: Master Supplier
  > Table: Nama, Phone, badge VENDOR BUBUT (if isVendorBubut), Notes
  > Add/Edit dialog: name (required), phone (optional), isVendorBubut toggle, notes (optional)
  > Search by name
  > Store: `useSupplierStore`

- [x] **M002-T5**: Master Kategori
  > Table: Nama, Tipe badge (MASUK/KELUAR), Jasa indicator dot, Status AKTIF badge
  > Add dialog: name, type toggle (income/expense), isJasa checkbox (visible only if income)
  > Soft delete: isActive toggle via ⋯ menu
  > Guard: kategori default (seeded) tidak bisa dihapus (display-only lock)
  > Store: `useCategoryStore`

- [x] **M002-T6**: Master User/Akun
  > Owner-only: if role !== 'owner' → EmptyState "Akses Terbatas"
  > Table: Nama, Username (mono), Role badge (OWNER/KASIR), Status AKTIF badge
  > Add dialog: name, username, role select, password (mock plaintext FE-only)
  > Edit: name + role only (no password edit UI M002)
  > Store: `useUserStore`

- [x] **M002-T7**: Route wiring + DoD verify
  > Update `router.tsx`: swap PlaceholderPage → actual components untuk 5 master routes
  > Manual test: CRUD flow (add → edit → deactivate) tiap halaman
  > Screenshot tiap halaman
  > Commit + update PROGRESS.md

### Blockers
_(none — bundle v2 resolved via manual placement di design/v2/)_

### Notes
- Stores untuk semua 5 entity sudah exist di `src/store/master/` (tinggal wire ke UI)
- T1 harus selesai sebelum T2-T6 (dependency)
- T2-T6 independent setelah T1 selesai — bisa dikerjain berurutan atau paralel
- `motorType` di CustomerStore dan `isVendorBubut` di SupplierStore = FE extension, belum di plan.md Section 2 DB schema — flag untuk konfirmasi M006

---

## M003 — Transaksi UI ⏳

**Halaman**: Input Transaksi, Daftar Transaksi, Detail Transaksi, Edit Transaksi
**Visual ref**:
- `design/v2/NQ21 PERFORMANCE/pages-extra.jsx` → Input Transaksi (full design ✅)
- `demo.html #page-transaksi-list` → Daftar Transaksi (partial design)
- Detail + Edit → derive dari pattern (no explicit visual ref)

**DoD**: Form input transaksi bisa save ke Zustand, muncul di Daftar, Detail bisa dibuka, Edit reuse form. Bubut Luar dual-leg jalan.

### Tasks

- [x] **M003-T1**: TransactionForm shell + Step 01 Header
  > Layout: tx-layout grid (form 1fr + sticky summary 360px)
  > Step 01: no referensi field + UNIK/DUPLIKAT status pill, tgl (readonly auto-today), tipe toggle income/expense, payment method pills (Cash/Transfer/QRIS)
  > Step 03: catatan textarea
  > RHF state untuk header fields (noRef, tgl, tipe, method, notes)
  > Auto-generate noRef on mount: scan store → TRX-YYYYMMDD-NNN / EXP-YYYYMMDD-NNN
  > Re-generate saat tipe toggle

- [x] **M003-T2**: CustomerSupplierAutocomplete component
  > `src/features/transactions/components/CustomerSupplierAutocomplete.tsx`
  > Type-aware: income → search customers, expense → search suppliers
  > Dropdown: avatar initial + name + motor (customer) / phone (supplier)
  > "+ Buat baru" option → opens InlineCreateDialog (T2.5)

- [x] **M003-T2.5**: Inline Create Customer/Supplier Dialog
  > `src/features/transactions/components/InlineCreateDialog.tsx`
  > CustomerSubForm: nama (autofocus, pre-filled), motorType, phone
  > SupplierSubForm: nama (autofocus, pre-filled), phone, isVendorBubut toggle
  > Duplicate check: case-insensitive name match → inline error + "Pilih [name]" hint
  > On success: add to store, audit log (source=inline-from-transaksi), toast, onSuccess(id)
  > Autocomplete auto-selects new entity after create
  > Keyboard-friendly: arrow keys + enter, blur dismiss

- [ ] **M003-T3**: LineItemCard component + add/remove lines
  > `src/features/transactions/components/LineItemCard.tsx`
  > Header: LINE 01 label + kategori `<select>` (filtered by tipe) + JASA badge (if isJasa) + × delete
  > Nominal input (mono font) + biaya material input (conditional show untuk non-jasa juga, tapi kalkulasi komisi cuma untuk isJasa)
  > Basis pill: dark bg, real-time = nominal − material (cuma untuk isJasa)
  > State: `useState` untuk lines[] (hybrid approach, bukan pure RHF useFieldArray)
  > `addLine()`, `removeLine()`, `updateLine()` helpers

- [ ] **M003-T4**: MechanicChipRow + share% logic
  > `src/features/transactions/components/MechanicChipRow.tsx`
  > Mechanic chip: avatar button (click → cycle next available) + name + share% input + rate% display + komisi Rp (real-time)
  > Even share redistribution saat add mekanik baru
  > sum(share%) validation: warn tapi tidak hard-block saat mengetik (validate at submit)
  > Komisi per chip: `Math.round(basis × (share/100) × (rate/100))`
  > "+ TAMBAH MEKANIK" button (hidden kalau semua mekanik sudah ada)

- [ ] **M003-T5**: TransactionSummary sticky panel
  > `src/features/transactions/components/TransactionSummary.tsx`
  > Dark bg (`var(--text)`) sticky di top: 80px
  > RINGKASAN header + noRef display
  > Meta grid (tipe, customer/supplier, metode, line count)
  > Line list scrollable (kategori + nominal per line)
  > TOTAL (Anton 32px)
  > Komisi section (red tint bg) — hanya muncul kalau totalKomisi > 0
  > SIMPAN button (full width)

- [ ] **M003-T6**: Bubut Luar dual-leg UI + save logic
  > Detect `lines.some(l => category.isJasa && category.name === 'Bubut Luar')`
  > `bubut-extra` panel: gradient red tint bg, vendor select (isVendorBubut), biaya ke vendor input
  > On save: create 2 Zustand entries (income + expense auto noRef `<asli>-VENDOR`)
  > Push 1 entry ke `bubutLuarLinks` mock array

- [ ] **M003-T7**: Form validation + save logic
  > Zod schema: header + lines[] validation
  > Guards: noRef unique + format, min 1 line, nominal > 0, biayaMaterial ≤ nominal
  > isJasa line: min 1 mekanik, sum(share%) = 100 ±0.01
  > income: customerId required; expense: supplierId required (kecuali no-supplier categories)
  > Submit: `useTransactionStore().addTransaction()` + auto-generate line IDs + lineMechanics entries
  > Toast success + navigate ke Daftar Transaksi

- [ ] **M003-T8**: Daftar Transaksi page
  > `src/app/pages/transaksi/DaftarTransaksiPage.tsx`
  > Summary strip: 4 mini cards (tx count today, total pemasukan, total pengeluaran, net)
  > Filter: search (noRef/customer name) + tipe pills (Semua/Pemasukan/Pengeluaran) + date range pills (Hari Ini/Minggu Ini/Bulan Ini)
  > Table: noRef (mono), tgl, tipe badge, customer/supplier, total (mono), payment badge, → Detail link
  > Client-side pagination (20/page)
  > Route: /transaksi (swap dari PlaceholderPage)

- [ ] **M003-T9**: Detail Transaksi page
  > `src/app/pages/transaksi/DetailTransaksiPage.tsx`
  > Header section: noRef, tgl, tipe badge, customer/supplier, payment, total
  > Line items table (read-only): kategori, nominal, biayaMaterial, basis
  > Per jasa line: mechanic list (name, share%, rate%, komisi)
  > Bubut Luar: linked expense noRef (if exists)
  > Audit log section: timeline (created by, updated at)
  > Actions: Edit button (if not closed period), Delete (owner only, ConfirmDialog soft-delete)
  > Route: /transaksi/:id

- [ ] **M003-T10**: Edit Transaksi
  > Reuse TransactionForm dengan `mode='edit'` prop + transactionId dari URL params
  > Load existing data → pre-fill RHF form + lines[] state
  > Guard: transaksi di closed period → show warning banner + disable submit
  > Submit: `updateTransaction()` store + audit log (update action)
  > Route: /transaksi/:id/edit

- [ ] **M003-T11**: Closer — verify + screenshot + tag vM003
  > Route verify: /transaksi, /transaksi/baru, /transaksi/:id, /transaksi/:id/edit
  > DoD: form save → muncul di Daftar, Detail menampilkan data benar, Edit update benar
  > Screenshot semua 4 halaman
  > Update PROGRESS.md M003 COMPLETE
  > git tag vM003

### Blockers
_(none)_

### Notes
- **State architecture (LOCKED)**: Hybrid — RHF untuk header fields, `useState` untuk lines[] (mirrors bundle v2 pattern, avoids RHF useFieldArray complexity di nested mechs)
- T2 (autocomplete) bisa dikerjain parallel dengan T1 (no dependency antara keduanya)
- T3 → T4 → T5 berurutan (T4 depends T3 shell, T5 depends T3+T4 untuk calc)
- T6 (Bubut Luar) bisa setelah T3 selesai
- T7 (validation+save) terakhir sebelum T8 (harus ada working form dulu)
- T8-T10 independent dari T7 untuk UI shell; perlu T7 untuk integration test

### Decisions (LOCKED)
- **A — Form state**: RHF untuk header fields (noRef, tgl, tipe, customerId, supplierId, paymentMethod, notes); `useState` untuk `lines[]` + nested mechs. Hybrid approach approved.
- **B — Remove line confirm**: ConfirmDialog untuk remove line item (bukan langsung hilang). Mencegah misclick.
- **C — Bubut Luar max 1**: Hanya boleh 1 line Bubut Luar per transaksi. Kalau user coba add kedua → toast error. Simpel, sesuai realitas bengkel.
- **D — Duplicate noRef handling**: Opsi 1 — toast error dengan link ke transaksi existing ("No. Referensi sudah ada. Lihat transaksi [TRX-...]"). Bukan hard-block, bisa override manual tapi warn.
- **E — Backdated tgl**: Owner bisa backdate (editable date input), kasir readonly (auto = hari ini). Handling: noRef generated pakai tgl field value, bukan always today.

---

## M004 — Laporan & Dashboard UI ⏳

Tasks akan di-breakdown saat M003 selesai.

**Visual ref**: `design/project/NQ21 Performance.html` (seksi: Dashboard + Laporan #1–#4)

---

## M005 — Komisi UI ⏳

Tasks akan di-breakdown saat M004 selesai.

**Visual ref**: `demo.html`

---

### M002 COMPLETE ✅ — 2026-05-11

**7 task selesai (T1-T7)**. 5 master pages live, semua CRUD berfungsi dengan mock data Zustand.

**Pages live:**
- `/master/customer` — 5 seed customers, search/filter/CRUD
- `/master/supplier` — 4 seed suppliers, VENDOR BUBUT badge amber, filter pills
- `/master/kategori` — dual-section income↑/expense↓, JASA badges, delete guard by txn count
- `/master/mekanik` — Doni + rate matrix inline edit, default rates auto-seed
- `/master/user` — owner-only guard (AccessDenied kasir), role badges, self-delete + last-owner guards

**Components added (M002):**
- `MasterCRUDPage<T>` — generic CRUD table shell, searchable + sortable
- `AddEditDialog` — reusable dialog wrapper dengan form slot
- `RateMatrixTable` — inline editable rate matrix dengan click-to-edit cells
- `AccessDenied` — reusable access control card dengan lock icon

**Patterns established:**
- Soft delete lintas semua master (isActive=false, data historis aman)
- Role-based access via AccessDenied component
- Delete guards: self-delete block, last-owner block, has-transaction block
- Username unique check pattern (RHF setError inline)
- Default rate auto-seed saat add mekanik baru
- Cross-store reactivity confirmed: new isJasa category → auto-column di rate matrix

**Key decisions locked:**
- Password plain text di Zustand mock (M002), migrate bcrypt M006
- Auth store User shape: `{ name, role }` — match ke user store by name; M006 perlu `userId` in session

**Commits M002**: 10 commits · 17 files changed · +2347/-29 lines
**Tag**: vM002

---

## Milestone History

- **M001** ✅ 2026-05-10 — Design foundation, app shell, dashboard live
- **M002** ✅ 2026-05-11 — Master Data UI, 5 pages CRUD live
