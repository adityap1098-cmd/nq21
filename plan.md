# NQ21 PERFORMANCE — Project Plan

> Back-office tracking & operations app untuk bengkel motor NQ21.
> Fokus: akurasi pencatatan transaksi → pembagian komisi mekanik mingguan + visibility cash flow ke owner.

---

## 1. Overview

NQ21 PERFORMANCE adalah aplikasi pencatatan transaksi internal untuk bengkel NQ21. Kasir input data dari nota fisik / aplikasi kasir frontline (yang ngeluarin nota ke customer) ke sistem ini berdasarkan **nomor referensi nota** tersebut.

**BUKAN aplikasi kasir frontline.** Tidak generate kuitansi, tidak handle antrian, tidak print nota. Tujuan utama:

1. Cash flow tracking yang rapi (in/out, per kategori, per metode pembayaran)
2. Akurasi data jasa per mekanik → otomatisasi perhitungan komisi
3. Tutup periode mingguan → slip bagi hasil per mekanik
4. Pemisahan laporan untuk Dyno (kategori khusus owner)

> **Visual reference**: lihat `demo.html` untuk tampilan lengkap UI/UX yang udah locked. Demo ini jadi acuan saat M001-M005 FE development.

> **Pendekatan development**: **FE-first**. Build seluruh UI dulu pakai mock data (Zustand) → deploy prototype → user testing sama kasir → iterasi UX → baru bikin BE. Alasan: aplikasi internal harian, UX harus tested sebelum invest BE.

### Pengguna

- **Owner** — full access: semua laporan, master data, fitur tutup periode komisi, lihat audit log
- **Kasir** — input transaksi, edit transaksi (audit logged), lihat list transaksi

### Stack

**Frontend (M001-M005)**
- React 18 + Vite + TypeScript
- Tailwind v3 + shadcn/ui
- **State (FE-only phase)**: Zustand untuk in-memory mock data
- **State (BE-integrated)**: TanStack Query untuk server state
- React Hook Form + Zod untuk form validation
- date-fns (locale `id`)
- Recharts atau Chart.js untuk visualisasi

**Backend (M006+)**
- Hono backend, deploy bareng FE atau separate
- PostgreSQL via Neon (free tier)
- Drizzle ORM
- Session-based auth, 2 role

**PWA (M007)**
- Service worker + manifest
- Dexie.js untuk offline mode (kasir tetap bisa input pas internet mati)

**Deploy**
- Vercel (frontend) + Neon (database)

---

## 2. Domain Model

### 2.1 Master Data

**users**
- `id`, `name`, `username` (unique), `password_hash`, `role` (`owner` | `kasir`), `is_active`, `created_at`

**customers**
- `id`, `name`, `phone` (nullable), `notes`, `created_at`

**suppliers**
- `id`, `name`, `phone` (nullable), `notes`, `created_at`
- Termasuk vendor bubut luar

**categories**
- `id`, `name`, `type` (`income` | `expense`), `is_jasa` (bool — flag kategori yang punya komisi mekanik), `is_active`, `created_at`
- **Default income**: Jasa, Oli, Dyno, Sparepart, Bubut Luar, Bubut Dalam
- **Default expense**: Gaji, Beli Stok Oli, Beli Stok Sparepart, Listrik & Air, Sewa, Bayar Vendor Bubut, Lain-lain
- `is_jasa = true` untuk: Jasa, Dyno, Bubut Luar, Bubut Dalam (kategori yang ada mekanik kerja)

**mechanics**
- `id`, `name`, `is_active`, `notes`, `created_at`

**commission_rates** (matrix mekanik × kategori)
- `id`, `mechanic_id`, `category_id`, `rate_percent` (decimal 0-100)
- Unique on `(mechanic_id, category_id)`
- Hanya valid untuk kategori dengan `is_jasa = true`

### 2.2 Transactional

**transactions** (header)
- `id`, `no_referensi` (**unique, required** — entry point input)
- `tgl_transaksi`, `tipe` (`income` | `expense`)
- `customer_id` (nullable, required jika income)
- `supplier_id` (nullable, required jika expense — kecuali kategori internal seperti Gaji)
- `payment_method` (`cash` | `transfer` | `qris`)
- `total_nominal` (auto-calc dari sum line)
- `notes`, `created_by`, `created_at`, `updated_at`, `deleted_at` (soft delete)

**transaction_lines**
- `id`, `transaction_id`, `category_id`
- `nominal` (integer Rupiah, > 0)
- `biaya_material` (nullable, default 0 — basis pemotongan komisi)
- `notes`

