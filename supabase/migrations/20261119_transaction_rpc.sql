-- ============================================================
-- NQ21 — Atomic create / update / delete of transactions (RPC)
--
-- Replaces the multi-call supabase-js flows in
-- src/features/transactions/hooks.ts. Each public function runs in ONE
-- database transaction: any failure rolls back every row it touched.
--
-- SECURITY INVOKER: the caller's RLS policies (20261119_role_based_rls.sql)
-- and triggers (soft-delete guard, closed-period lock) still apply.
-- created_by / audit user_id always come from auth.uid(), never the payload.
--
-- Errors raised here:
--   NQ422 (hint 'nq21_validation') — payload failed validation, message in Indonesian
--   NQ404 (hint 'nq21_not_found')  — transaction id not found / already deleted
--   42501                          — not signed in (RLS / guards raise 42501 too)
--   23505                          — duplicate no_referensi (unique constraint)
--
-- Payload `p` (jsonb), same shape the hooks send:
-- {
--   "no_referensi": "TRX-20261119-001",      -- create only (update keeps the stored one)
--   "tgl": "2026-11-19",
--   "tipe": "income" | "expense",            -- create only (update keeps the stored one)
--   "customer_id": uuid | null,
--   "supplier_id": uuid | null,
--   "payment_method": "cash" | "transfer" | "qris",
--   "notes": text | null,
--   "lines": [{
--     "category_id": uuid,
--     "nominal": int, "biaya_material": int,
--     "item_name": text | null, "notes": text | null,
--     "mechanics": [{ "mechanic_id": uuid, "share_percent": number, "rate_override": int | null }],
--     "bubut_vendor": { "supplier_id": uuid, "vendor_cost": int } | null
--   }]
-- }
-- share_percent is stored as integer; fractional UI splits (33.33/33.33/33.34)
-- are rounded with largest remainder so each line still sums to exactly 100.
-- ============================================================

begin;

create schema if not exists nq21_private;
revoke all on schema nq21_private from public, anon;
grant usage on schema nq21_private to authenticated;

-- ---------- helpers ----------

