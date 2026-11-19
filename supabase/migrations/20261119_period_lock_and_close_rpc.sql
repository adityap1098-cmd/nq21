-- ============================================================
-- NQ21 — Closed-period lock + atomic close_period()
-- Applied to nq21-prod on 2026-11-19.
--
-- 1. Lock: once a commission period is closed, no transaction whose tgl falls
--    inside it (and none of its lines / line mechanics / bubut links) can be
--    inserted, changed or deleted through the API. One-way, per CLAUDE.md.
--    Skipped when there is no API user (SQL Editor maintenance).
-- 2. close_period(): backfill period_id, compute payouts from the DB, insert
--    them, mark the period closed and open the next week — in ONE transaction.
--    Replaces the client-side multi-step close (could leave a closed period with
--    no payouts, double-insert payouts, or miss transactions cached in the browser).
-- 3. unique (period_id, mechanic_id) on commission_payouts.
-- ============================================================

begin;

-- ---------- 1. Closed-period lock ----------

create or replace function public.is_in_closed_period(p_tgl timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.commission_periods cp
    where cp.status = 'closed'
      and p_tgl::date between cp.week_start::date and cp.week_end::date
  )
$$;

create or replace function public.guard_closed_period()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tgl_old timestamptz;
  v_tgl_new timestamptz;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'transactions' then
    if tg_op <> 'INSERT' then v_tgl_old := old.tgl; end if;
    if tg_op <> 'DELETE' then v_tgl_new := new.tgl; end if;
  elsif tg_table_name = 'transaction_lines' then
    if tg_op <> 'INSERT' then
      select t.tgl into v_tgl_old from public.transactions t where t.id = old.transaction_id;
    end if;
    if tg_op <> 'DELETE' then
      select t.tgl into v_tgl_new from public.transactions t where t.id = new.transaction_id;
    end if;
  elsif tg_table_name = 'transaction_line_mechanics' then
    if tg_op <> 'INSERT' then
      select t.tgl into v_tgl_old from public.transaction_lines l
        join public.transactions t on t.id = l.transaction_id where l.id = old.line_id;
    end if;
    if tg_op <> 'DELETE' then
      select t.tgl into v_tgl_new from public.transaction_lines l
        join public.transactions t on t.id = l.transaction_id where l.id = new.line_id;
    end if;
  elsif tg_table_name = 'bubut_luar_links' then
    if tg_op <> 'INSERT' then
      select t.tgl into v_tgl_old from public.transaction_lines l
        join public.transactions t on t.id = l.transaction_id where l.id = old.revenue_line_id;
    end if;
    if tg_op <> 'DELETE' then
      select t.tgl into v_tgl_new from public.transaction_lines l
        join public.transactions t on t.id = l.transaction_id where l.id = new.revenue_line_id;
    end if;
  end if;

  if (v_tgl_old is not null and public.is_in_closed_period(v_tgl_old))
     or (v_tgl_new is not null and public.is_in_closed_period(v_tgl_new)) then
    raise exception 'Periode sudah ditutup: transaksi tanggal % tidak bisa ditambah, diubah, atau dihapus.',
      to_char(coalesce(v_tgl_new, v_tgl_old), 'DD-MM-YYYY');
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_closed_period on public.transactions;
create trigger guard_closed_period before insert or update or delete on public.transactions
  for each row execute function public.guard_closed_period();
drop trigger if exists guard_closed_period on public.transaction_lines;
create trigger guard_closed_period before insert or update or delete on public.transaction_lines
  for each row execute function public.guard_closed_period();
drop trigger if exists guard_closed_period on public.transaction_line_mechanics;
create trigger guard_closed_period before insert or update or delete on public.transaction_line_mechanics
  for each row execute function public.guard_closed_period();
drop trigger if exists guard_closed_period on public.bubut_luar_links;
create trigger guard_closed_period before insert or update or delete on public.bubut_luar_links
  for each row execute function public.guard_closed_period();

