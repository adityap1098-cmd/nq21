# CLAUDE.md — NQ21 PERFORMANCE

Workflow rules untuk Claude CLI saat develop project ini. Baca file ini DULU sebelum kerjain task apapun.

## Project Snapshot

Back-office tracking app untuk bengkel motor NQ21. Standalone, fokus akurasi data komisi mekanik mingguan. **Bukan POS frontline.**

- Spec lengkap: lihat `plan.md`
- **Page inventory & routing**: `plan.md` Section 7 — daftar lengkap 18 halaman dengan route + status (✅ udah ada di demo / ⏳ perlu dibangun) + mapping ke milestone
- **Visual reference (LOCKED)**: 3 sumber — pakai sesuai halaman yang sedang dibangun:
  - `design/project/` (v1) — `login.jsx`, `dashboard.jsx`, `laporan.jsx`, `styles.css` → Login, Dashboard, 4 Laporan
  - `design/v2/NQ21 PERFORMANCE/` (v2) — `pages-extra.jsx`, `styles-extra.css`, `data-pages.jsx` → Input Transaksi (M003), Periode Komisi + Slip (M005), Master Mekanik (M002)
  - `demo.html` — fallback → Daftar/Detail/Edit Transaksi, Master Customer/Supplier/Kategori/User
  - Design tokens: **identik di v1 dan v2** (color vars, Anton/Manrope/JetBrains Mono) — apply konsisten ke semua halaman
  - Sebelum bikin komponen: baca source file relevan dan match pixel-perfect
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

- **Password plain di Zustand (M002)**: `AppUser.password` disimpan plain text di localStorage mock store — acceptable untuk FE-only prototype. Di M006 (BE), hash via bcrypt sebelum simpan ke DB. Jangan expose password field ke API response.
- **Auth store User shape**: auth store hanya simpan `{ name, role }` — tidak ada `id` atau `username`. Match ke user store dilakukan via `name` (unique di seed). Di M006, auth session harus simpan `userId` untuk lookup yang proper.

- **M003 Decision D (REVISED)**: Inline create customer/supplier ENABLED di M003 — bukan defer ke M006. `InlineCreateDialog` opens dari autocomplete "+ Buat baru" option. Friction kasir terlalu tinggi kalau harus navigate ke /master dan lose form context. New entity langsung auto-selected setelah create.
- **M003 Decision F — No "libur" mekanik button**: Form T4 tidak punya toggle absen. Kasir cukup tidak menambahkan mekanik yang tidak hadir ke line item. Mengurangi kompleksitas UI.
- **M003 Decision G — Smart pre-fill mekanik (T4)**: Default mekanik pada line jasa baru = mechanics dari transaksi jasa terakhir kasir ybs (query store by userId + filter isJasa). Fallback: semua mekanik aktif. Implement di T4 saat MechanicChipRow dibuat.
- **M003 Decision H — Audit log mekanik per-field (T4)**: Perubahan mekanik di transaksi (share%, rate override, add/remove chip) → audit log `beforeData`/`afterData` per-field, source `'mekanik-update-transaksi'`. Bukan snapshot full transaksi. Implement di T4.
- **M003 Decision T7 — Bubut Luar dual-leg auto-create di FE phase**: Dilakukan via `addTransactionFull()` dalam Zustand transaction store — single call yang atomically creates income transaction + auto-expense (noRef `<asli>-VENDOR`) + `bubutLuarLinks` entry. No rollback needed (Zustand in-memory; kalau gagal = JS exception caught di handleSubmitForm). Di M006 (BE), logic ini dipindah ke backend dengan DB transaction untuk true atomicity.

