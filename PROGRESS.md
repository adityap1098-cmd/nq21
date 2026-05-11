# NQ21 PERFORMANCE — Progress Tracker

---

## Status Saat Ini

**Milestone aktif**: M006-V2 (Supabase backend integration — in progress)
**Phase**: M001-M007 ✅ · M006-V2 🔄 T1 ✅
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

- [x] **M003-T3**: LineItemCard component + add/remove lines
  > `src/features/transactions/components/LineItemCard.tsx`
  > Header: LINE 01 label + kategori `<select>` (filtered by tipe) + JASA badge (if isJasa) + × delete
  > Nominal input (mono font) + biaya material input (conditional show untuk non-jasa juga, tapi kalkulasi komisi cuma untuk isJasa)
  > Basis pill: dark bg, real-time = nominal − material (cuma untuk isJasa)
  > State: `useState` untuk lines[] (hybrid approach, bukan pure RHF useFieldArray)
  > `addLine()`, `removeLine()`, `updateLine()` helpers
  > Tipe toggle confirm dialog (ConfirmDialog + pendingTipe state) saat lines punya data
  > hasBubutLuar flag → disable Bubut Luar option di line lain + "(sudah ada)" label
  > Summary panel total = sum(line.nominal) real-time

- [x] **M003-T4**: MechanicChipRow + share% logic
  > `src/features/transactions/components/MechanicChipRow.tsx`
  > Mechanic chip: avatar button (click → cycle next available) + name + share% input + rate% display + komisi Rp (real-time)
  > Even share redistribution saat add mekanik baru
  > sum(share%) validation: warn tapi tidak hard-block saat mengetik (validate at submit)
  > Komisi per chip: `Math.round(basis × (share/100) × (rate/100))`
  > "+ TAMBAH MEKANIK" button (hidden kalau semua mekanik sudah ada)

- [x] **M003-T3.5+T4.5**: Fix-ups — jasa name, share% hide, rate override
  > T3.5: `jasaName?: string` di Line + TransactionLine; `JasaNameAutocomplete` (history dropdown); "Detail Jasa (opsional)" field di LineItemCard
  > T4.5a: share% input + total-share badge hidden saat 1 mekanik; auto-100% saat delete 2→1
  > T4.5b: rate override per chip — ✏ edit icon, inline input, strikethrough display, ↩ reset; `effectiveRate = rateOverride ?? masterRate`; "⚠ Ada rate override" di summary panel
  > TransactionForm totalKomisi updated to use effectiveRate; hasRateOverride indicator
  > Seed: jasaName pada jasa lines; Budi sebagai mekanik ke-2 dengan rates

- [x] **M003-T5**: TransactionSummary sticky panel
  > `src/features/transactions/components/TransactionSummary.tsx` — pure render component
  > Dark card sticky top-88px; header noRef+tanggal; meta grid 2×2 (tipe/customer/metode/line count)
  > Line list scrollable (max 200px): "Kategori — jasaName" untuk jasa, "Kategori — notes" untuk non-jasa
  > TOTAL section Anton 32px; komisi section red-tint bg with per-mekanik breakdown + ⚠ override indicator
  > SIMPAN TRANSAKSI: accent active, disabled+tooltip saat validasi gagal (7 guards), audit footer
  > computeKomisi() di utils.ts; TransactionForm resolves customerName/supplierName + validationErrors

- [x] **M003-T6**: Bubut Luar dual-leg UI + validation
  > LineItemCard: `bubutVendor` state init/clear on category change; extra panel — gradient red tint bg, vendor autocomplete (filterSuppliers='vendor-bubut'), biaya ke vendor input, margin indicator (green/red+⚠)
  > TransactionForm: 2 validation guards (pilih vendor + isi biaya > 0)
  > TransactionSummary: BUBUT LUAR · DUAL-LEG section — customer/vendor/margin row, negative margin ⚠ in red
  > NOTE: Save logic (Zustand auto-create expense + bubutLuarLinks) deferred to T7

- [x] **M003-T7**: Submit logic + validation full + Zustand integration + Bubut Luar dual-leg save
  > `validateTransactionFull()` in utils.ts — collect-all errors, runtime mechanic/vendor active checks
  > `addTransactionFull()` in transactions store — atomic income + auto-expense + bubutLuarLinks
  > `handleSubmitForm(mode)` in TransactionForm — double-validates, logs audit, warns backdated periode
  > `resetForm()` — auto-increments noRef, resets lines, scrolls to top
  > 2-button layout: SIMPAN (navigate /transaksi) + & INPUT LAGI (reset form)
  > `rateOverride` persisted to TransactionLineMechanic; `source` field added to AuditLog
  > Verified: 4 tx persisted in localStorage after hard reload incl. TRX-...-VENDOR dual-leg

- [x] **M003-T8**: Daftar Transaksi page
  > `src/app/pages/transaksi/DaftarTransaksiPage.tsx`
  > Summary strip: 3 KPI cards (pemasukan total, pengeluaran total, net) — live dari filtered result
  > Filter: search (noRef/customer+supplier name) + tipe pills (Semua/Masuk/Keluar) + period pills (Hari Ini/Minggu Ini/Bulan Ini/Semua)
  > Default period: Minggu Ini (Senin-based week via weekStartsOn: 1)
  > Table: noRef (mono bold), tgl (DateDisplay), tipe badge, customer/supplier name, metode badge, total (CurrencyDisplay), DETAIL button
  > Row hover effect + click-to-detail navigation
  > Client-side pagination (20/page) with ellipsis for large sets
  > Route: /transaksi (swapped from PlaceholderPage)
  > Verified: search "bubut" → 2 results, KELUAR filter → 8 expense tx, Semua → 29 tx

