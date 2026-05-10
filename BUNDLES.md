# Design Bundles — Claude Design Output

Referensi visual untuk development NQ21 PERFORMANCE. Fetch bundle sebelum mulai milestone yang relevan.

---

## Bundle v1 (M001 reference) — sudah di-fetch ✅

**URL:** `https://api.anthropic.com/v1/design/h/2EZKOpdBmIi2l52QVBlLcA?open_file=NQ21+Performance.html`
**Saved:** `design/project/NQ21 Performance.html` (+ extracted JSX: `login.jsx`, `dashboard.jsx`, `laporan.jsx`, `styles.css`, dll)
**Coverage:** Login, Dashboard, Laporan #1–#4 (Per Kategori, Cash Flow, Jasa & Mekanik, Dyno)
**Dipakai untuk:** M001 (T5 Login, T6 Dashboard), M004 (4 Laporan)

---

## Bundle v2 (M002–M005) — sudah di-fetch manual ✅

**URL:** `https://api.anthropic.com/v1/design/h/uEsF1DGyXKvCuNAECenGCA?open_file=NQ21+Performance.html`
**Saved:** `design/v2/NQ21 PERFORMANCE/` (flat, tidak nested dalam `project/` seperti v1)
**Fetched:** 2026-05-11 (manual download oleh user)

**Struktur:**
```
design/v2/NQ21 PERFORMANCE/
  NQ21 Performance.html   ← entry point
  pages-extra.jsx         ← InputTransaksi + PeriodeKomisi + MasterMekanik
  data-pages.jsx          ← mock data (customers, suppliers, kategori, mekanik, periodeList, slip)
  styles-extra.css        ← styles untuk pages-extra
  styles.css              ← base design system (identik v1)
  dashboard.jsx, laporan.jsx, login.jsx, ...   ← shared dari v1 (updated)
```

**Coverage:**
- `InputTransaksi` → M003 (form multi-line, mekanik share%, Bubut Luar flow)
- `PeriodeKomisi` → M005 (period list, tutup periode, slip per mekanik)
- `MasterMekanik` → M002-T2 (inline rate matrix)

**Design system vs v1:** ✅ Identik — CSS vars sama, font stack Anton/Manrope/JetBrains Mono sama, komponen pattern sama. Tidak ada breaking difference.

---

## Demo Reference (fallback)

**File:** `demo.html`

**Coverage:** Halaman yang tidak ada di Bundle v1 atau v2:
- Daftar Transaksi, Detail Transaksi, Edit Transaksi
- Master Customer, Supplier, Kategori, User/Akun

**Note:** Demo adalah prototype awal — pakai sebagai fallback bila bundle tidak cover halamannya.