create or replace function nq21_private.tx_fail(p_message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception '%', p_message using errcode = 'NQ422', hint = 'nq21_validation';
end;
$$;

create or replace function nq21_private.tx_require_user()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Akses ditolak: sesi login tidak ditemukan' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create or replace function nq21_private.tx_open_period_id(p_tgl timestamptz)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select cp.id
  from public.commission_periods cp
  where cp.status = 'open'
    and cp.week_start <= p_tgl
    and cp.week_end >= p_tgl
  order by cp.week_start desc
  limit 1
$$;

create or replace function nq21_private.tx_validate(p_tipe text, p jsonb)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_internal_cats constant text[] := array['Gaji', 'Listrik & Air', 'Sewa', 'Lain-lain'];
  v_line jsonb;
  v_idx bigint;
  v_label text;
  v_cat record;
  v_nominal numeric;
  v_material numeric;
  v_mech jsonb;
  v_share numeric;
  v_share_sum numeric;
  v_vendor jsonb;
  v_vendor_cost numeric;
  v_vendor_lines int := 0;
  v_needs_supplier boolean := false;
begin
  if p_tipe is null or p_tipe not in ('income', 'expense') then
    perform nq21_private.tx_fail('Tipe transaksi tidak valid');
  end if;
  if nullif(p->>'tgl', '') is null then
    perform nq21_private.tx_fail('Tanggal transaksi wajib diisi');
  end if;
  if coalesce(p->>'payment_method', '') not in ('cash', 'transfer', 'qris') then
    perform nq21_private.tx_fail('Metode pembayaran tidak valid');
  end if;
  if jsonb_typeof(p->'lines') is distinct from 'array' or jsonb_array_length(p->'lines') = 0 then
    perform nq21_private.tx_fail('Minimal 1 line item');
  end if;

  if p_tipe = 'income' and nullif(p->>'customer_id', '') is null then
    perform nq21_private.tx_fail('Customer wajib dipilih untuk transaksi MASUK');
  end if;

  for v_line, v_idx in select e.value, e.ordinality from jsonb_array_elements(p->'lines') with ordinality as e
  loop
    v_label := 'LINE ' || lpad(v_idx::text, 2, '0');

    if nullif(v_line->>'category_id', '') is null then
      perform nq21_private.tx_fail(v_label || ': kategori wajib dipilih');
    end if;
    select c.id, c.name, c.type, c.is_jasa into v_cat
    from public.categories c
    where c.id = (v_line->>'category_id')::uuid;
    if not found then
      perform nq21_private.tx_fail(v_label || ': kategori tidak ditemukan');
    end if;
    if v_cat.type <> p_tipe then
      perform nq21_private.tx_fail(v_label || ': kategori ' || v_cat.name || ' tidak sesuai tipe transaksi');
    end if;
    if p_tipe = 'expense' and not (v_cat.name = any (v_internal_cats)) then
      v_needs_supplier := true;
    end if;

    v_nominal := (v_line->>'nominal')::numeric;
    if v_nominal is null or v_nominal <= 0 then
      perform nq21_private.tx_fail(v_label || ': nominal harus lebih dari 0');
    end if;
    if v_nominal <> trunc(v_nominal) then
      perform nq21_private.tx_fail(v_label || ': nominal harus angka bulat Rupiah');
    end if;

    v_material := coalesce((v_line->>'biaya_material')::numeric, 0);
    if v_material < 0 or v_material <> trunc(v_material) then
      perform nq21_private.tx_fail(v_label || ': biaya material tidak valid');
    end if;
    if v_material > v_nominal then
      perform nq21_private.tx_fail(v_label || ': biaya material tidak boleh melebihi nominal');
    end if;

    if jsonb_typeof(coalesce(v_line->'mechanics', '[]'::jsonb)) <> 'array' then
      perform nq21_private.tx_fail(v_label || ': data mekanik tidak valid');
    end if;
    v_share_sum := 0;
    for v_mech in select value from jsonb_array_elements(coalesce(v_line->'mechanics', '[]'::jsonb))
    loop
      if nullif(v_mech->>'mechanic_id', '') is null then
        perform nq21_private.tx_fail(v_label || ': mekanik wajib dipilih');
      end if;
      v_share := (v_mech->>'share_percent')::numeric;
      if v_share is null or v_share < 0 or v_share > 100 then
        perform nq21_private.tx_fail(v_label || ': share mekanik harus 0–100%');
      end if;
      if nullif(v_mech->>'rate_override', '') is not null
         and ((v_mech->>'rate_override')::numeric < 0 or (v_mech->>'rate_override')::numeric > 100) then
        perform nq21_private.tx_fail(v_label || ': rate override harus 0–100%');
      end if;
      v_share_sum := v_share_sum + v_share;
    end loop;

    if v_cat.is_jasa then
      if jsonb_array_length(coalesce(v_line->'mechanics', '[]'::jsonb)) = 0 then
        perform nq21_private.tx_fail(v_label || ': minimal 1 mekanik untuk kategori ' || v_cat.name);
      end if;
      if abs(v_share_sum - 100) > 0.01 then
        perform nq21_private.tx_fail(v_label || ': total share mekanik harus 100% (sekarang ' || v_share_sum || '%)');
      end if;
    end if;

    v_vendor := v_line->'bubut_vendor';
    if v_cat.name = 'Bubut Luar' and v_vendor is not null and jsonb_typeof(v_vendor) = 'object' then
      v_vendor_lines := v_vendor_lines + 1;
      if nullif(v_vendor->>'supplier_id', '') is null then
        perform nq21_private.tx_fail(v_label || ': vendor bubut wajib dipilih');
      end if;
      v_vendor_cost := (v_vendor->>'vendor_cost')::numeric;
      if v_vendor_cost is null or v_vendor_cost <= 0 or v_vendor_cost <> trunc(v_vendor_cost) then
        perform nq21_private.tx_fail(v_label || ': biaya ke vendor bubut harus lebih dari 0');
      end if;
    end if;
  end loop;

  if v_vendor_lines > 1 then
    perform nq21_private.tx_fail('Hanya boleh 1 line Bubut Luar dengan vendor per transaksi');
  end if;

  if p_tipe = 'expense' and v_needs_supplier and nullif(p->>'supplier_id', '') is null then
    perform nq21_private.tx_fail('Supplier wajib dipilih untuk transaksi KELUAR');
  end if;
end;
$$;

-- Inserts lines + mechanics + the Bubut Luar vendor leg for an existing header.
-- Returns the id of the auto-created -VENDOR expense (or null).
create or replace function nq21_private.tx_insert_lines(
  p_tx_id uuid,
  p_no_referensi text,
  p_tgl timestamptz,
  p_payment_method text,
  p_period_id uuid,
  p_created_by uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_line jsonb;
  v_idx bigint;
  v_line_id uuid;
  v_cat_name text;
  v_vendor jsonb;
  v_vendor_cost bigint;
  v_bayar_vendor_cat uuid;
  v_expense_tx_id uuid;
  v_expense_tx_out uuid;
begin
  for v_line, v_idx in select e.value, e.ordinality from jsonb_array_elements(p_lines) with ordinality as e
  loop
    insert into public.transaction_lines
      (transaction_id, category_id, nominal, biaya_material, item_name, notes, line_order)
    values (
      p_tx_id,
      (v_line->>'category_id')::uuid,
      (v_line->>'nominal')::numeric::bigint,
      coalesce((v_line->>'biaya_material')::numeric, 0)::bigint,
      nullif(v_line->>'item_name', ''),
      nullif(v_line->>'notes', ''),
      (v_idx - 1)::int
    )
    returning id into v_line_id;

    -- Largest-remainder rounding: integer shares that still sum to round(total)
    with m as (
      select
        (e.value->>'mechanic_id')::uuid as mechanic_id,
        (e.value->>'share_percent')::numeric as share,
        nullif(e.value->>'rate_override', '')::numeric as rate_override,
        e.ordinality as ord
      from jsonb_array_elements(coalesce(v_line->'mechanics', '[]'::jsonb)) with ordinality as e
    ),
    totals as (
      select (round(sum(m.share)) - sum(floor(m.share)))::int as remainder from m
    ),
    ranked as (
      select m.*, row_number() over (order by m.share - floor(m.share) desc, m.ord) as rn from m
    )
    insert into public.transaction_line_mechanics (line_id, mechanic_id, share_percent, rate_override)
    select
      v_line_id,
      r.mechanic_id,
      (floor(r.share) + case when r.rn <= t.remainder then 1 else 0 end)::int,
      round(r.rate_override)::int
    from ranked r cross join totals t
    order by r.ord;

    select c.name into v_cat_name from public.categories c where c.id = (v_line->>'category_id')::uuid;
    v_vendor := v_line->'bubut_vendor';

    if v_cat_name = 'Bubut Luar' and v_vendor is not null and jsonb_typeof(v_vendor) = 'object' then
      if v_bayar_vendor_cat is null then
        select c.id into v_bayar_vendor_cat
        from public.categories c
        where c.name = 'Bayar Vendor Bubut' and c.type = 'expense'
        order by c.is_active desc, c.created_at
        limit 1;
        if v_bayar_vendor_cat is null then
          perform nq21_private.tx_fail('Kategori "Bayar Vendor Bubut" tidak ditemukan. Hubungi owner.');
        end if;
      end if;

      v_vendor_cost := (v_vendor->>'vendor_cost')::numeric::bigint;

      insert into public.transactions
        (no_referensi, tgl, tipe, customer_id, supplier_id, payment_method,
         total_nominal, notes, period_id, created_by)
      values (
        p_no_referensi || '-VENDOR', p_tgl, 'expense', null, (v_vendor->>'supplier_id')::uuid, p_payment_method,
        v_vendor_cost, 'Auto-linked ke ' || p_no_referensi, p_period_id, p_created_by
      )
      returning id into v_expense_tx_id;

      insert into public.transaction_lines
        (transaction_id, category_id, nominal, biaya_material, item_name, notes, line_order)
      values (v_expense_tx_id, v_bayar_vendor_cat, v_vendor_cost, 0, null, null, 0);

      insert into public.bubut_luar_links (revenue_line_id, expense_transaction_id, vendor_cost)
      values (v_line_id, v_expense_tx_id, v_vendor_cost);

      v_expense_tx_out := v_expense_tx_id;
    end if;
  end loop;

  return v_expense_tx_out;
end;
$$;

-- ---------- public RPCs ----------

create or replace function public.create_transaction(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := nq21_private.tx_require_user();
  v_tipe text := p->>'tipe';
  v_no_ref text := btrim(coalesce(p->>'no_referensi', ''));
  v_tgl timestamptz;
  v_period_id uuid;
  v_total bigint;
  v_tx_id uuid;
  v_expense_tx_id uuid;
begin
  if v_no_ref = '' then
    perform nq21_private.tx_fail('No referensi wajib diisi');
  end if;
  if length(v_no_ref) > 50 then
    perform nq21_private.tx_fail('No referensi maksimal 50 karakter');
  end if;

  perform nq21_private.tx_validate(v_tipe, p);

  v_tgl := (p->>'tgl')::timestamptz;
  v_period_id := nq21_private.tx_open_period_id(v_tgl);
  select coalesce(sum((l->>'nominal')::numeric), 0)::bigint into v_total
  from jsonb_array_elements(p->'lines') as l;

  insert into public.transactions
    (no_referensi, tgl, tipe, customer_id, supplier_id, payment_method,
     total_nominal, notes, period_id, created_by)
  values (
    v_no_ref, v_tgl, v_tipe,
    case when v_tipe = 'income' then nullif(p->>'customer_id', '')::uuid end,
    case when v_tipe = 'expense' then nullif(p->>'supplier_id', '')::uuid end,
    p->>'payment_method', v_total, nullif(p->>'notes', ''), v_period_id, v_uid
  )
  returning id into v_tx_id;

  v_expense_tx_id := nq21_private.tx_insert_lines(
    v_tx_id, v_no_ref, v_tgl, p->>'payment_method', v_period_id, v_uid, p->'lines');

  insert into public.audit_logs (user_id, action, entity_type, entity_id, source, after_data)
  values (
    v_uid, 'create_transaction', 'transaction', v_tx_id, 'transaction-form',
    jsonb_build_object('no_referensi', v_no_ref, 'tipe', v_tipe, 'tgl', p->>'tgl',
                       'total_nominal', v_total, 'expense_tx_id', v_expense_tx_id)
  );

  return jsonb_build_object('tx_id', v_tx_id, 'expense_tx_id', v_expense_tx_id);
end;
$$;

create or replace function public.update_transaction(p_id uuid, p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := nq21_private.tx_require_user();
  v_old public.transactions%rowtype;
  v_tgl timestamptz;
  v_period_id uuid;
  v_total bigint;
  v_expense_ids uuid[];
  v_expense_tx_id uuid;
begin
  select * into v_old
  from public.transactions t
  where t.id = p_id and t.deleted_at is null
  for update;
  if not found then
    raise exception 'Transaksi tidak ditemukan atau sudah dihapus'
      using errcode = 'NQ404', hint = 'nq21_not_found';
  end if;

  -- tipe and no_referensi are locked on edit: validate against the stored values
  perform nq21_private.tx_validate(v_old.tipe, p);

  v_tgl := (p->>'tgl')::timestamptz;
  v_period_id := nq21_private.tx_open_period_id(v_tgl);
  select coalesce(sum((l->>'nominal')::numeric), 0)::bigint into v_total
  from jsonb_array_elements(p->'lines') as l;

  -- Old Bubut Luar vendor legs: linked via bubut_luar_links, or named <asli>-VENDOR
  select coalesce(array_agg(distinct x.id), '{}') into v_expense_ids
  from (
    select bl.expense_transaction_id as id
    from public.bubut_luar_links bl
    join public.transaction_lines tl on tl.id = bl.revenue_line_id
    where tl.transaction_id = p_id
    union
    select t.id from public.transactions t
    where t.no_referensi = v_old.no_referensi || '-VENDOR' and t.id <> p_id
  ) x;

  -- Cascades remove their lines and bubut_luar_links rows
  delete from public.transactions t where t.id = any (v_expense_ids);
  -- Cascades remove transaction_line_mechanics and bubut_luar_links of the old lines
  delete from public.transaction_lines tl where tl.transaction_id = p_id;

  update public.transactions t set
    tgl = v_tgl,
    customer_id = case when v_old.tipe = 'income' then nullif(p->>'customer_id', '')::uuid end,
    supplier_id = case when v_old.tipe = 'expense' then nullif(p->>'supplier_id', '')::uuid end,
    payment_method = p->>'payment_method',
    total_nominal = v_total,
    notes = nullif(p->>'notes', ''),
    period_id = v_period_id
  where t.id = p_id;

  v_expense_tx_id := nq21_private.tx_insert_lines(
    p_id, v_old.no_referensi, v_tgl, p->>'payment_method', v_period_id, v_uid, p->'lines');

  insert into public.audit_logs (user_id, action, entity_type, entity_id, source, before_data, after_data)
  values (
    v_uid, 'update_transaction', 'transaction', p_id, 'edit-transaksi',
    jsonb_build_object('tgl', v_old.tgl, 'customer_id', v_old.customer_id, 'supplier_id', v_old.supplier_id,
                       'payment_method', v_old.payment_method, 'total_nominal', v_old.total_nominal,
                       'notes', v_old.notes, 'period_id', v_old.period_id),
    jsonb_build_object('tgl', v_tgl, 'customer_id', nullif(p->>'customer_id', ''),
                       'supplier_id', nullif(p->>'supplier_id', ''), 'payment_method', p->>'payment_method',
                       'total_nominal', v_total, 'notes', nullif(p->>'notes', ''), 'period_id', v_period_id,
                       'lines', p->'lines')
  );

  return jsonb_build_object('tx_id', p_id, 'expense_tx_id', v_expense_tx_id);
end;
$$;

create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := nq21_private.tx_require_user();
  v_old public.transactions%rowtype;
  v_expense_ids uuid[];
begin
  select * into v_old
  from public.transactions t
  where t.id = p_id and t.deleted_at is null
  for update;
  if not found then
    raise exception 'Transaksi tidak ditemukan atau sudah dihapus'
      using errcode = 'NQ404', hint = 'nq21_not_found';
  end if;

  select coalesce(array_agg(distinct x.id), '{}') into v_expense_ids
  from (
    select bl.expense_transaction_id as id
    from public.bubut_luar_links bl
    join public.transaction_lines tl on tl.id = bl.revenue_line_id
    where tl.transaction_id = p_id
    union
    select t.id from public.transactions t
    where t.no_referensi = v_old.no_referensi || '-VENDOR' and t.id <> p_id
  ) x;

  update public.transactions t
  set deleted_at = now()
  where (t.id = p_id or t.id = any (v_expense_ids))
    and t.deleted_at is null;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, source, before_data)
  values (
    v_uid, 'delete_transaction', 'transaction', p_id, 'detail-transaksi',
    jsonb_build_object('no_referensi', v_old.no_referensi, 'tgl', v_old.tgl,
                       'total_nominal', v_old.total_nominal, 'expense_tx_ids', to_jsonb(v_expense_ids))
  );
end;
$$;

-- ---------- privileges ----------

revoke all on function nq21_private.tx_fail(text) from public, anon;
revoke all on function nq21_private.tx_require_user() from public, anon;
revoke all on function nq21_private.tx_open_period_id(timestamptz) from public, anon;
revoke all on function nq21_private.tx_validate(text, jsonb) from public, anon;
revoke all on function nq21_private.tx_insert_lines(uuid, text, timestamptz, text, uuid, uuid, jsonb) from public, anon;
revoke all on function public.create_transaction(jsonb) from public, anon;
revoke all on function public.update_transaction(uuid, jsonb) from public, anon;
revoke all on function public.delete_transaction(uuid) from public, anon;

grant execute on function nq21_private.tx_fail(text) to authenticated;
grant execute on function nq21_private.tx_require_user() to authenticated;
grant execute on function nq21_private.tx_open_period_id(timestamptz) to authenticated;
grant execute on function nq21_private.tx_validate(text, jsonb) to authenticated;
grant execute on function nq21_private.tx_insert_lines(uuid, text, timestamptz, text, uuid, uuid, jsonb) to authenticated;
grant execute on function public.create_transaction(jsonb) to authenticated;
grant execute on function public.update_transaction(uuid, jsonb) to authenticated;
grant execute on function public.delete_transaction(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
