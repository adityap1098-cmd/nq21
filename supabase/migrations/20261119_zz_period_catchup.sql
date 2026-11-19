-- ============================================================
-- NQ21 — Period catch-up, early-close guard, audited mark-paid
--
-- APPLY AFTER 20261119_period_lock_and_close_rpc.sql (this file redefines
-- close_period; alphabetical order would run it first — do not rely on it).
--
-- 1. unique (week_start) on commission_periods.
-- 2. open_missing_periods(): owner-only; opens every missing Monday–Sunday week
--    from the day after the latest week_end up to the week containing today
--    (Asia/Jakarta). With no periods at all, opens only the current week.
-- 3. close_period(): same as before plus a guard — a week can only be closed
--    after its last day (Asia/Jakarta).
-- 4. mark_payout_paid(): owner-only; pending -> paid with server time and
--    auth.uid(), audited in the same transaction.
-- ============================================================

begin;

-- ---------- 1. One period per week ----------

alter table public.commission_periods
  add constraint commission_periods_week_start_key unique (week_start);

-- ---------- 2. Catch-up of missing weeks ----------

create or replace function public.open_missing_periods()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_last_end date;
  v_start date;
  v_first date;
  v_last date;
  v_created int := 0;
  v_result jsonb;
begin
  if not public.is_owner() then
    raise exception 'Hanya owner yang bisa membuka periode.' using errcode = '42501';
  end if;

  -- Serialize concurrent calls (double click, two tabs).
  perform pg_advisory_xact_lock(hashtext('public.open_missing_periods'));

  select max(week_end)::date into v_last_end from public.commission_periods;

  if v_last_end is null then
    v_start := v_today - (extract(isodow from v_today)::int - 1);
  else
    v_start := v_last_end + 1;
  end if;

  while v_start <= v_today loop
    insert into public.commission_periods (week_start, week_end, status)
    values (v_start::timestamp at time zone 'UTC',
            (v_start + 6)::timestamp at time zone 'UTC',
            'open');
    v_first := coalesce(v_first, v_start);
    v_last := v_start;
    v_created := v_created + 1;
    v_start := v_start + 7;
  end loop;

  v_result := jsonb_build_object(
    'created', v_created,
    'first_week_start', v_first,
    'last_week_start', v_last
  );

  insert into public.audit_logs (user_id, action, entity_type, entity_id, source, after_data)
  values (auth.uid(), 'open_missing_periods', 'commission_period', null, 'open-missing-periods', v_result);

  return v_result;
end;
$$;

-- ---------- 3. close_period with early-close guard ----------
-- Body identical to 20261119_period_lock_and_close_rpc.sql except the
-- "Periode belum selesai" check right after the status check.

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

-- ---------- 4. Audited mark-paid ----------

create or replace function public.mark_payout_paid(p_payout_id uuid, p_notes text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payout public.commission_payouts%rowtype;
begin
  if not public.is_owner() then
    raise exception 'Hanya owner yang bisa menandai pembayaran.' using errcode = '42501';
  end if;

  update public.commission_payouts
     set status = 'paid',
         paid_at = now(),
         paid_by = auth.uid(),
         paid_notes = nullif(btrim(coalesce(p_notes, '')), '')
   where id = p_payout_id
     and status = 'pending'
  returning * into v_payout;

  if not found then
    raise exception 'Payout sudah dibayar atau tidak ditemukan.';
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, source, before_data, after_data)
  values (auth.uid(), 'mark_paid', 'commission_payout', p_payout_id, 'mark-paid',
          jsonb_build_object('status', 'pending'),
          jsonb_build_object(
            'status', 'paid',
            'period_id', v_payout.period_id,
            'mechanic_id', v_payout.mechanic_id,
            'total_komisi', v_payout.total_komisi,
            'paid_notes', v_payout.paid_notes
          ));
end;
$$;

revoke all on function public.open_missing_periods() from public, anon;
grant execute on function public.open_missing_periods() to authenticated;
revoke all on function public.close_period(uuid) from public, anon;
grant execute on function public.close_period(uuid) to authenticated;
revoke all on function public.mark_payout_paid(uuid, text) from public, anon;
grant execute on function public.mark_payout_paid(uuid, text) to authenticated;

commit;
