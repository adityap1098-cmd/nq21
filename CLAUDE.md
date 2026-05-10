# CLAUDE.md — NQ21 PERFORMANCE

Workflow rules untuk Claude CLI saat develop project ini. Baca file ini DULU sebelum kerjain task apapun.

## Project Snapshot

Back-office tracking app untuk bengkel motor NQ21. Standalone, fokus akurasi data komisi mekanik mingguan. **Bukan POS frontline.**

- Spec lengkap: lihat `plan.md`
- **Page inventory & routing**: `plan.md` Section 7 — daftar lengkap 18 halaman dengan route + status (✅ udah ada di demo / ⏳ perlu dibangun) + mapping ke milestone
- **Visual reference (LOCKED)**: 2 sumber — pakai sesuai halaman yang sedang dibangun:
  - `design/project/NQ21 Performance.html` (+ JSX files) → Login, Dashboard, 4 Laporan
  - `demo.html` → Input Transaksi, Master Data (Customer/Supplier/Kategori/Mekanik/User), Komisi
  - Design tokens (color, typography, spacing): unified dari bundle, apply ke semua halaman
  - Sebelum bikin component: baca source file relevan dari `design/project/` atau `demo.html` dan match pixel-perfect
- **Design tokens (LOCKED)**: lihat `plan.md` Section 12 — color CSS variables, typography stack, spacing rules
- Progress tracking: lihat `PROGRESS.md`
- Schema source of truth (M006+): `src/db/schema.ts` (Drizzle)

## Pendekatan: FE-first

Build seluruh UI dengan mock data (Zustand) di M001-M005. Deploy prototype → user test sama kasir → lock UX → baru bikin BE di M006-M007. **Jangan bikin BE sebelum FE selesai dan ditest user.**

Mock data layer (Zustand) harus mirror schema yang ada di `plan.md` Section 2 — biar saat M006 swap ke real API, perubahan minimal.

---

## Workflow Rules (GSD Methodology)

### Per Sesi
1. Baca `plan.md` (skim) dan `PROGRESS.md` (full) sebelum mulai
2. Pastikan tau lagi di milestone mana, task apa yang aktif
3. Kerjakan 1 task → commit → update PROGRESS.md → next task
4. **Jangan loncat milestone.** Selesaikan M00X penuh sebelum lanjut M00(X+1).

### Commit Convention
- Format: `M00X: <singkat task description>`
- Contoh: `M002: form input transaksi multi-line`
- Per milestone selesai: tag `vM00X`, tulis summary di PROGRESS.md

### Sub-task Discipline
- Sebelum mulai milestone, breakdown task di PROGRESS.md
- Cek satu-satu pas selesai
- Kalau ada blocker, catat di PROGRESS.md jangan ngacir ke task lain

---

## Naming Standards (LOCKED — jangan rename)

### Transaction Type Display Labels
- `income` → display **"MASUK"** (badge, tabel, filter)
- `expense` → display **"KELUAR"**
- Code-level tetap `'income'` / `'expense'` — jangan rename di store/schema/API

### 4 Laporan
Naming konsisten di seluruh app (sidebar, route, kode, dokumentasi):

| # | Display Name | Route |
|---|--------------|-------|
| 1 | **Per Kategori** | `/laporan/kategori` |
| 2 | **Cash Flow** | `/laporan/cash-flow` |
| 3 | **Jasa & Mekanik** | `/laporan/jasa` |
| 4 | **Dyno** | `/laporan/dyno` |

### Sidebar Nav Labels (MASTER section — short form, tanpa prefix "Master")

| Sidebar Label | Route |
|---------------|-------|
| **Customer** | `/master/customer` |
| **Supplier** | `/master/supplier` |
| **Kategori** | `/master/kategori` |
| **Mekanik & Rate** | `/master/mekanik` |
| **User / Akun** | `/master/user` |

