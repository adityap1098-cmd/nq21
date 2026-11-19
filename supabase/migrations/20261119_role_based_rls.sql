-- ============================================================
-- NQ21 — Role-based RLS (replaces the "any authenticated = full access" policies)
-- Applied to nq21-prod on 2026-11-19.
--
-- Roles come from public.profiles (role + is_active), read through
-- SECURITY DEFINER helpers so a client can never supply its own role.
--
-- Matrix (derived from what src/ actually calls):
--   staff = active owner or kasir
--   transactions / transaction_lines / transaction_line_mechanics / bubut_luar_links
--       select, insert, update, delete: staff
--       (kasir create + edit uses delete-then-insert of child rows)
--       soft delete (deleted_at set/cleared): owner only, via trigger
--   customers / suppliers: select + insert staff, update owner
--   categories / mechanics / commission_rates: select staff, write owner
--   commission_periods: select staff, insert + update owner
--   commission_payouts: select staff, insert + update owner, no delete
--   audit_logs: insert staff with user_id = auth.uid(), select owner
--   profiles: select own row (owner: all), no client writes
--   anon: nothing
-- ============================================================

begin;

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() in ('owner', 'kasir'), false)
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.app_role() = 'owner', false)
$$;

revoke all on function public.app_role(), public.is_staff(), public.is_owner() from public, anon;
grant execute on function public.app_role(), public.is_staff(), public.is_owner() to authenticated;

-- Drop every existing policy on the 13 app tables
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'audit_logs','bubut_luar_links','categories','commission_payouts','commission_periods',
      'commission_rates','customers','mechanics','profiles','suppliers',
      'transaction_line_mechanics','transaction_lines','transactions')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Transactions: staff read/insert/update (soft delete guarded by trigger below).
-- Hard delete: owner, or kasir only for rows they created (create-flow rollback)
-- and paired -VENDOR expenses (edit flow re-creates them).
create policy staff_select on public.transactions for select to authenticated using ((select public.is_staff()));
create policy staff_insert on public.transactions for insert to authenticated with check ((select public.is_staff()));
create policy staff_update on public.transactions for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy limited_delete on public.transactions for delete to authenticated
  using ((select public.is_owner())
         or ((select public.is_staff()) and (created_by = (select auth.uid()) or no_referensi like '%-VENDOR')));

-- Transaction children: staff full access (edit flow deletes and re-inserts them)
create policy staff_all on public.transaction_lines for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy staff_all on public.transaction_line_mechanics for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy staff_all on public.bubut_luar_links for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Customers / suppliers: kasir may add, only owner may edit or deactivate
create policy staff_select on public.customers for select to authenticated using ((select public.is_staff()));
create policy staff_insert on public.customers for insert to authenticated with check ((select public.is_staff()));
create policy owner_update on public.customers for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy staff_select on public.suppliers for select to authenticated using ((select public.is_staff()));
create policy staff_insert on public.suppliers for insert to authenticated with check ((select public.is_staff()));
create policy owner_update on public.suppliers for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

-- Master data: read for staff, write for owner
create policy staff_select on public.categories for select to authenticated using ((select public.is_staff()));
create policy owner_insert on public.categories for insert to authenticated with check ((select public.is_owner()));
create policy owner_update on public.categories for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy staff_select on public.mechanics for select to authenticated using ((select public.is_staff()));
create policy owner_insert on public.mechanics for insert to authenticated with check ((select public.is_owner()));
create policy owner_update on public.mechanics for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy staff_select on public.commission_rates for select to authenticated using ((select public.is_staff()));
create policy owner_insert on public.commission_rates for insert to authenticated with check ((select public.is_owner()));
create policy owner_update on public.commission_rates for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
create policy owner_delete on public.commission_rates for delete to authenticated using ((select public.is_owner()));

-- Commission periods and payouts: owner manages, staff reads
create policy staff_select on public.commission_periods for select to authenticated using ((select public.is_staff()));
create policy owner_insert on public.commission_periods for insert to authenticated with check ((select public.is_owner()));
create policy owner_update on public.commission_periods for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy staff_select on public.commission_payouts for select to authenticated using ((select public.is_staff()));
create policy owner_insert on public.commission_payouts for insert to authenticated with check ((select public.is_owner()));
create policy owner_update on public.commission_payouts for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

-- Audit log: append-only, own user_id; owner reads
create policy staff_insert_own on public.audit_logs for insert to authenticated
  with check ((select public.is_staff()) and user_id = (select auth.uid()));
create policy owner_select on public.audit_logs for select to authenticated using ((select public.is_owner()));

-- Profiles: read own row (owner reads all); no client writes at all
create policy self_or_owner_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_owner()));

-- Soft delete / restore of transactions is owner-only (kasir has no Hapus button either).
-- Skipped when there is no API user (SQL Editor / service role maintenance).
create or replace function public.guard_transaction_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and new.deleted_at is distinct from old.deleted_at
     and not public.is_owner() then
    raise exception 'Hanya owner yang bisa menghapus transaksi' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_transaction_soft_delete on public.transactions;
create trigger guard_transaction_soft_delete
  before update on public.transactions
  for each row execute function public.guard_transaction_soft_delete();

commit;