**transaction_line_mechanics** (untuk line dengan kategori `is_jasa`)
- `id`, `transaction_line_id`, `mechanic_id`
- `share_percent` (decimal — split antar mekanik kalau >1, sum harus 100% per line)
- Komisi = `(nominal − biaya_material) × (share_percent / 100) × commission_rate(mechanic, category)`

**bubut_luar_links**
- `id`, `revenue_line_id` (line dari transaksi customer, kategori "Bubut Luar")
- `expense_transaction_id` (auto-generated expense ke vendor)
- `vendor_cost` (biaya yang dibayar ke vendor)
- Margin tersirat = `revenue_line.nominal − vendor_cost`

**audit_logs**
- `id`, `user_id`, `action` (`create` | `update` | `delete`)
- `entity_type`, `entity_id`
- `before_data` (jsonb), `after_data` (jsonb)
- `created_at`

**commission_periods**
- `id`, `week_start` (Senin), `week_end` (Minggu)
- `status` (`open` | `closed`)
- `closed_by`, `closed_at`

**commission_payouts**
- `id`, `period_id`, `mechanic_id`
- `total_basis` (sum basis komisi periode tsb)
- `total_komisi`
- `status` (`pending` | `paid`)
- `paid_at`, `paid_notes`

---

## 3. Formula Komisi (KUNCI)

```
basis_komisi = nominal_jasa − biaya_material
komisi_per_mekanik = basis_komisi × (share_percent / 100) × rate(mekanik, kategori)
```

**Contoh**: Pasang Kanvas Rem Rp200.000, biaya material Rp50.000.
- Mekanik Budi sendirian (share 100%), rate Jasa Budi = 30% *(per master rate matrix di demo)*.
- Komisi Budi = (200.000 − 50.000) × 1.0 × 0.30 = **Rp45.000**

**Contoh 2 mekanik**: Service besar Rp500.000, biaya material Rp100.000.
- Mekanik Budi 60%, Andi 40%. Rate Jasa: Budi 30%, Andi 25%.
- Basis = 400.000
- Budi: 400.000 × 0.6 × 0.30 = Rp72.000
- Andi: 400.000 × 0.4 × 0.25 = Rp40.000

---

## 4. Bubut Luar — Dual-Leg Auto

Saat kasir input transaksi customer dengan kategori "Bubut Luar":
1. Form tampilkan field tambahan: **Vendor Bubut** (pilih dari supplier), **Biaya ke Vendor**
2. Saat submit:
   - Buat `transaction` income normal (header customer)
   - **Auto-create** `transaction` expense dengan:
     - No referensi: `<no_ref_asli>-VENDOR`
     - Tgl: sama
     - Tipe: expense, supplier: vendor bubut
     - Line: kategori "Bayar Vendor Bubut", nominal = biaya ke vendor
   - Insert row di `bubut_luar_links` untuk linking
3. Edit/delete revenue line otomatis cascade ke expense link (dengan konfirmasi)

---

## 5. Output Laporan

> **Naming standard**: 4 laporan ini namanya konsisten di seluruh app (sidebar, route, dokumentasi). Lihat juga Section 7 untuk routing.

### Laporan #1 — Per Kategori
*Pendapatan & Pengeluaran per kategori*
- Filter: date range (default bulan ini)
- Tabel grouped: kategori → total nominal, jumlah transaksi
- Pisah section income & expense (side-by-side)
- Grand total per section
- Panel laba kotor besar di bawah (selisih income − expense)
- Export CSV

### Laporan #2 — Cash Flow
*Aliran kas kronologis dengan saldo berjalan*
- List kronologis: tgl, no referensi, customer/supplier, kategori, masuk/keluar, nominal, payment method
- Filter: date range, payment method, tipe (in/out)
- Saldo running per row
- Summary: total in, total out, saldo bersih
- Export CSV

### Laporan #3 — Jasa & Mekanik
*Rincian setiap jasa: customer, mekanik yang ngerjain, basis komisi, komisi*
- KPI cards 4 mekanik di atas (total nominal, basis, komisi minggu ini)
- List per line jasa: tgl, no referensi, customer, kategori jasa, nominal, biaya material, basis, mekanik(s) + share%, komisi per mekanik
- Filter: date range, per mekanik (chip dengan avatar), per kategori
- Support multi-mekanik per line (1 baris bisa display 2+ mekanik dengan share% masing-masing)
- Footer total: grand nominal, basis, komisi
- Export CSV / PDF