### Kategori Default (income)
Jasa, Oli, Dyno, Sparepart, Bubut Luar, Bubut Dalam.
Yang `is_jasa = true` (ada komisi mekanik): Jasa, Dyno, Bubut Luar, Bubut Dalam.

### Kategori Default (expense)
Gaji, Beli Stok Oli, Beli Stok Sparepart, Listrik & Air, Sewa, Bayar Vendor Bubut, Lain-lain.
Yang **tidak butuh supplier_id**: Gaji, Listrik & Air, Sewa, Lain-lain.

### No Referensi Format (LOCKED)
- Income: `TRX-YYYYMMDD-NNN` (e.g. `TRX-20260510-001`)
- Expense: `EXP-YYYYMMDD-NNN` (e.g. `EXP-20260510-001`)
- Counter `NNN`: per-hari, 3 digit, reset setiap hari
- Auto-linked expense (Bubut Luar): `<asli>-VENDOR` (e.g. `TRX-20260510-001-VENDOR`)

### Code Conventions
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- DB tables: `snake_case` plural (M006+)
- DB columns: `snake_case` (M006+)

---

## Code Conventions

### TypeScript
- Strict mode ON
- No `any` kecuali komentar penjelasan
- Prefer type inference, explicit annotation untuk public API

### Stack Specifics
- **shadcn/ui**: install components on-demand, jangan custom-build kalau shadcn punya
- **Tailwind**: utility classes; pakai CSS variables dari `plan.md` Section 12 untuk color tokens
- **Forms**: React Hook Form + Zod schema, no manual state
- **Server state (M006+)**: TanStack Query, jangan useState untuk data dari API
- **Mock state (M001-M005)**: Zustand store yang mirror schema `plan.md` Section 2
- **Date**: date-fns, locale `id`
- **Currency**: `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`
- **Money fields**: integer Rupiah (no decimal, no float), display dengan separator `.`
- **Typography**: Anton (display), Manrope (body), JetBrains Mono (numbers) — semua dari Google Fonts

### Folder Structure (FE-first version)

**M001-M005 (FE-only phase):**
```
src/
  app/              # Pages / routes
  components/       # Reusable UI (Button, Input, Card, etc)
  features/         # Domain features
    transactions/
      components/
      schema.ts     # Zod schemas
      hooks.ts
    mechanics/
    reports/
    commission/
    master/
  lib/              # Utilities (formatters, validators, dates)
  store/            # Zustand mock data stores (mirror plan.md Section 2)
  styles/           # Global CSS, Tailwind config
```

**M006+ (BE added):**
```
src/
  ... (semua di atas tetap)
  db/
    schema.ts       # Drizzle schema (source of truth)
    migrations/
  server/           # Hono backend handlers
  features/<feature>/api.ts  # API calls per feature
```

---

## Validation Rules (KUNCI — jangan break)

- `no_referensi`: required, unique global, max 50 char
- Transaksi income: `customer_id` required
- Transaksi expense: `supplier_id` required (kecuali kategori internal: Gaji, Listrik & Air, Sewa, Lain-lain)
- Per line: `nominal > 0`
- `biaya_material` ≤ `nominal` per line
- Per line jasa (`is_jasa=true` kategori): minimal 1 mekanik
- Sum `share_percent` per line jasa = 100 (toleransi ±0.01)
- Commission rate: 0 ≤ `rate_percent` ≤ 100
- Tutup periode: one-way lock, transaksi periode closed nggak bisa edit

---

## Formula Komisi (HAFAL)

```
basis_komisi = nominal_jasa − biaya_material
komisi_per_mekanik = basis_komisi × (share_percent / 100) × rate(mekanik, kategori)
```

Test case M004:
- Jasa Rp200.000, biaya material Rp50.000, Budi share 100%, rate Jasa 30%
- Expected komisi Budi = Rp45.000

---

## Bubut Luar Auto-Linking