- **M004-D1 — Charts**: Recharts. Warna income = `var(--text)` hitam, expense = `var(--accent)` merah. Match NQ21 palette konsisten.
- **M004-D2 — KPI Deltas**: Real week-over-week via `getKpiDeltas()` di selectors.ts. Display "+X.X%" kalau ada data prevPeriod (`hasComparison=true`). Sembunyikan delta row kalau tidak ada data prev. `prevPeriod` = closed period dengan weekStart paling baru sebelum activePeriod.
- **M004-D3 — CSV Export**: UTF-8 BOM prefix `\uFEFF` di semua CSV export — wajib untuk Excel Indonesia.
- **M004-D4 — Closed Period Komisi**: Dynamic dari `useCommissionStore().payouts` (bukan hardcode `1_980_000`). Fix dilakukan di T1.
- **M004-D5 — Period Filter Laporan**: Semua 4 laporan punya period filter bar. Default = active period. Pattern dibuat di T3, direplikasi T4-T6.
- **M004-D6 — Filter State**: `useState` lokal per halaman laporan. Tidak perlu Zustand global untuk filter UI state.
- **M004-D7 — Empty State Copy**: Per laporan — lihat PROGRESS.md M004 Decision D7.
- **M004-D8 — Print CSS**: Defer ke M007. M004 hanya browser view, tidak ada print styling.
- **M004-T1.6 — itemName universal**: Field `itemName` (ex-`jasaName`) sekarang muncul untuk SEMUA kategori, bukan hanya isJasa. Label/placeholder dinamis per kategori (`getItemNameLabel()`). Zustand persist `version: 2` + `migrate()` untuk auto-rename key di localStorage lama.
- **M004-T1.7 — Bell deferred**: Notification bell dihapus dari Topbar. Real-time notifikasi butuh BE/websocket infra — implement di M006+.
- **M004-T3.5 — Laporan grid stretch**: Panels pakai `display: grid; grid-template-columns: 1fr 1fr` + `minHeight: 380px` fallback. CSS Grid stretch auto-equalize tanpa flex hacks. Hint row muncul ketika `0 < rows.length < 5`.
- **M004-T3.5 — Command Palette**: Global search Ctrl+K/⌘K via `src/store/ui.ts` (Zustand, no persist). `CommandPalette.tsx` search 4 entities, max 6/group, keyboard nav via refs (avoid stale closure). Topbar search adalah clickable div (tidak real input) — real search di palette. Layout.tsx register global Ctrl+K handler.
- **M004-T6.5 — Detail transaksi button hierarchy**: Kembali (ghost/no-border) → Hapus (destructive red outline) → Edit (accent solid black). Edit rightmost = primary action highest emphasis.
- **M004-T6.5 — Daftar transaksi sortable**: Filter useMemo tanpa sort; `sortedFiltered` useMemo separate. Header cells clickable dengan ▲/▼ accent indicator. Default: tglTransaksi desc.
- **M004-T6.5 — Laporan grand total sticky**: Grand total div OUTSIDE `<tbody>`, sebagai sibling flex item di bawah table wrapper div. Kedua panel selalu sama Y karena CSS Grid stretch + flex-col.
- **M004-T7-patch — Detail info card**: Always 3-col (Party / Metode / Dibuat). Notes render BELOW row dengan `border-top: 1px dashed var(--border)`. Removed adaptive 2-col/3-col switching.
- **M004-T7-patch — Detail line items**: Jasa = 3-col grid + mechanic chips. Non-jasa = compact flex-row (`justify-content: space-between`) — NOMINAL label kiri, value kanan ~50% shorter card. Notes di bawah dashed separator.
- **M004-T7-patch — Detail periode section**: Compact inline flex-row: label · date range · badge · note text sejajar. Was stacked 2-row vertical.

- **M005-T2 — ClosePeriodDialog button color**: TUTUP PERIODE = `var(--accent)` red (not generic destructive). Warning friction dari yellow warning card sudah cukup.
- **M005-T3 — SlipPage outside Layout**: Route `/komisi/slip/:periodId/:mechanicId` di dalam ProtectedRoute tapi DI LUAR Layout — no sidebar/topbar. PrintLayout centering max-width 794px (A4).
- **M005-T4 — onMarkPaid callback pattern**: State `showMarkPaidDialog` + handler di PeriodeKomisiPage. SlipPaper terima `onMarkPaid?: () => void` prop saja. `markPaid(stored.id, now.toISOString(), user.username, notes)`.
- **M005-T5 — period filter 'all' lokal**: `usePeriodFilter` tidak support `'all'`. T5 pakai `useState<'all' | 'bulan-ini'>` lokal — cukup untuk MVP overview. Custom range defer M007.
- **M005-T5 — MarkPaidDialog reuse di overview**: Buat `PayoutComputed` stub (`lines: []`) dari stored payout + mechanic lookup untuk passin ke MarkPaidDialog. Dialog hanya butuh totals, tidak perlu `lines`.

- **M007 — PWA Icons SVG only**: PNG icons tidak dibuat (tool limitation). Manifest menggunakan SVG (`image/svg+xml`, `purpose: "any"` + `"maskable"`). Chrome Android dan modern browsers support SVG in manifest. Untuk iOS Apple Touch Icon, SVG referenced via `<link rel="apple-touch-icon">`. Kalau ada install issue di specific device, generate PNG dari `public/icons/icon.svg` via https://maskable.app.
- **M007 — Service Worker dev disabled**: `devOptions.enabled: false` di VitePWA config — SW tidak aktif di `vite dev`. Untuk test SW, run `npm run build && npm run preview`.
- **M007 — Lazy loading pattern**: `wrap()` helper function di router.tsx — `(el) => <Suspense fallback={<LoadingFallback />}>{el}</Suspense>`. Test/dev pages tetap eager (PlaceholderPage, TestPage) — ringan dan jarang dipakai kasir.
- **M007 — Dexie.js deferred**: Plan.md menyebut Dexie untuk offline queue, tapi M007 implementation menggunakan Workbox CacheFirst untuk static assets saja (fonts, JS, CSS). Dexie untuk data sync defer ke M008 kalau BE sudah ada.

- **M006 DEFERRED (2026-05-11)**: Backend integration di-rollback ke vM007 state setelah 3+ jam deployment infrastructure issues. Root causes: (1) Edge runtime incompatible dengan `bcryptjs`/`postgres` Node modules; (2) Node runtime + `"type":"module"` ESM + Vercel Node file-based routing tidak auto-catch-all `/api/index.ts` untuk semua `/api/*` paths. Re-strategy sebelum resume: pertimbangkan Vercel Edge + `@neondatabase/serverless` driver (no Node modules), atau host BE terpisah di Railway/Render. Schema Neon DB sudah ada, migration di git reflog commit `6b4de93`.

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