### Laporan #4 — Dyno
*Khusus kategori Dyno — tgl, customer, nominal*
- Hero card hitam dominant: total sesi, total revenue, rata-rata per sesi
- List: tgl+jam, no referensi, customer, mekanik operator (kalau ada), payment method, nominal
- Filter: date range
- Footer total
- Mini insight: top operator dyno + bar chart sesi per tanggal
- Export CSV

### Bonus — Dashboard Owner
- KPI cards: revenue minggu ini, pengeluaran minggu ini, laba kotor, total komisi pending payout
- Top kategori bulan ini (progress bar style)
- Cash flow bar chart 7 hari (in vs out)
- List 5 transaksi terbaru

---

## 6. Modul Komisi Mingguan

### Periode
- Default: **Senin – Minggu**
- Auto-create periode baru tiap minggu (cron atau on-demand)
- Status awal: `open`

### Halaman Periode
- List periode (open & closed)
- Klik periode → detail:
  - List semua line jasa di periode tsb
  - Summary per mekanik (basis, komisi)
  - Tombol "Tutup Periode" (owner only)

### Tutup Periode
- Validasi: semua transaksi periode tsb sudah final (warn kalau ada draft)
- Lock: transaksi periode tsb nggak bisa di-edit lagi (kecuali emergency override owner)
- Generate `commission_payouts` per mekanik
- Status periode → `closed`

### Slip Bagi Hasil
- Per mekanik per periode: printable / export PDF
- Format: nama mekanik, periode, list jasa (tgl, customer, basis, share, komisi), total
- Tracking payout: pending → paid (input tgl bayar oleh owner)

---

## 7. Page Inventory & Routing

Total halaman unik yang akan dibangun: **~18 halaman** (atau ~12-14 routes kalau modal/drawer dipakai untuk hal-hal kecil).

### Status saat ini
- ✅ **10 halaman** sudah ada di `demo.html` sebagai visual reference
- ⏳ **8 halaman** masih perlu dibangun (mostly master CRUD + detail/edit transaksi)

### Daftar Lengkap Halaman

#### A. Auth (1 halaman)
| # | Halaman | Route | Status | Milestone |
|---|---------|-------|--------|-----------|
| 1 | Login | `/login` | ✅ Demo | M001 |

#### B. Dashboard (1 halaman)
| # | Halaman | Route | Status | Milestone |
|---|---------|-------|--------|-----------|
| 2 | Dashboard Owner | `/` | ✅ Demo | M001 (skeleton) → M004 (full) |

#### C. Modul Transaksi (4 halaman)
| # | Halaman | Route | Status | Milestone |
|---|---------|-------|--------|-----------|
| 3 | Input Transaksi Baru | `/transaksi/baru` | ✅ Demo | M003 |
| 4 | Daftar Transaksi | `/transaksi` | ✅ Demo | M003 |
| 5 | Detail Transaksi | `/transaksi/:id` | ⏳ Build | M003 |
| 6 | Edit Transaksi | `/transaksi/:id/edit` | ⏳ Reuse form #3 | M003 |

#### D. Modul Laporan (4 halaman)
| # | Halaman | Route | Status | Milestone |
|---|---------|-------|--------|-----------|
| 7 | Laporan #1 Per Kategori | `/laporan/kategori` | ✅ Demo | M004 |
| 8 | Laporan #2 Cash Flow | `/laporan/cash-flow` | ✅ Demo | M004 |
| 9 | Laporan #3 Jasa & Mekanik | `/laporan/jasa` | ✅ Demo | M004 |
| 10 | Laporan #4 Dyno | `/laporan/dyno` | ✅ Demo | M004 |

#### E. Modul Komisi (3 halaman)
| # | Halaman | Route | Status | Milestone |
|---|---------|-------|--------|-----------|
| 11 | Periode Mingguan | `/komisi/periode` | ✅ Demo | M005 |
| 12 | Detail Periode (drill-down) | `/komisi/periode/:id` | ⏳ Build | M005 |
| 13 | Slip Bagi Hasil per Mekanik | `/komisi/slip/:periodId/:mekanikId` | ⏳ Preview di demo | M005 |