- [x] **M003-T9**: Detail Transaksi page
  > `src/app/pages/transaksi/DetailTransaksiPage.tsx`
  > PageHeader: KEMBALI + EDIT (disabled if deleted/vendor-auto/closed-period) + HAPUS (owner only)
  > Deleted banner (red) with timestamp + deleter name from audit log
  > Vendor auto-link banner with button to counterpart income transaction
  > Status strip: tipe badge + tgl (long format) + AKTIF/DIHAPUS + BUBUT LUAR badge
  > Info card: party avatar+name+sub, payment badge, created by + timestamp, notes
  > Line cards (per line): LINE 0N header + kategori, jasaName, amounts grid (nominal/biayaMaterial/basis for jasa)
  > Mechanic chips read-only: avatar + name + share% + rate% (with override ⚠) + komisi Rp
  > Bubut Luar section per line: biaya vendor, margin, link to counterpart transaction
  > Summary footer: Anton 36px total + komisi breakdown (per-mechanic if >1) + period OPEN/CLOSED badge
  > Audit timeline: collapsible, newest-first, avatar + username + action + timestamp + source badge
  > Delete: ConfirmDialog + softDelete(tx) + cascade softDelete(bubutLuarLink) + audit + toast + navigate
  > Soft-delete lookup from audit log for deleter name in banner
  > Route /transaksi/:id wired (replaced PlaceholderPage)
  > Verified: income jasa, expense, deleted view with banner, delete confirm dialog

- [x] **M003-T10**: Edit Transaksi
  > `EditTransaksiPage.tsx` — guards (deleted→detail, -VENDOR→income, closed period→detail), ← BATAL button
  > `TransactionForm` extended: `initialData` prop (header + lines preload), `mode='edit'` locks noRef+tipe
  > `updateTransactionFull()` store action — replace old lines, cascade bubut luar (update/create/soft-delete expense)
  > Dirty-state tracking: linesChanged || rhfDirty → ConfirmDialog on BATAL
  > "SIMPAN PERUBAHAN" label, no "& INPUT LAGI" button in edit mode
  > Audit log: action='update', source='edit-form', before/after totalNominal+tglTransaksi
  > Verified: preload ✅, noRef locked ✅, tipe locked ✅, save→detail+audit ✅, dirty confirm ✅, deleted guard ✅

- [x] **M003-T11**: Closer — verify + screenshot + tag vM003
  > Route verify: /transaksi ✅, /transaksi/baru ✅, /transaksi/:id ✅, /transaksi/:id/edit ✅
  > Scenario 1: Jasa multi-mekanik — komisi Rp 45.000 exact (200k − 50k basis × 30%) ✅
  > Scenario 2: Bubut Luar dual-leg — TRX-002 income + TRX-002-VENDOR auto-expense, parent link, margin panel ✅
  > Scenario 3: Mekanik nonaktif — excluded from picker, TAMBAH MEKANIK disabled + tooltip ✅
  > Scenario 4: Delete cascade — both legs soft-deleted, bug fixed (toast wrong call signature) ✅
  > Scenario 5: Backdated period warning toast — appeared during Scenario 1 ✅
  > Edit flow: preload ✅, noRef locked ✅, tipe dimmed ✅, SIMPAN PERUBAHAN ✅, audit 2 entri ✅
  > Bug fixed: DetailTransaksiPage:230 `toast({title,description})` → `toast(title, {description})`
  > PROGRESS.md M003 COMPLETE ✅ · git tag vM003 ✅

### M003 COMPLETE ✅ — 2026-05-11

**4 halaman live**: Input Transaksi · Daftar Transaksi · Detail Transaksi · Edit Transaksi

**Verified scenarios**:
1. Full jasa multi-mekanik — komisi formula exact ✅
2. Bubut Luar dual-leg auto-create ✅
3. Mekanik nonaktif exclusion ✅
4. Delete cascade (income + vendor leg) ✅
5. Backdated period warning toast ✅

**Bug caught & fixed**: `toast({title,description})` → `toast(title, {description})` in DetailTransaksiPage — caused React render crash after delete.

**New files**: `TransactionForm.tsx`, `TransactionSummary.tsx`, `LineItemCard.tsx`, `MechanicChipRow.tsx`, `CustomerSupplierAutocomplete.tsx`, `InlineCreateDialog.tsx`, `DaftarTransaksiPage.tsx`, `DetailTransaksiPage.tsx`, `EditTransaksiPage.tsx`

**Store additions**: `addTransactionFull()`, `updateTransactionFull()`, `softDelete()`, `bubutLuarLinks[]`

**Tag**: vM003

---

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
- **F — No "libur" mekanik button**: Form T4 tidak punya toggle "libur/absen". Kalau mekanik tidak hadir, kasir cukup tidak menambahkan mekanik tersebut ke line. Simpel, mengurangi kompleksitas UI.
- **G — Smart pre-fill mekanik**: Default mekanik pada line jasa baru = mekanik dari transaksi jasa terakhir yang diinput kasir ybs. Query `useTransactionStore` → filter by `userId` = auth user + latest isJasa transaction → copy mechanics array. Fallback: semua mekanik aktif.
- **H — Audit log mekanik per-field**: Update mekanik pada line (share%, rate override, add/remove) dicatat di audit log dengan `beforeData` + `afterData` per-field, bukan snapshot seluruh transaksi. Source: `'mekanik-update-transaksi'`.

---

## M004 — Laporan & Dashboard UI ✅