-- A closed period can never be re-opened or edited through the API.
create or replace function public.guard_period_one_way()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and old.status = 'closed' then
    raise exception 'Periode sudah ditutup dan tidak bisa diubah.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_period_one_way on public.commission_periods;
create trigger guard_period_one_way before update on public.commission_periods
  for each row execute function public.guard_period_one_way();

-- ---------- 3. One payout per mechanic per period ----------

alter table public.commission_payouts
  add constraint commission_payouts_period_mechanic_key unique (period_id, mechanic_id);

-- ---------- 2. Atomic close ----------
-- Mirrors computePayoutsFromRows() in src/features/komisi/hooks.ts:
--   income, not deleted, tgl inside the week; jasa categories only;
--   basis = max(0, nominal - biaya_material)
--   komisi = round(basis * share/100 * rate/100), rate = rate_override ?? master rate ?? 0
--   total_basis = sum(round(basis * share/100)), total_jobs = number of mechanic-lines

create or replace function public.close_period(p_period_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_period public.commission_periods%rowtype;
  v_payouts int;
  v_total bigint;
  v_next_start date;
begin
  if not public.is_owner() then
    raise exception 'Hanya owner yang bisa menutup periode.' using errcode = '42501';
  end if;

  select * into v_period from public.commission_periods where id = p_period_id for update;
  if not found then
    raise exception 'Periode tidak ditemukan.';
  end if;
  if v_period.status <> 'open' then
    raise exception 'Periode sudah ditutup.';
  end if;

  update public.transactions
     set period_id = p_period_id
   where period_id is null
     and deleted_at is null
     and tgl::date between v_period.week_start::date and v_period.week_end::date;

  insert into public.commission_payouts (period_id, mechanic_id, total_jobs, total_basis, total_komisi, status)
  select p_period_id,
         x.mechanic_id,
         count(*),
         sum(round(x.basis * x.share_percent / 100.0)),
         sum(round(x.basis * x.share_percent / 100.0 * x.rate / 100.0)),
         'pending'
  from (
    select lm.mechanic_id,
           lm.share_percent,
           greatest(l.nominal - l.biaya_material, 0) as basis,
           coalesce(lm.rate_override, cr.rate_percent, 0) as rate
    from public.transactions t
    join public.transaction_lines l on l.transaction_id = t.id
    join public.categories c on c.id = l.category_id and c.is_jasa
    join public.transaction_line_mechanics lm on lm.line_id = l.id
    left join public.commission_rates cr
           on cr.mechanic_id = lm.mechanic_id and cr.category_id = l.category_id
    where t.tipe = 'income'
      and t.deleted_at is null
      and t.tgl::date between v_period.week_start::date and v_period.week_end::date
  ) x
  group by x.mechanic_id;

  get diagnostics v_payouts = row_count;
  select coalesce(sum(total_komisi), 0) into v_total
    from public.commission_payouts where period_id = p_period_id;

  update public.commission_periods
     set status = 'closed', closed_by = auth.uid(), closed_at = now()
   where id = p_period_id;

  v_next_start := v_period.week_end::date + 1;
  if not exists (
    select 1 from public.commission_periods where week_start::date = v_next_start
  ) then
    insert into public.commission_periods (week_start, week_end, status)
    values (v_next_start, v_next_start + 6, 'open');
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, source, after_data)
  values (auth.uid(), 'close_period', 'commission_period', p_period_id, 'close-period',
          jsonb_build_object('payouts', v_payouts, 'total_komisi', v_total));

  return jsonb_build_object('payouts', v_payouts, 'total_komisi', v_total);
end;
$$;

revoke all on function public.close_period(uuid) from public, anon;
grant execute on function public.close_period(uuid) to authenticated;
revoke all on function public.is_in_closed_period(timestamptz) from public, anon;
grant execute on function public.is_in_closed_period(timestamptz) to authenticated;

commit;