#### F. Master Data (5 halaman)
| # | Halaman | Route | Status | Milestone |
|---|---------|-------|--------|-----------|
| 14 | Master Customer | `/master/customer` | ⏳ Build | M002 |
| 15 | Master Supplier | `/master/supplier` | ⏳ Build | M002 |
| 16 | Master Kategori | `/master/kategori` | ⏳ Build | M002 |
| 17 | Master Mekanik & Rate Komisi | `/master/mekanik` | ✅ Demo | M002 |
| 18 | Master User/Akun (owner only) | `/master/user` | ⏳ Build | M002 |

#### G. Optional / Nice-to-have
- Settings/Profile (`/settings`) — ganti password, preferensi
- Audit Log Viewer (`/audit`) — owner only

### Reuse Pattern (Hemat Effort)

- **#5 Detail + #6 Edit Transaksi**: 1 form component dengan mode prop (`new` | `view` | `edit`). Hemat ~50% effort.
- **#14 Customer + #15 Supplier + #16 Kategori**: 3 halaman ini patternnya sama (list table + add/edit modal). Bikin 1 reusable `<MasterCRUDPage>` component → pass schema prop. Hemat banget.
- **#13 Slip**: tinggal jadiin route printable dari komponen yang udah ada di demo periode komisi.

### Mapping per Milestone

| Milestone | Halaman yang dibangun |
|-----------|----------------------|
| **M001** Design Foundation | #1 Login, #2 Dashboard skeleton, App Shell (sidebar+topbar) |
| **M002** Master Data UI | #14, #15, #16, #17, #18 (5 halaman master, banyak reuse) |
| **M003** Transaksi UI | #3, #4, #5, #6 (4 halaman transaksi) |
| **M004** Laporan & Dashboard | #2 full Dashboard, #7, #8, #9, #10 (4 laporan) |
| **M005** Komisi UI | #11, #12, #13 (3 halaman komisi) |

**Estimasi FE total (M001-M005)**: ~10-14 hari fokus.

---

## 8. Milestone Breakdown (FE-first)

**Strategi**: M001-M005 build seluruh UI dengan mock data → deploy prototype → user testing → M006 wire backend → M007 PWA polish.

### M001 — Design Foundation
- [ ] Setup React + Vite + TypeScript + Tailwind + shadcn/ui
- [ ] Implementasi design system dari `demo.html` (color tokens, typography, spacing)
- [ ] Layout shell: sidebar persistent (role-aware) + topbar context-aware
- [ ] Component library dasar: Button, Input, Card, Badge, Table, Modal
- [ ] Login page dengan mock auth (langsung redirect ke dashboard)
- [ ] Setup Zustand store untuk mock data (master + transactions)
- [ ] Definition of Done: app shell jadi, navigation antar halaman jalan, login mock OK

### M002 — Master Data UI
- [ ] Halaman master Customer (list, add, edit, search)
- [ ] Halaman master Supplier
- [ ] Halaman master Kategori (income/expense, flag is_jasa)
- [ ] Halaman master Mekanik dengan rate matrix (% per kategori, inline edit)
- [ ] Mock data realistic Indonesia (5 customer, 4 supplier, 4 mekanik, kategori default)
- [ ] Definition of Done: semua master CRUD jalan dengan mock data, persisten di Zustand

### M003 — Transaksi UI ⭐
- [ ] Form input transaksi (3-step: no referensi → header → line items)
- [ ] No referensi validation real-time (cek duplicate dari mock store)
- [ ] Type toggle income/expense (auto-switch customer/supplier label)
- [ ] Multi-line items dengan add/remove
- [ ] Untuk line `is_jasa`: mekanik chip dengan share% editable
- [ ] Auto-calc: total transaksi + komisi per mekanik (real-time hint)
- [ ] Sticky total panel di kanan dengan breakdown
- [ ] Bubut Luar smart input: 1 form → mock auto-create expense linked
- [ ] List transaksi dengan filter (tipe, periode, search no referensi)
- [ ] Detail view + edit transaksi (mock audit log entry)
- [ ] Definition of Done: kasir bisa input cepat, multi-line jalan, komisi auto-calc benar

### M004 — Laporan & Dashboard UI
- [ ] **Laporan #1 Per Kategori** (split section income/expense, panel laba kotor)
- [ ] **Laporan #2 Cash Flow** (kronologis, saldo running, filter payment method)
- [ ] **Laporan #3 Jasa & Mekanik** (KPI per mekanik + table rincian, support multi-mekanik per line)
- [ ] **Laporan #4 Dyno** (hero card, table tgl-customer-mekanik-nominal, mini insight chart)
- [ ] Dashboard Owner: KPI cards, bar chart cash flow 7 hari, top kategori, recent transactions
- [ ] Export CSV per laporan (mock download)
- [ ] Filter periode konsisten di semua laporan
- [ ] Definition of Done: 4 laporan + dashboard akurat dari mock data, angka match

