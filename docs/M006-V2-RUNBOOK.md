# M006-V2 Production Runbook

NQ21 PERFORMANCE — Supabase backend. Reference ini untuk ops, debugging, dan onboarding future session.

---

## Production

- **URL**: https://nq21.vercel.app
- **Supabase project**: `nmbgprrueuxvrqrmmvmo` (Singapore region)
- **Deploy**: Vercel — push to `origin/master` auto-deploys

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@nq21.app` | tanya admin |
| Kasir | `kasir@nq21.app` | tanya admin |

Owner: full access — close period, mark paid, all CRUD.
Kasir: input + edit transaksi, view all.

---

## Known Issues — Acceptable Defer

These are intentional defers, not bugs. Do not fix without scoping a proper milestone.

| Issue | Impact | Notes |
|-------|--------|-------|
| Responsive mobile layout | Medium | Sidebar + search overlap on narrow viewport, table overflow. Defer ke M008. |
| T2.3 MasterKategoriPage CRUD | Low | Create/edit/delete masih Zustand (`useCategoryStore`). Reads OK via Supabase. Cosmetic on multi-device. |
| T2.4 MasterMekanikPage CRUD | Low | Same — `useMechanicStore`. Rate override edits = Zustand only. |
| CommandPalette (Ctrl+K) | Low | Search reads Zustand mock → stale on fresh device. Cosmetic. |
| MechanicChipRow last-used pre-fill | Low | Reads Zustand, not DB. Pre-fill empty on fresh device. |
| ItemNameAutocomplete | Low | Reads Zustand transaction history. Empty on fresh device. |
| Multi-tab Tab B restore timeout | Low | Second tab occasionally fails session restore (BroadcastChannel race). Single-tab is typical use. Workaround: reload Tab B manually. |

---

## Cleanup SQL (Reset State for Testing)

Run di Supabase SQL Editor. **JANGAN run di production dengan real data.** Untuk dev/staging reset saja.

```sql
-- Reset transactions + related (keep master data intact)
DELETE FROM bubut_luar_links;
DELETE FROM transaction_line_mechanics;
DELETE FROM transaction_lines;
DELETE FROM transactions;

-- Reset komisi state
DELETE FROM commission_payouts;
DELETE FROM commission_periods;

-- Verify master data intact
SELECT count(*) FROM customers;
SELECT count(*) FROM suppliers;
SELECT count(*) FROM categories;
SELECT count(*) FROM mechanics;
SELECT count(*) FROM commission_rates;
```

After reset: buka `https://nq21.vercel.app/komisi/periode` → klik "Buka Periode Pertama".

---

## Pre-Close-Period Checklist

Sebelum tutup periode di production, verify:

1. Input test transaction → cek `period_id` di DB tidak NULL
2. Dashboard → date labels clean ("11–17 Mei 2026" format), chart bars visible
3. `/komisi/periode` → computed payouts match expected mekanik + nominal
4. Tutup periode → check `commission_periods.status = 'closed'` + `commission_payouts` rows exist
5. Buka periode baru → check `week_start = closed.week_end + 1 day` (tidak duplicate)

---

## Architecture Notes

- **Auth**: Supabase email/password → `profiles` table (id, name, role, is_active)
- **13 tables**: transactions, transaction_lines, transaction_line_mechanics, bubut_luar_links, commission_periods, commission_payouts, commission_rates, customers, suppliers, categories, mechanics, profiles, audit_logs
- **RLS**: enabled per table — anon key safe for browser client
- **period_id binding**: Set on transaction INSERT via lookup `commission_periods WHERE week_start ≤ tgl ≤ week_end AND status='open'`. NULL = no matching open period (backdated or gap).
- **Bubut Luar**: dual-leg atomic — income tx + expense tx (`-VENDOR` suffix) + `bubut_luar_links` row. Client-side rollback on failure.
- **Audit log**: fire-and-forget, non-blocking. Actions: create/update/delete_transaction, create_customer, create_supplier.

---

## Env Vars

```
VITE_SUPABASE_URL=https://nmbgprrueuxvrqrmmvmo.supabase.co
VITE_SUPABASE_ANON_KEY=<from Supabase dashboard → Settings → API>
```

Local: `.env.local`. Vercel: set via dashboard → project settings → environment variables.

---

## Post-tag Patches Summary (vM006-V2)

4 bugs caught post-seal via audit-driven senior debug (manual SQL inspection of live data):

| Bug | Root cause | Fix | Commit |
|-----|-----------|-----|--------|
| #1 useOpenNewPeriod duplicate | Call site passed getCurrentWeek() instead of next week | Hook now no-arg, queries MAX(week_end) from DB | `627a747` |
| #2 period_id NULL on transactions | useCreateTransaction never set period_id | Lookup open period by tgl BEFORE insert | `627a747` |
| #3 Date format ISO leak | Supabase returned timestamptz, .slice(8) captured full tail | Normalize in hook + formatWeekRange helper | `1d42e60` |
| #4 Chart X-axis NaN | ISO timestamp into addDaysToStr → Number() = NaN | Fixed by #3 normalization + fmtRpShort isNaN guard | `1d42e60` |