**Halaman**: Dashboard (live data) + Laporan Per Kategori · Cash Flow · Jasa & Mekanik · Dyno
**Visual ref**: `design/project/NQ21 Performance.html` (seksi: Dashboard + Laporan #1–#4)
**DoD**: Dashboard 100% live data (zero hardcoded), 4 laporan pages berfungsi dengan period filter, CSV export.

### Decisions (LOCKED)

- **D1 — Charts**: Recharts, warna income = `var(--text)` hitam, expense = `var(--accent)` merah. Match NQ21 palette.
- **D2 — KPI Deltas**: Real week-over-week deltas. Display "+X.X% vs minggu lalu" kalau ada data prevPeriod. Hide delta row kalau tidak ada data prev (hasComparison=false).
- **D3 — CSV Export**: UTF-8 BOM prefix (`\uFEFF`) untuk kompatibilitas Excel Indonesia.
- **D4 — Closed Period Komisi**: Fix `1_980_000` hardcode di Dashboard → dynamic dari `useCommissionStore().payouts`.
- **D5 — Period Filter**: Semua 4 laporan punya shared filter bar (periode aktif default + date range picker).
- **D6 — Filter State**: `useState` lokal per halaman laporan, tidak perlu Zustand global.
- **D7 — Empty State**: Copy per laporan: Kategori "Belum ada transaksi untuk periode ini." · Cash Flow "Tidak ada aliran kas untuk rentang ini." · Jasa "Belum ada transaksi jasa di periode ini." · Dyno "Belum ada transaksi Dyno."
- **D8 — Print CSS**: Defer ke M007. M004 hanya browser view.

### Tasks

- [x] **M004-T1**: Dashboard Cleanup + Hardcoded Removal + Live Data Verify
  > `getKpiDeltas()` + `KpiDelta`/`KpiDeltas` interfaces di selectors.ts
  > `kpiChange()` helper — format delta string, hide if no prev data
  > Wire KPI card `change` props — replaced hardcoded `+12.4%` / `+3.1%` / `+18.2%`
  > Fix closed period komisi: `payouts.filter(po => po.periodId === p.id).reduce(...)` (was `1_980_000`)
  > `prevPeriod` useMemo + `prevKomisi` from payouts store
  > Chart filter state lifted to Dashboard: `build30HData()` + `build90HData()` helpers
  > Browser verify: 8 scenarios

- [x] **M004-T1.5**: Bug fixes (3 bugs dari T1 verify)
  > Bug #1 — Sidebar username stale after master user edit: `auth.ts` + `User` interface get `username` field; Sidebar live-lookup from `useUserStore` by username, fallback ke `user.name`
  > Bug #4 — "Minggu Ini" filter empty despite H-1 transactions: `DaftarTransaksiPage.getInterval()` pinned to `new Date('2026-05-10')` (was `new Date()` = real today)
  > Bug #5 — Cash flow chart 7H/30H/90H toggle not reactive: chart filter state lifted to Dashboard, `CashFlowChart` now accepts `{ data, filter, onFilterChange }` props

- [x] **M004-T1.6**: Input Transaksi UX — jasaName→itemName + universal field + compact layout
  > Rename: `jasaName` → `itemName` across all store types, form, detail, edit pages
  > Zustand persist `version: 2` + `migrate()`: localStorage auto-migrates old `jasaName` keys
  > `getUniqueItemNames(lines, categoryId)` — category-aware history (replaces `getUniqueJasaNames`)
  > `ItemNameAutocomplete.tsx` (new) — replaces JasaNameAutocomplete, disabled when no category selected
  > `getItemNameLabel(cat)` — dynamic label/placeholder per category (Jasa/Oli/Sparepart/Bubut/internal/default)
  > `itemName` field shown for ALL categories (not just isJasa)
  > Compact LineItemCard: Row1 itemName+Nominal (3fr/2fr grid), Row2 biayaMaterial+basis (jasa only), Row3 mechs, Row4 bubut, Row5 notes collapsible
  > `DaftarTransaksiPage` search now checks `line.itemName` across all categories

- [x] **M004-T1.7**: Remove notification bell from Topbar
  > Removed `Bell` import + button element from `Topbar.tsx`
  > Bell deferred to M006 (real-time notifications need BE infrastructure)

- [x] **M004-T2**: Selectors Extension
  > New export type `DateRange { start, end }` — used across all new selectors
  > `getReportPerKategori()` rewritten → `ReportPerKategoriResult { income[], expense[], summary }` — split halves, percentage of total per group, excludes 0-nominal categories
  > `getCashFlow(txs, '7H'|'30H'|'90H'|DateRange, granularity?)` — full typed `CashFlowDataPoint[]`
    · '7H' → 7 daily bars (SEN/SEL/…), isToday flag on 2026-05-10 ✅
    · '30H' → 30 daily bars (DD MMM labels)
    · '90H' → 13 weekly bars (Feb W2 … Mei W1) ✅
  > `getReportJasa(txs, lines, lineMechanics, rates, catMap, customers, mechanics, range, filters?)` → `JasaReport`
    · perMekanik stats (basis share, komisi, jobsCount, uniqueCategories)
    · detailLines with full mechanic breakdown + effectiveRate/rateOverride
    · optional filters by mechanicIds + categoryIds
  > `getReportDyno(txs, lines, lineMechanics, catMap, customers, mechanics, range)` → `DynoReport`
    · sessions + topOperators + sessionsByDate (14-day bar) + summary
  > `getPeriodRange(preset)` + `getPrevPeriodRange(current)` period helpers
  > New `src/lib/csv.ts`: `exportCSV<T>(rows, columns, filename)` — UTF-8 BOM, RFC 4180 quoting, \r\n
    · Format helpers: `fmtRupiah`, `fmtDate`, `fmtPercent`
  > Date math: all via pure string+manual arithmetic (no extra imports), timezone-safe (local Date)

- [x] **M004-T3**: Laporan Per Kategori
  > Route: `/laporan/kategori` → `LaporanKategoriPage`
  > `src/lib/hooks/usePeriodFilter.ts` — reusable period filter hook (today/week/month/custom) with PRESET_MAP → getPeriodRange
  > Period filter bar: PeriodSelector pill group + date range display on right
  > Income panel + Expense panel side-by-side, each with: swatch, category name, JASA badge, JML TRX, NOMINAL with inline % progress bar, % column, Grand Total row
  > Profit banner: dark card (var(--text) bg), breakdown left + big laba kotor number right, positive=green / negative=red
  > CSV export: `nq21-laporan-kategori-{start}-{end}.csv` with UTF-8 BOM
  > Global empty state when no transactions in period

- [x] **M004-T3.5**: Fix-up Laporan #1 + Global Command Palette Search
  > Part A — Grid stretch: panels container changed to `display: grid; 1fr 1fr` — CSS Grid stretch auto-equalizes panel heights
  > Panel `minHeight: 380px` fallback + hint row "Tidak ada kategori lain di periode ini" when rows < 5
  > Part B — Command Palette: `src/store/ui.ts` (commandPaletteOpen/open/close/toggle)
  > `src/app/components/CommandPalette.tsx` — search across 4 entities (Transaksi/Customer/Supplier/Mekanik), debounce 150ms, max 6/group + overflow hint
  > Keyboard nav: ArrowUp/Down, Enter navigate, Esc close, Ctrl+K toggle
  > Topbar search bar → click opens palette; Layout.tsx wires Ctrl+K global shortcut
  > Verified: "Pak" → 6 txns + Pak Hendro customer; "bubut" → vendor txns + Bubut Mandala Jaya supplier

- [x] **M004-T4**: Laporan Cash Flow
  > Route: `/laporan/cash-flow` → `LaporanCashFlowPage`
  > `usePeriodFilter` reused; filter chips: Tipe (Semua/Pemasukan/Pengeluaran) + Metode (Semua/Cash/Transfer/QRIS)
  > Summary strip 3-col: Total Masuk (green tint) + Total Keluar (red tint) + Saldo Bersih (dark bg positive / red negative)
  > Detail table ascending chronological: TGL/JAM/NO REF/PARTY/KATEGORI/METODE/NOMINAL/SALDO running
  > border-left 3px green income / red expense; click row → /transaksi/{id}
  > Saldo running computed via useMemo; negative saldo → red color + warning banner below table
  > Pagination 50/page; empty state per-filter vs no-data; Reset Filter + Input Transaksi actions
  > CSV: tanggal, jam, noRef, party, kategori, tipe, metode, nominal, delta, saldo berjalan
  > Verified: Pemasukan+Cash filter → 9 rows, saldo akumulasi Rp 9.970.000 ✓

- [x] **M004-T5**: Laporan Jasa & Mekanik
  > Route: `/laporan/jasa` → `LaporanJasaPage`
  > `usePeriodFilter` reused; mekanik + kategori multi-select filter chips
  > KPI grid (clickable cards): jobs / total basis / total komisi per mekanik — unfiltered for overview
  > Detail table: TGL·REF / CUSTOMER / KATEGORI / NOMINAL / MATERIAL / BASIS / MEKANIK stacked (share%+rate%+komisi) + tfoot grand total
  > Multi-mekanik `MechStack` component: stacked rows per mech, strikethrough rate for overrides, ∑ multi-mech total
  > Summary strip 4-col: Total Jobs / Total Basis / Total Komisi / Avg Komisi/Job
  > CSV flat: 1 row per mechanic per line, UTF-8 BOM
  > Empty state: "Belum ada transaksi jasa di periode ini."

- [x] **M004-T6**: Laporan Dyno
  > Route: `/laporan/dyno` → `LaporanDynoPage`
  > `usePeriodFilter` reused; `DynoSession.createdAt` added to selectors for JAM column
  > Hero section: dark card (var(--text) bg) + 3px accent top bar, 3-col grid — Total Sesi / Total Revenue / Rata-rata/Sesi (Anton 42–48px white)
  > 2-col section: Top Operators (ranked list, rank #1 accent, progress bar relative to #1) + 14-day bar chart (Recharts, accent red bars, fixed window regardless of period filter)
  > Detail table: TGL/JAM/NO REF/CUSTOMER/OPERATOR/METODE/NOMINAL, 3px accent border-left, click → /transaksi/{id}
  > Pagination 50/page; empty state (lightning bolt icon) → navigate /transaksi/baru
  > CSV flat: 1 row per session, UTF-8 BOM
  > `DynoBarTooltip`: custom dark tooltip with sesi count + revenue

- [x] **M004-T6.5**: Polish — 3 fix issues
  > Issue #1 — Detail Transaksi adaptive info card: 3-col compact grid (Party/Metode/Dibuat) when notes empty; 2-col (Party+Dibuat / Metode+Catatan) when notes present; notes field hidden if empty
  > Issue #1B — Button hierarchy reorder: Kembali (ghost, no border) → Hapus (destructive outline, red) → Edit (accent solid, black); Edit stays rightmost as primary action
  > Issue #2 — Daftar Transaksi sortable columns: click header toggles asc/desc; active column shows accent ▲/▼ indicator; sort by noReferensi/tglTransaksi/tipe/party/paymentMethod/totalNominal; default tglTransaksi desc; filter + sort independent
  > Issue #3 — Laporan Per Kategori grand total sticky bottom: grand total moved out of `<tbody>` into separate `<div>` at bottom of flex column; both panels (income + expense) always have grand total at same Y position regardless of row count difference

- [x] **M004-T7-patch**: Detail Transaksi final polish
  > FIX #1 (button order) — already correct from T6.5; confirmed KEMBALI → HAPUS → EDIT ✅
  > FIX #2 (info card) — always 3-col horizontal (Party · Metode · Dibuat); notes rendered BELOW row with `border-top: 1px dashed var(--border)` separator; removed adaptive 2-col/3-col switching
  > FIX #3 (line items) — adaptive render: jasa = 3-col grid (NOMINAL|MATERIAL|BASIS) + mechanic chips; non-jasa = compact flex-row (NOMINAL label left · value right, ~50% shorter card); non-jasa notes below dashed separator
  > FIX #4 (period inline) — period section refactored to single flex-row: PERIODE KOMISI label · date range · badge · note text all inline, no stacked vertical whitespace

- [x] **M004-T7**: Closer — Verify + Tag vM004
  > All 4 laporan routes live (swap PlaceholderPage — LaporanJasaPage + LaporanDynoPage wired in T5/T6)
  > Smoke test via Playwright: /dashboard, /laporan/kategori, /laporan/cash-flow, /laporan/jasa, /laporan/dyno, /transaksi, /transaksi/:id (2 variants), Command Palette
  > Dashboard: KPI live, chart reactive, period pill, closed komisi dynamic ✅
  > Laporan Kategori: period filter, CSS Grid equal panels, grand total sticky bottom both panels sejajar ✅
  > Laporan Cash Flow: summary strip, saldo running ascending ✅
  > Laporan Jasa: KPI mekanik cards (Doni 10 jobs, Budi 0), filter chips, detail table ✅
  > Laporan Dyno: hero (3 sesi, Rp 3.670.000, avg Rp 1.223.333), Top Operator #1 accent, 14-day bars ✅
  > Daftar Transaksi: sort TANGGAL▼ default, column toggle asc/desc ✅
  > Detail Transaksi: 3-col compact (no notes), 2-col with notes, button order ← KEMBALI|HAPUS|EDIT ✅
  > Command Palette (Ctrl+K): opens, search UI functional ✅
  > Build clean (`npm run build`): 0 TS errors, only chunk-size warning (acceptable) ✅
  > PROGRESS.md updated, commit, tag vM004

### M004 COMPLETE ✅ — 2026-05-11

**8 halaman live**: Dashboard (live data) + 4 Laporan + Daftar/Detail/Edit Transaksi (polish)

**Features delivered**:
- Dashboard: zero hardcoded data — all KPI + charts from selectors
- Period filter hook `usePeriodFilter` — shared across all 4 laporan
- Laporan Per Kategori: CSS Grid equal panels + grand total sticky bottom + CSV export
- Laporan Cash Flow: saldo running, jagged red negative indicator, filter chips + CSV
- Laporan Jasa & Mekanik: per-mekanik KPI cards + MechStack multi-mech detail + CSV
- Laporan Dyno: hero dark section + Top Operators ranked + 14-day fixed bar chart + CSV
- Command Palette (Ctrl+K): global search across 4 entities, keyboard nav
- Daftar Transaksi: sortable columns (6 keys, asc/desc toggle)
- Detail Transaksi: adaptive info card (2-col / 3-col based on notes)

**Bug caught & fixed**: `DynoSession.createdAt` missing from interface — added for JAM column in detail table.

**Tag**: vM004

---

## M005 — Komisi UI ⏳

**Visual ref**: `design/v2/NQ21 PERFORMANCE/pages-extra.jsx` (PeriodeKomisi component, MasterMekanik) + `data-pages.jsx` (seed data)
**DoD**: Periode Komisi page live, Close Period workflow, printable slip per mekanik, Mark As Paid, overview mekanik lintas periode.

### Decisions (LOCKED)

- **D1 — Print CSS**: Basic `@media print` di T3 (slip page). Hide sidebar + topbar + periode selector + mechanic sidebar. Show only slip-paper content. A4 width. Professional enough for kasir print ke mekanik.
- **D2 — Mark As Paid tracking**: `paidBy` (userId) + `paidAt` (timestamp) + `paidNotes` (free text, e.g., "Transfer BCA"). No payment method dropdown — notes covers it.
- **D3 — Slip views**: 2 views — master page `/komisi/periode` (owner overview, inline mechanic selector + slip viewer) + `/komisi/slip/:periodId/:mechanicId` (dedicated printable route).
- **D4 — closeAndGeneratePayouts**: Atomic store action: close period + batch upsert payouts (all mechanics) + auto-create next period. Component pre-computes via `getPayoutsForPeriod` selector, passes array to store action.
- **D5 — Backdated entries**: INCLUDED in slip. Rows show inline `[BACKDATED]` badge. Total komisi includes backdated entries. Filter by `tglTransaksi in period range` for the open period computation. Footer note: "X dari Y jasa adalah backdated — komisi tetap dibayarkan." (kalau ada backdated).
- **D6 — Auto-create next period**: `closeAndGeneratePayouts` auto-calls `openPeriod` for next week after close. Guard: skip if period with nextStart already exists (idempotent).
- **D7 — Slip table transparency**: Show NOMINAL + MATERIAL + BASIS columns. Mechanic liat full breakdown.
- **D8 — One-way close**: Period closed = locked forever. No re-open. Errors handled by owner via adjustment in next period.

### Tasks

- [x] **M005-T0**: Store Prep — Foundation
  > `CommissionPayout` type updated: added `totalJobs`, `paidBy?`, `createdAt`
  > `selectors.ts`: added `PayoutLine` + `PayoutComputed` interfaces + `getPayoutsForPeriod()` pure selector
  > `commission.ts`: `closeAndGeneratePayouts(periodId, closedBy, payouts[])` atomic action — close + batch insert + auto next period
  > `commission.ts`: `markPaid(id, paidAt, paidBy, paidNotes?)` updated signature
  > `commission.ts`: persist version bumped to v2 with migration (patch old payouts: add `totalJobs=0`, `createdAt=now`)
  > Seed payouts fixed: all mechanics (Doni + Budi) for both closed periods, all paid with `paidBy='user-1'`
  > Build clean ✅

- [x] **M005-T1**: Periode Komisi main page (`/komisi/periode`)
  > `PeriodSelectorCard` — status badge, date (Anton 22px), jobs, komisi; accent border+gradient for selected open
  > `PeriodSummaryPanel` — dark bg, range Anton 36px, 3 stats grid (BASIS/KOMISI/PAYOUT X/N Dibayar)
  > `MechanicSlipCard` — avatar, name, jobs·basis meta, komisi, PENDING/DIBAYAR badge
  > `SlipTable` — 10-col table (TGL/REF/CUSTOMER/KAT/NOMINAL/MATERIAL/BASIS/SHARE/RATE/KOMISI); rate override strikethrough; backdated BDTD badge
  > `SlipPaper` — DRAFT/FINAL watermark, brand header, mechanic avatar+name, table, dark total footer (Anton 44px accent), actions bar
  > `KomisiBadge` shared badge (open/closed/pending/paid)
  > `src/features/komisi/utils.ts` — shared formatters (fmtPeriodShort, fmtPeriodFull, fmtClosedAt, etc.)
  > Internal state: `selectedPeriodId` + `selectedMechanicId` (derived effective)
  > Open period: `getPayoutsForPeriod` live compute; Closed period: stored payout stubs fallback when no live txs
  > router.tsx: `/komisi/periode` wired to `PeriodeKomisiPage`
  > Build clean ✅ · Verified: period switch ✓, mechanic switch ✓, DIBAYAR status ✓, TUTUP PERIODE visible for open ✓

- [x] **M005-T2**: Close Period workflow
  > `ClosePeriodDialog` — komisi preview table (mechanic avatar, jobs, basis, komisi), backdated warning, 3-item warning card (next range auto-create, input cek, audit log)
  > Button "TUTUP PERIODE": visible when open, disabled if no jasa or kasir login (tooltip)
  > On confirm: `closeAndGeneratePayouts(periodId, user.username, payouts)` + audit log (period_close + N×payout_create)
  > Toast success: "Periode berhasil ditutup · N payout di-generate" + toast "Periode baru dibuat"
  > Loading state: "MENUTUP..." text, both buttons disabled
  > Build clean ✅ · Commit: 6482bd8

- [x] **M005-T3**: Slip Bagi Hasil printable page (`/komisi/slip/:periodId/:mechanicId`)
  > `SlipPage` — standalone no sidebar/topbar; inside ProtectedRoute outside Layout
  > `PrintLayout` wrapper — white bg, max-width 794px (A4), centered
  > `SlipPaper` `variant="standalone"` — no watermark, no action buttons, signature lines (Diterima/Tanggal/Tanda tangan), print metadata footer
  > `src/styles/print.css` — @page A4 portrait, hide data-print-hide, thead repeat, slip-paper no border
  > Action bar: KEMBALI (ghost) + 🖨 CETAK (`window.print()`) — hidden on print via `data-print-hide`
  > Fallback to stored payout stub for closed periods with no live txs
  > router.tsx: `/komisi/slip/:periodId/:mechanicId` → SlipPage (outside Layout)
  > Build clean ✅

- [x] **M005-T4**: Mark As Paid workflow
  > `MarkPaidDialog` — mechanic avatar+name, periode, jobs+basis+komisi info card, notes textarea (max 200 char), BATAL + TANDAI DIBAYAR
  > `SlipPaper` updated: `onMarkPaid?: () => void` prop; TANDAI DIBAYAR button now active (was disabled placeholder)
  > `PeriodeKomisiPage`: `showMarkPaidDialog` state + `handleConfirmMarkPaid` → `markPaid(stored.id, now, username, notes)` + audit log `mark-paid` + toast success
  > Post-action: badge updates PENDING → DIBAYAR, button disappears, paidAt shown in footer
  > Build clean ✅

- [x] **M005-T5**: Mekanik & Komisi overview page (`/komisi/mekanik`)
  > `MekanikKomisiPage` — cross-period view, all stored payouts from commission store
  > Filter bar: PERIODE (Semua / Bulan Ini) + MEKANIK multi-chip + STATUS (Semua / Pending / Paid) with colored active states
  > KPI strip 3-col: Total Komisi (black) / Pending Payout (warning yellow) / Sudah Dibayar (success green)
  > Table: MEKANIK / PERIODE (closedAt sub-line) / JOBS / BASIS / KOMISI (accent) / STATUS badge / DIBAYAR (date + notes italic) / AKSI
  > Sortable columns: PERIODE ↕ / KOMISI ↕ / STATUS ↕
  > Row hover bg surface-alt
  > TANDAI DIBAYAR inline (owner + pending) → reuse MarkPaidDialog
  > LIHAT SLIP → navigate `/komisi/slip/{periodId}/{mechanicId}`
  > EXPORT CSV: UTF-8 BOM, 8 columns, filename `nq21-komisi-overview-{YYYYMMDD}.csv`
  > Soft-deleted mechanic: NONAKTIF badge, still shows in table
  > Empty state: all payouts empty → full-page empty + CTA to /komisi/periode; filtered empty → inline message
  > router.tsx: `/komisi/mekanik` → MekanikKomisiPage (replaces placeholder)
  > Build clean ✅

- [x] **M005-T6**: Closer — verify + tag vM005
  > Route verification: /komisi/periode ✓ · /komisi/slip/period-1/mech-1 ✓ · /komisi/mekanik ✓
  > E2E: close period → Doni 5.665.500 payout generated PENDING · 11-17 Mei period auto-created ✓
  > E2E: TANDAI DIBAYAR visible in slip footer + in mekanik overview inline row ✓
  > E2E: slip standalone page — no sidebar/topbar · signature lines · print metadata · CETAK button ✓
  > E2E: mekanik overview KPI strip updated correctly (Pending 5.665.500 + Dibayar 1.974.000 = Total 7.639.500) ✓
  > UX pass: toast positioning ✓ · hover states ✓ · empty state messages ✓ · sortable headers ✓
  > Bug findings: none critical · minor defer list below
  > Build clean ✅ · Tagged vM005

---

## M005 — COMPLETED ✅

**Completed**: 2026-05-11
**Tag**: vM005

### Tasks
- T0 Store prep: closeAndGeneratePayouts + getPayoutsForPeriod + paidBy + seed fix
- T1 Periode Komisi main page: selector + summary + slip viewer (5 new components)
- T2 Close Period workflow: ClosePeriodDialog + atomic action + auto-create next period
- T3 Dedicated printable slip page: PrintLayout + print CSS + standalone variant
- T4 Mark As Paid workflow: MarkPaidDialog + status update + audit log
- T5 Mekanik & Komisi overview: filter + KPI strip + inline action + CSV export
- T6 Closer: smoke test + verify + tag

### New Components
- `PeriodSelectorCard`, `PeriodSummaryPanel`, `MechanicSlipCard` (T1)
- `SlipPaper` (dual variant embedded/standalone), `SlipTable` (T1/T3)
- `KomisiBadge` shared (T1)
- `ClosePeriodDialog` (T2)
- `MarkPaidDialog` (T4)
- `PrintLayout` (T3)
- `MekanikKomisiPage` (T5)

### New Files
- `src/features/komisi/utils.ts` — shared formatters
- `src/features/komisi/components/` — 7 components
- `src/app/pages/komisi/PeriodeKomisiPage.tsx`
- `src/app/pages/komisi/SlipPage.tsx`
- `src/app/pages/komisi/MekanikKomisiPage.tsx`
- `src/app/layout/PrintLayout.tsx`
- `src/styles/print.css`

### Key Features
- Atomic period close + payout generate + auto-open next (Zustand, in-memory)
- Slip bagi hasil printable (A4, no sidebar, signature lines)
- Mark as paid dengan audit notes + audit log
- Cross-period mekanik overview: filter + KPI + sort + CSV
- Print CSS: @page A4 portrait, data-print-hide pattern, thead repeat

### Decisions (D1-D8 locked)
- D1: Print CSS basic di T3 ✅
- D2: paidBy + paidNotes + paidAt (no payment method dropdown) ✅
- D3: 2 views: master page + dedicated printable slip ✅
- D4: Atomic closeAndGeneratePayouts ✅
- D5: Backdated included di slip dengan BDTD badge + footer note ✅
- D6: Auto-create next period setelah close ✅
- D7: NOMINAL + MATERIAL + BASIS di slip table ✅
- D8: One-way close (no re-open) ✅

### Minor Issues (defer M007 polish)
- PDF export button: disabled placeholder (needs lib evaluation — M007)
- "CETAK SEMUA SLIP" button: disabled placeholder (needs batch print logic — M007)
- Backdated warning toast on closed period input: tested visually, acceptable behavior

### Patch v3: Dual Print Mode — Compact + Detail Toggle (2026-05-11)
**Commit**: e5de50c · "M005 patch v3: dual print mode — compact + detail toggle"
- `SlipPage.tsx`: `printMode` state ('compact'|'detail'), mode toggle pill UI (RINGKAS / DETAIL), `useEffect` syncs `document.body.dataset.printMode` for CSS targeting
- `SlipPaperCompact.tsx` (NEW): portrait summary — KPI row, breakdown per kategori table, top 3 hari, backdated note, dark total card, signature, print metadata
- `SlipPaper.tsx`: adds `slip-paper-detail` class when `variant="standalone"` (CSS named-page target)
- `print.css`: named `@page` rules — `compact-portrait` (A4 portrait) + `detail-landscape` (A4 landscape). Each slip variant sets `page:` property to select orientation automatically at print time
- Compact mode: category-aggregated summary fits 1 page A4 portrait ✅
- Detail mode: full transaction table, A4 landscape, all 10 columns ✅

---

## M007 — PWA & Polish ⏳

**Visual ref**: N/A (PWA standard + code quality)

### Tasks

- [x] **M007-T1**: PWA Manifest + Icons + Splash Screen
  > `public/manifest.json` — name/short_name/theme_color #C8102E/background #0A0908/standalone/lang id-ID
  > `public/icons/icon.svg` + `icon-maskable.svg` — NQ21 brand mark SVG (dark bg, N glyph, red strip)
  > `index.html` — manifest link + theme-color + Apple PWA meta tags
  > `SplashScreen.tsx` — fixed overlay dark bg, NQ21 logo, red strip, tagline
  > `App.tsx` — hydration gate (300ms timeout) shows SplashScreen before RouterProvider
  > Build clean ✅

- [x] **M007-T2**: Service Worker + Offline Support
  > `vite-plugin-pwa` + `workbox-window` installed
  > `vite.config.ts` — VitePWA plugin with CacheFirst strategy for Google Fonts, autoUpdate registerType
  > `OfflineIndicator.tsx` — fixed badge top-right, yellow/dark, shows only when offline, pulse dot
  > `PWAUpdatePrompt.tsx` — bottom-right card with Nanti/Update buttons, useRegisterSW hook
  > `vite-env.d.ts` — `/// <reference types="vite-plugin-pwa/client" />` added
  > `App.tsx` — wires OfflineIndicator + PWAUpdatePrompt after RouterProvider
  > dist/sw.js + workbox-*.js generated ✅ · Build clean ✅

- [x] **M007-T3**: Lazy Loading + Code Splitting
  > `router.tsx` — 17 routes converted to React.lazy + Suspense with `<LoadingFallback />` wrapper
  > `LoadingFallback.tsx` — spinner + "Memuat..." mono text
  > `vite.config.ts` — manualChunks: react-vendor/recharts/date-fns/zustand/radix-ui
  > Main entry: 239KB gzipped (was 1.19MB monolith). Recharts isolated to 101KB deferred chunk ✅
  > 44 entries precached by Workbox · Build clean ✅

- [x] **M007-T4**: Visual Polish + Bug Fixes
  > `index.css` — `:focus-visible` ring (2px accent, offset 2px) + `:focus:not(:focus-visible)` suppress mouse ring
  > `TransactionForm.tsx` — `aria-label` on icon-only refresh button; removed `console.error` prod leak
  > `Dashboard.tsx` — Chart `<Cell key={entry.date}>` (was index — React key warning)
  > `PWAUpdatePrompt.tsx` — cleaned console.log/error to DEV-only
  > All empty state strings already in Indonesian ✅ · Toast variants consistent ✅ · Form reset on submit ✅

- [x] **M007-T5**: M007 Closer + Tag vM007
  > Smoke test: dashboard / komisi/periode / laporan/jasa / master/mekanik → 0 console errors ✅
  > Tagged vM007 · Build clean ✅

---

## M007 — COMPLETED ✅

**Completed**: 2026-05-11
**Tag**: vM007

### Tasks
- T1 PWA Manifest + Icons + Splash Screen
- T2 Service Worker + Offline Support
- T3 Lazy Loading + Code Splitting
- T4 Visual Polish + Bug Fixes
- T5 Closer + Tag vM007

### Key Features
- Installable PWA (manifest + SVG icons + `display: standalone`)
- Service worker (Workbox, CacheFirst fonts, autoUpdate)
- Offline indicator badge + PWA update prompt
- Hydration splash screen (300ms gate, dark NQ21 brand)
- Route-level lazy loading — 17 routes, multiple vendor chunks
- Main bundle: 239KB gzipped (was 1.19MB monolith); recharts deferred 101KB
- `:focus-visible` ring for full keyboard nav accessibility
- Chart key fix, aria-label on icon buttons, console.log cleanup

### Decisions D1-D8 locked
- D1: PWA installable + SW offline static cache ✅
- D2: Offline badge top-right, yellow, pulse dot ✅
- D3: CacheFirst static, Workbox generateSW ✅
- D4: SVG icons (NQ21 "N" dark bg + red strip) ✅
- D5: Splash screen dark bg, 300ms hydration gate ✅
- D6: Polish only — no redesign of existing features ✅
- D7: Manual chunks split — recharts/radix-ui/date-fns/zustand/react-vendor ✅
- D8: Print CSS already landed M005 — no changes needed ✅

---

### Patch v2: Landscape + Compact Header (2026-05-11)
**Commit**: 8cff857 · "M005 patch v2: slip print landscape + compact header"
- `print.css`: orientation switched to A4 landscape (1.2cm/1.5cm margins), slip-header flex compact layout, mechanic-section max-width 200px (no overflow)
- `SlipPaper.tsx`: added class names — `slip-header`, `brand-section`, `mechanic-section`, `title`, `subtitle`, `label`, `name`, `role`
- `SlipTable.tsx`: added TH alignment classes (`text-right`/`text-center`), `col-kategori` + `item-name` on KATEGORI cell, `rate-override-old` on strikethrough span
- All 10 columns fit A4 landscape width ✅ · Header mechanic name contained ✅

### Patch v1: Print Overflow Fix (2026-05-11)
**Commit**: 37f8862 · "M005 patch: fix slip print overflow — compress columns + shorten non-critical"
- `src/styles/print.css`: slip-table compression (9pt body, 8pt headers, 8.5pt mono, 4px/5px padding, 44px min TGL)
- `SlipTable.tsx`: added classNames per cell (`col-tgl`, `col-noref-full/short`, `col-customer`, `meta-motor`, `col-mono`, `col-komisi`)
- Dual no-ref spans: full form on screen, `…-NNN` shortened on print (CSS toggle)
- Customer: max-width 90px truncate + motor type hidden in print
- `utils.ts`: `shortenNoRef()` helper ("TRX-20260510-008" → "…-008")
- Verified: 10-column table fits A4 portrait 794px width ✅

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

---

## M006-V2 — Supabase Backend Integration 🔄

**Strategy**: Supabase (Auth + Postgres + RLS) — replaces original Hono+Neon+Drizzle plan.
**Re-strategy rationale**: Skip custom API server entirely. Supabase provides auth + database + realtime out of the box, deployed to Vercel as pure FE. Zero serverless function issues.

**Pre-work done manually (2026-05-11)**:
- ✅ Supabase project "nq21-prod" (Singapore region)
- ✅ 13 tables deployed via SQL Editor (profiles, customers, suppliers, categories, mechanics, commission_rates, commission_periods, commission_payouts, transactions, transaction_lines, transaction_line_mechanics, bubut_luar_links, audit_logs)
- ✅ RLS policies enabled (permissive: authenticated full access)
- ✅ 2 auth users: owner@nq21.app (Pak Doni, owner) · kasir@nq21.app (Alip, kasir)
- ✅ 2 profiles rows inserted + linked to auth users
- ✅ Vercel env vars added: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

**Task Tracker**:

- [x] **M006-V2-T1**: Supabase client + auth migration ✅ (2026-05-11)
  - `@supabase/supabase-js` installed
  - `src/lib/supabase.ts`: createClient from VITE_SUPABASE_* env vars
  - `src/store/auth.ts`: rewritten — Supabase `signInWithPassword`, `AuthProfile` shape (id, name, role, isActive, email)
  - `src/app/App.tsx`: `onAuthStateChange` listener — INITIAL_SESSION gates loading (replaces 300ms timer), inactive profile auto-signout, multi-tab sync
  - `src/app/pages/Login.tsx`: email-based form, async submit, inline server error, DEV email hint box
  - `src/components/layout/Sidebar.tsx`: displayName from auth profile directly (remove useUserStore cross-ref)
  - komisi pages: `user.username` → `user.name` in audit log userId fields
  - vite.config.ts: supabase vendor chunk (207kB raw / 53kB gzip isolated)
  - Build: ✅ 0 TS errors · index chunk 54.9kB gzip · supabase 53.6kB gzip
  - Commit: `6263ffb`

- [x] **M006-V2-T2.1**: Master Data reads migration ✅ (2026-05-12)
  - `src/features/categories/hooks.ts`: `useCategories()` — TanStack Query, snake_case types
  - `src/features/mechanics/hooks.ts`: `useMechanics()` + `useCommissionRates()`
  - `src/features/customers/hooks.ts`: `useCustomers()` + `useCreateCustomer()`
  - `src/features/suppliers/hooks.ts`: `useSuppliers()` + `useCreateSupplier()`
  - TransactionForm, LineItemCard, MechanicChipRow, CustomerSupplierAutocomplete, InlineCreateDialog, TransactionSummary — all 4 Zustand master reads → Supabase hooks
  - utils.ts type signatures: all camelCase Zustand types → inline snake_case structural types
  - Known issue (low priority): Multi-tab cascade logout dalam same window. Defer post-T3. (See CLAUDE.md Decision Log)

- [ ] **M006-V2-T3**: Transactions migration — CRUD + Bubut Luar dual-leg
  - [x] T3.0: Master data reads in TransactionForm ✅ (done in T2.1 above)
  - [ ] T3.1.1: Transaction list + detail read-only (DaftarTransaksiPage + DetailTransaksiPage)
  - [ ] T3.1.2: Transaction CRUD writes (create/update/delete via Supabase)
  - [ ] T3.2: Bubut Luar dual-leg save (Supabase transaction)
- [ ] **M006-V2-T4**: Commission periods + payouts migration
- [ ] **M006-V2-T5**: Audit log migration
- [ ] **M006-V2-T6**: E2E verification + tag vM006-V2

**JANGAN gas T2 sebelum T1 verified work** — multi-device sync = critical milestone.

---

## M006-V1 — Backend Integration ⏸ DEFERRED (archived)

**Status**: Rolled back to vM007 state (2026-05-11). Superseded by M006-V2 Supabase strategy.

**Lesson learned**: Vercel Node serverless + ESM + Hono infra walls — Edge runtime/CJS/ESM/file-based routing issues. 3+ hours, unresolved.

**Schema + Neon DB**: Archived. Migration file in git reflog (`6b4de93`).

---

## Milestone History

- **M001** ✅ 2026-05-10 — Design foundation, app shell, dashboard live
- **M002** ✅ 2026-05-11 — Master Data UI, 5 pages CRUD live
- **M003** ✅ 2026-05-11 — Transaction input form (multi-line, Bubut Luar, inline create)
- **M004** ✅ 2026-05-11 — Dashboard live data + 4 Laporan + Daftar/Detail/Edit Transaksi
- **M005** ✅ 2026-05-11 — Komisi weekly periods + payouts + slip print
- **M007** ✅ 2026-05-11 — PWA installable + offline + lazy loading + polish
- **M006-V2-T1** ✅ 2026-05-11 — Supabase auth migration (email login, profiles, onAuthStateChange)
- **M006-V2-T2.1** ✅ 2026-05-12 — Master data reads (customers/suppliers/categories/mechanics) migrated to Supabase hooks in TransactionForm
