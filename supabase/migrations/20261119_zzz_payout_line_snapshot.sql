-- ============================================================
-- NQ21 — Per-line commission snapshot at period close
-- Applied to nq21-prod on 2026-11-19. Apply AFTER 20261119_zz_period_catchup.sql
-- (this file redefines close_period again, same body + the snapshot insert).
--
-- Before: commission_payouts stored only per-mechanic totals; slips of closed
-- periods recomputed their lines from current transactions and CURRENT rates,
-- so a later rate change altered a slip that had already been paid.
-- Now close_period() also writes every mechanic-line it paid into
-- commission_payout_lines (rate actually used, basis, share, komisi, plus the
-- display fields), in the same transaction. Slips of closed periods read this.
--
-- Backfill: the 5 payouts closed before this migration were verified to match
-- a recomputation from current data exactly (total_komisi and total_jobs), so
-- their snapshot is rebuilt from current data.
-- ============================================================

begin;

create table public.commission_payout_lines (
  id uuid not null default gen_random_uuid() primary key,
  payout_id uuid not null references public.commission_payouts(id) on delete cascade,
  period_id uuid not null references public.commission_periods(id) on delete cascade,
  mechanic_id uuid not null references public.mechanics(id),
  transaction_id uuid references public.transactions(id) on delete set null,
  line_id uuid references public.transaction_lines(id) on delete set null,
  no_referensi text not null,
  tgl date not null,
  customer_name text,
  customer_motor text,
  category_id uuid,
  category_name text not null,
  item_name text,
  nominal bigint not null,
  biaya_material bigint not null,
  basis bigint not null,
  share_percent integer not null,
  rate integer not null,
  rate_override integer,
  komisi bigint not null,
  created_at timestamptz not null default now()
);

create index idx_payout_lines_payout on public.commission_payout_lines (payout_id);
-- One snapshot row per (payout, line): a second snapshot of the same period fails loudly
alter table public.commission_payout_lines
  add constraint commission_payout_lines_payout_line_key unique (payout_id, line_id);
create index idx_payout_lines_period on public.commission_payout_lines (period_id);

alter table public.commission_payout_lines enable row level security;
-- Owner-only, like the rest of the Komisi area. Rows are written only by close_period
-- (security invoker, owner) — no update/delete policy: a snapshot never changes.
create policy owner_select on public.commission_payout_lines for select to authenticated
  using ((select public.is_owner()));
create policy owner_insert on public.commission_payout_lines for insert to authenticated
  with check ((select public.is_owner()));

-- Shared by close_period and the backfill below: one row per (line, mechanic) that
-- feeds a stored payout of the period. Same formula as the payout totals.
create or replace function nq21_private.snapshot_payout_lines(p_period_id uuid)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows int;
begin
  insert into public.commission_payout_lines (
    payout_id, period_id, mechanic_id, transaction_id, line_id,
    no_referensi, tgl, customer_name, customer_motor,
    category_id, category_name, item_name,
    nominal, biaya_material, basis, share_percent, rate, rate_override, komisi
  )
  select p.id, p_period_id, lm.mechanic_id, t.id, l.id,
         t.no_referensi, t.tgl::date, cu.name, cu.motor_type,
         c.id, c.name, l.item_name,
         l.nominal, l.biaya_material,
         greatest(l.nominal - l.biaya_material, 0),
         lm.share_percent,
         coalesce(lm.rate_override, cr.rate_percent, 0),
         lm.rate_override,
         round(greatest(l.nominal - l.biaya_material, 0) * lm.share_percent / 100.0
               * coalesce(lm.rate_override, cr.rate_percent, 0) / 100.0)
  from public.commission_periods cp
  join public.transactions t
    on t.tgl::date between cp.week_start::date and cp.week_end::date
   and t.tipe = 'income' and t.deleted_at is null
  join public.transaction_lines l on l.transaction_id = t.id
  join public.categories c on c.id = l.category_id and c.is_jasa
  join public.transaction_line_mechanics lm on lm.line_id = l.id
  join public.commission_payouts p on p.period_id = cp.id and p.mechanic_id = lm.mechanic_id
  left join public.commission_rates cr
         on cr.mechanic_id = lm.mechanic_id and cr.category_id = l.category_id
  left join public.customers cu on cu.id = t.customer_id
  where cp.id = p_period_id;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- close_period: body identical to 20261119_zz_period_catchup.sql + snapshot insert
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
  v_lines int;
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
  if v_period.week_end::date >= (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Periode belum selesai: baru bisa ditutup setelah %.',
      to_char(v_period.week_end::date, 'DD-MM-YYYY');
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

  v_lines := nq21_private.snapshot_payout_lines(p_period_id);

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
          jsonb_build_object('payouts', v_payouts, 'total_komisi', v_total, 'lines', v_lines));

  return jsonb_build_object('payouts', v_payouts, 'total_komisi', v_total, 'lines', v_lines);
end;
$$;

revoke all on function nq21_private.snapshot_payout_lines(uuid) from public, anon;
grant execute on function nq21_private.snapshot_payout_lines(uuid) to authenticated;
revoke all on function public.close_period(uuid) from public, anon;
grant execute on function public.close_period(uuid) to authenticated;

-- Backfill closed periods that already have payouts
do $$
declare r record;
begin
  for r in
    select distinct p.period_id from public.commission_payouts p
    join public.commission_periods cp on cp.id = p.period_id
    where cp.status = 'closed'
      and not exists (select 1 from public.commission_payout_lines pl where pl.period_id = p.period_id)
  loop
    perform nq21_private.snapshot_payout_lines(r.period_id);
  end loop;
end $$;

commit;
