# Design Bundles — Claude Design Output

Referensi visual untuk development NQ21 PERFORMANCE. Fetch bundle sebelum mulai milestone yang relevan.

---

## Bundle v1 (M001 reference) — sudah di-fetch ✅

**URL:** `https://api.anthropic.com/v1/design/h/2EZKOpdBmIi2l52QVBlLcA?open_file=NQ21+Performance.html`
**Saved:** `design/project/NQ21 Performance.html` (+ extracted JSX: `login.jsx`, `dashboard.jsx`, `laporan.jsx`, `styles.css`, dll)
**Coverage:** Login, Dashboard, Laporan #1–#4 (Per Kategori, Cash Flow, Jasa & Mekanik, Dyno)
**Dipakai untuk:** M001 (T5 Login, T6 Dashboard), M004 (4 Laporan)

---

## Bundle v2 (M002–M005) — BELUM di-fetch ⏳

**URL:** https://api.anthropic.com/v1/design/h/uEsF1DGyXKvCuNAECenGCA?open_file=NQ21+Performance.html

**Coverage:** Input Transaksi (M003), Periode Komisi + Slip Bagi Hasil (M005), Master Mekanik & Rate (M002)

**Target save:** `design/v2/`

**Action:** Fetch saat prep M002. Simpan ke `design/v2/`, compare tokens dengan Bundle v1, update plan.md kalau ada perbedaan.

---

## Demo Reference (fallback)

**File:** `demo.html`

**Coverage:** Halaman yang tidak ada di Bundle v1 atau v2:
- Daftar Transaksi, Detail Transaksi, Edit Transaksi
- Master Customer, Supplier, Kategori, User/Akun

**Note:** Demo adalah prototype awal — pakai sebagai fallback bila bundle tidak cover halamannya.