Saat input transaksi customer kategori "Bubut Luar":
1. Form tampilkan field tambahan: vendor (supplier), biaya ke vendor
2. Submit → buat 2 record:
   - Income transaksi customer (normal)
   - Expense transaksi auto: no_ref `<asli>-VENDOR`, supplier vendor, kategori "Bayar Vendor Bubut", nominal = biaya vendor
3. Insert `bubut_luar_links` row untuk linking
4. Edit/delete revenue → konfirmasi cascade ke expense link

**Phase note**:
- **M003 (FE-only)**: implement step 2 di Zustand store — push 2 entries ke mock state, plus 1 entry di mock `bubutLuarLinks`
- **M006 (BE)**: pindah logic ke backend handler dengan transaction (atomic), pastikan rollback kalau salah satu insert gagal

---

## Periode Komisi

- Default: **Senin – Minggu**
- Tutup periode = lock + generate `commission_payouts`
- Slip per mekanik: printable, exportable PDF
- Status payout: `pending` → `paid` (manual oleh owner, input `paid_at`)

---

## Don't List

- ❌ **Inventory / stok tracking** — out of scope
- ❌ **Print kuitansi / generate nota** — out of scope (NQ21 ini back-office, bukan POS frontline)
- ❌ **Customer history servis** (riwayat motor, jadwal servis) — out of scope
- ❌ **Integrasi ke aplikasi kasir frontline** — out of scope
- ❌ **WhatsApp/Email notifikasi** — out of scope
- ❌ **Multi-cabang** — single workshop
- ❌ **Multi-currency** — IDR only
- ❌ **Mobile native app** — PWA cukup
- ❌ **Analitik advanced** (forecasting, trend prediction) — out of scope
- ❌ **Refactor di luar scope task aktif**
- ❌ **Install dependency baru** kecuali bener-bener perlu (cek package.json dulu)
- ❌ **Bikin BE sebelum M006** — FE-first, jangan loncat
- ❌ **Tulis unit test ekstensif** — happy-path manual cukup, kecuali utilities krusial (formula komisi, validators)
- ❌ **Komentar berlebihan** — code self-documenting via naming

---

## Decision Log

Catat keputusan teknis penting yang nggak obvious dari plan.md:

- (akan diisi seiring development)

---

## Tech Stack (LOCKED — match plan.md Section 1)

### Phase FE-only (M001-M005)
- **React 18** + **Vite** + **TypeScript strict**
- **Tailwind v3** + **shadcn/ui**
- **State (mock)**: **Zustand** — store mirror schema `plan.md` Section 2
- **Form**: React Hook Form + Zod
- **Date**: date-fns (locale `id`)
- **Charts**: Recharts atau Chart.js
- **Routing**: React Router

### Phase BE-integrated (M006+)
- Tambah: **Hono** backend, **PostgreSQL via Neon**, **Drizzle ORM**
- Replace Zustand mock dengan **TanStack Query** untuk server state
- Auth: session-based, 2 role (owner, kasir)

### Phase PWA (M007)
- Service worker + manifest
- **Dexie.js** untuk offline mode (cache master + queue transaksi offline)

### Deploy
- **Vercel** (frontend) + **Neon** (database)

---

## Kasus Edge Penting

1. **Multi-mekanik dengan rate beda**: pastikan komisi dihitung per mekanik (bukan rate rata-rata)
2. **Biaya material > nominal**: tolak save (validasi)
3. **No referensi duplicate**: tampilkan transaksi yang udah ada, tanya mau edit?
4. **Edit transaksi yang udah masuk periode closed**: blokir, kasih warning kalau coba
5. **Delete revenue line bubut luar**: confirm + cascade ke expense link
6. **Mekanik dihapus tapi punya komisi pending**: soft delete (is_active=false), jangan hard delete
7. **Kategori dihapus**: soft delete, transaksi historis tetep aman
8. **Offline → online sync conflict**: last-write-wins, tapi warning kalau no_referensi udah ada di server
