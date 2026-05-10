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
- [ ] **M001-T3**: App shell — sidebar 240px persistent + topbar 64px sticky (role-aware nav)
  > _Next up_
- [ ] **M001-T4**: Component library dasar — Button, Input, Card, Badge, Table, Modal (match design system)
- [ ] **M001-T5**: Login page (visual ref: `design/project/login.jsx`)
- [ ] **M001-T6**: Dashboard skeleton — app shell + placeholder cards (visual ref: `design/project/dashboard.jsx`)
- [ ] **M001-T7**: Zustand store setup — mock data structure mirror schema plan.md Section 2
- [ ] **M001-T8**: React Router setup — routes untuk semua 18 halaman (placeholder pages untuk M002+)

### Blockers
_(none)_

### Notes
- Sidebar nav sections: Operasional (Transaksi, 4 Laporan), Master Data (5 sub), Owner (Komisi, Audit)
- Topbar: breadcrumb kiri, search + period pill + notif + "Transaksi Baru" CTA kanan
- Mock auth: Owner role default, langsung redirect ke dashboard

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

**Visual ref**: `design/project/laporan.jsx` + `design/project/dashboard.jsx`

---

## M005 — Komisi UI ⏳

Tasks akan di-breakdown saat M004 selesai.

**Visual ref**: `demo.html`

---

## Milestone History

_(kosong — belum ada milestone yang selesai)_
