-- ============================================================
-- NQ21 — Unique customer/supplier names + staff can read profile names
-- Applied to nq21-prod on 2026-11-19 (no duplicate names existed).
--
-- 1. Case/whitespace-insensitive unique names so two cashiers cannot create
--    the same customer/supplier twice (the UI only checked active rows).
--    Violations raise 23505; the UI maps it to "Nama sudah dipakai".
-- 2. Every active staff user may read profiles (id, name, role) so
--    "Dibuat oleh" shows a name instead of a UUID. A user can always read
--    their own row (the app uses it to detect a deactivated account).
--    There is still NO client write policy on profiles.
-- ============================================================

begin;

create unique index if not exists customers_name_unique_idx
  on public.customers (lower(btrim(name)));
create unique index if not exists suppliers_name_unique_idx
  on public.suppliers (lower(btrim(name)));

drop policy if exists self_or_owner_select on public.profiles;
create policy self_or_staff_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

commit;