### M005 — Komisi UI
- [ ] Halaman Periode Mingguan: card periode aktif (highlight) + list periode lalu
- [ ] Detail periode aktif: summary 4 mekanik, total komisi berjalan
- [ ] Tombol "Tutup Periode" → mock generate slip
- [ ] Slip bagi hasil per mekanik: format printable, table per jasa, total komisi
- [ ] Tracking status payout (pending → paid)
- [ ] Definition of Done: 1 siklus komisi mingguan flow end-to-end dengan mock

### 🚀 Deploy Prototype FE → User Testing
- [ ] Deploy ke Vercel (FE-only build)
- [ ] Demo ke kasir & owner
- [ ] Catat feedback UX, iterasi seperlunya
- [ ] Lock UX → lanjut backend

### M006 — Backend Wiring
- [ ] Setup Hono + Neon + Drizzle
- [ ] Schema migration (lihat Section 2 Domain Model)
- [ ] Auth real (session, role middleware)
- [ ] API endpoints per resource
- [ ] Replace mock Zustand layer dengan TanStack Query → API
- [ ] Audit log table + handler
- [ ] Bubut Luar dual-leg auto-create di backend
- [ ] Tutup periode + generate `commission_payouts`
- [ ] Definition of Done: semua flow yang sebelumnya mock sekarang persistent di Neon

### M007 — PWA & Polish
- [ ] Service worker + manifest
- [ ] Dexie offline: cache master data, queue transaksi offline, sync online
- [ ] Polish UI: keyboard shortcuts (Tab, Ctrl+Enter), toast feedback, loading states
- [ ] Setup Neon production
- [ ] Smoke test full flow
- [ ] Owner training / handover doc

**Estimasi**:
- M001-M005 (FE): ~10-14 hari fokus
- Deploy prototype + user testing: 2-3 hari
- M006-M007 (BE + PWA): ~5-7 hari
- **Total**: ~3 minggu solo dengan Claude CLI

---

## 9. UX Catatan Penting

- **Input speed > pretty UI.** Kasir bakal input 20-50+ transaksi per hari.
- Form keyboard-friendly: Tab antar field, Enter submit, Esc close
- Customer/supplier pakai autocomplete dengan create-on-the-fly
- Kategori: dropdown atau searchable select
- No referensi = field pertama, validate duplicate sebelum lanjut
- 80% transaksi single-line — UX harus optimal untuk 1 line, tapi support multi-line
- Format mata uang: `Rp` + thousand separator (id-ID locale)
- Tanggal: `DD MMM YYYY` (default today)
- Validasi inline real-time, jangan toast spam

---

## 10. Validation Rules (jangan break)

- `no_referensi`: required, unique global, max 50 char
- Transaksi income: `customer_id` required
- Transaksi expense: `supplier_id` required (kecuali kategori internal seperti Gaji)
- Per line: `nominal > 0`
- `biaya_material` ≤ `nominal` per line
- Per line jasa: minimal 1 mekanik
- Sum `share_percent` per line jasa = 100 (toleransi ±0.01)
- Commission rate: 0 ≤ rate ≤ 100
- Tutup periode: nggak bisa unlock (one-way), kecuali manual SQL override

---

## 11. Out of Scope (versi awal)

- Inventory / stok management
- Print kuitansi / nota
- Customer history servis (motor, jadwal servis)
- WhatsApp / Email notifikasi
- Multi-cabang
- Integrasi ke aplikasi kasir frontline (opsi nanti)
- Mobile native app
- Analitik advance (forecasting, trend)
- Multi-currency

---

## 12. Design System (LOCKED — sumber: bundle + demo.html)

### Aesthetic Direction
**Refined Industrial / Workshop Modern** — clean minimal dengan racing accent. Bukan corporate generic, bukan playful kartun. Vibe-nya: workshop yang professional, presisi, no-nonsense.

### Typography
- **Display** (heading, page title, KPI value): **Anton** — condensed bold sans, automotive feel
- **Body** (UI text, labels): **Manrope** 400-800
- **Mono** (angka, no referensi, table cells): **JetBrains Mono** 400-600
- Semua dari Google Fonts (free)

**CSS font variables (LOCKED):**
```css
--display: 'Anton', 'Bebas Neue', sans-serif;
--body: 'Manrope', system-ui, sans-serif;
--mono: 'JetBrains Mono', ui-monospace, monospace;
```

**Body defaults:** `font-size: 14px`, `line-height: 1.45`

### Color Tokens (CSS variables)

```css
--bg: #FAFAF7;            /* Background utama (bone) */
--surface: #FFFFFF;       /* Card surface */
--surface-alt: #F5F3EE;   /* Hover/alt surface */
--surface-deep: #EFEBE0;  /* Heavier surface */
--border: #E5E1D8;
--border-strong: #C9C3B6;
--text: #0A0908;          /* Almost black, warm */
--text-secondary: #4A4540;
--text-muted: #8B857A;
--accent: #C8102E;        /* Racing red — sparingly */
--accent-dark: #A00D24;
--accent-tint: #FBE9EC;
--success: #1E7A50;
--success-tint: #E6F2EC;
--warning: #B86E00;
--warning-tint: #FBF1D9;
```

### Spacing & Layout
- Sidebar: 240px persistent left, light theme (`--surface`, `border-right: 1px solid --border`)
- Topbar: 64px sticky top
- Page container: 32px padding, max-width 1400px
- Card border-radius: 10px, button/input: 6px
- **Responsive breakpoints**: 1180px (KPI grid 2-col), 1100px (single column, topbar collapses)
- **Login page**: split grid `1.05fr / 0.95fr`, dark left panel + clean form right

### Key Component Patterns
- **Page header**: 3px × 32px accent bar (red) + Anton heading 36px + muted subtitle
- **KPI card**: padding 22px, hover lift -2px + border darken
- **Type toggle (income/expense)**: pill style, green/red active state
- **Mechanic chip**: rounded 20px, share% editable inline
- **Sticky total panel**: hitam dominant, accent untuk komisi line
- **Filter pills**: subtle border, active state hitam
- **Table**: row hover surface-alt, border-bottom only
- **Badge**: 10px font, 0.04em letter-spacing, type-coded color
- **Sidebar section heading**: color `--accent` (merah), 10px mono uppercase, `letter-spacing: 0.12em`
- **Sidebar logo mark**: 36×36px hitam, strip merah accent 3px di bawah-kiri
- **Topbar features**: search global (⌘K), period pill, notification bell, CTA action button
- **Page placeholder**: card centered, mono "COMING SOON" eyebrow + Anton page title + helper text

### Don't Do
- Tidak pakai Inter/Roboto/Arial (generic)
- Tidak pakai purple gradient (AI cliche)
- Tidak pakai pure white background (terlalu klinis)
- Tidak pakai shadow tebal
- Accent merah cuma emphasis (KPI penting, periode aktif, komisi number) — jangan dipakai berlebihan

---

## 13. Open Questions — RESOLVED (2026-05-10)

- ✅ **Format `no_referensi`**: `TRX-YYYYMMDD-NNN` (income) + `EXP-YYYYMMDD-NNN` (expense). Sortable ISO format. Display di UI pakai DateDisplay format Indonesian. Max 50 char, unique global. *Locked M001.*
- ✅ **Periode komisi**: Senin – Minggu (default). *Locked pre-M001.*
- ✅ **Mekanik awal**: 1 mekanik — "Doni". Owner tambah sisanya via Master Mekanik UI (M002). Seed 1 mekanik sudah cukup untuk demo flow. *Locked M001-closer.*
- ✅ **Kategori Gaji**: tidak link ke mekanik master — free text notes. Gaji bukan komisi system. *Locked M001.*
- ✅ **Export PDF (slip bagi hasil)**: jsPDF di FE. Defer ke M005. *Locked default.*
- ✅ **Brand / Logo**: Mark "N" 36×36px, bg `--text` (hitam), teks Anton 18px putih, strip 3px `var(--accent)` di bawah, corner-radius 6. Tidak ada upload file logo. *Locked M001.*
- ✅ **Resolusi target**: 1920×1080 minimum sweet spot, support down to 1440×900. Responsive breakpoints: 1180px (KPI 2-col), 1100px (single col). *Locked M001.*
- ✅ **Input device**:
  - Kasir: keyboard + mouse (PC desktop di bengkel) → form density tinggi, optimal kecepatan input
  - Owner: touchscreen-aware (tablet/iPad untuk monitoring) → tap target min 44px di halaman owner-heavy (Dashboard, Laporan, Periode Komisi)
  - *Locked M001.*
---

**Status**: Plan v1.3 — M001 complete (2026-05-10). All Section 13 decisions locked. Siap M002.
