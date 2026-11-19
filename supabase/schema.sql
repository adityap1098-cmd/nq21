-- ============================================================
-- NQ21 Performance — Supabase schema snapshot
-- Dumped from live project nmbgprrueuxvrqrmmvmo (nq21-prod) on 2026-11-19
-- via pg_catalog queries in the SQL Editor. This is the state AS FOUND,
-- including the permissive RLS policies (see security notes at bottom).
-- Do not run on a database that already has these objects.
-- ============================================================

create table public.audit_logs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  source text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamp with time zone not null default now(),
  constraint audit_logs_pkey PRIMARY KEY (id)
);

create table public.bubut_luar_links (
  id uuid not null default gen_random_uuid(),
  revenue_line_id uuid not null,
  expense_transaction_id uuid not null,
  vendor_cost bigint not null,
  constraint bubut_luar_links_pkey PRIMARY KEY (id)
);

create table public.categories (
  id uuid not null default gen_random_uuid(),
  name text not null,
  type text not null,
  is_jasa boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint categories_pkey PRIMARY KEY (id),
  constraint categories_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);

create table public.commission_payouts (
  id uuid not null default gen_random_uuid(),
  period_id uuid not null,
  mechanic_id uuid not null,
  total_jobs integer not null,
  total_basis bigint not null,
  total_komisi bigint not null,
  status text not null default 'pending'::text,
  paid_at timestamp with time zone,
  paid_by uuid,
  paid_notes text,
  created_at timestamp with time zone not null default now(),
  constraint commission_payouts_pkey PRIMARY KEY (id),
  constraint commission_payouts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text])))
);

create table public.commission_periods (
  id uuid not null default gen_random_uuid(),
  week_start timestamp with time zone not null,
  week_end timestamp with time zone not null,
  status text not null default 'open'::text,
  closed_by uuid,
  closed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint commission_periods_pkey PRIMARY KEY (id),
  constraint commission_periods_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);

create table public.commission_rates (
  id uuid not null default gen_random_uuid(),
  mechanic_id uuid not null,
  category_id uuid not null,
  rate_percent integer not null,
  created_at timestamp with time zone not null default now(),
  constraint commission_rates_mechanic_id_category_id_key UNIQUE (mechanic_id, category_id),
  constraint commission_rates_pkey PRIMARY KEY (id),
  constraint commission_rates_rate_percent_check CHECK (((rate_percent >= 0) AND (rate_percent <= 100)))
);

create table public.customers (
  id uuid not null default gen_random_uuid(),
  name text not null,
  motor_type text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint customers_pkey PRIMARY KEY (id)
);

create table public.mechanics (
  id uuid not null default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamp with time zone not null default now(),
  constraint mechanics_pkey PRIMARY KEY (id)
);

create table public.profiles (
  id uuid not null,
  name text not null,
  role text not null,
  is_active boolean not null default true,
  last_login timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint profiles_pkey PRIMARY KEY (id),
  constraint profiles_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'kasir'::text])))
);

create table public.suppliers (
  id uuid not null default gen_random_uuid(),
  name text not null,
  phone text,
  is_vendor_bubut boolean not null default false,
  notes text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint suppliers_pkey PRIMARY KEY (id)
);

create table public.transaction_line_mechanics (
  id uuid not null default gen_random_uuid(),
  line_id uuid not null,
  mechanic_id uuid not null,
  share_percent integer not null,
  rate_override integer,
  constraint transaction_line_mechanics_pkey PRIMARY KEY (id),
  constraint transaction_line_mechanics_rate_override_check CHECK (((rate_override IS NULL) OR ((rate_override >= 0) AND (rate_override <= 100)))),
  constraint transaction_line_mechanics_share_percent_check CHECK (((share_percent >= 0) AND (share_percent <= 100)))
);

create table public.transaction_lines (
  id uuid not null default gen_random_uuid(),
  transaction_id uuid not null,
  category_id uuid not null,
  nominal bigint not null,
  biaya_material bigint not null default 0,
  item_name text,
  notes text,
  line_order integer not null,
  constraint transaction_lines_pkey PRIMARY KEY (id)
);

create table public.transactions (
  id uuid not null default gen_random_uuid(),
  no_referensi text not null,
  tgl timestamp with time zone not null,
  tipe text not null,
  customer_id uuid,
  supplier_id uuid,
  payment_method text not null,
  total_nominal bigint not null,
  notes text,
  period_id uuid,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  constraint transactions_no_referensi_key UNIQUE (no_referensi),
  constraint transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'transfer'::text, 'qris'::text]))),
  constraint transactions_pkey PRIMARY KEY (id),
  constraint transactions_tipe_check CHECK ((tipe = ANY (ARRAY['income'::text, 'expense'::text])))
);

-- ---------- Foreign keys ----------

alter table public.audit_logs add constraint audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
alter table public.bubut_luar_links add constraint bubut_luar_links_expense_transaction_id_fkey FOREIGN KEY (expense_transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;
alter table public.bubut_luar_links add constraint bubut_luar_links_revenue_line_id_fkey FOREIGN KEY (revenue_line_id) REFERENCES public.transaction_lines(id) ON DELETE CASCADE;
alter table public.commission_payouts add constraint commission_payouts_mechanic_id_fkey FOREIGN KEY (mechanic_id) REFERENCES public.mechanics(id);
alter table public.commission_payouts add constraint commission_payouts_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.profiles(id);
alter table public.commission_payouts add constraint commission_payouts_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.commission_periods(id) ON DELETE CASCADE;
alter table public.commission_periods add constraint commission_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id);
alter table public.commission_rates add constraint commission_rates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
alter table public.commission_rates add constraint commission_rates_mechanic_id_fkey FOREIGN KEY (mechanic_id) REFERENCES public.mechanics(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.transaction_line_mechanics add constraint transaction_line_mechanics_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.transaction_lines(id) ON DELETE CASCADE;
alter table public.transaction_line_mechanics add constraint transaction_line_mechanics_mechanic_id_fkey FOREIGN KEY (mechanic_id) REFERENCES public.mechanics(id);
alter table public.transaction_lines add constraint transaction_lines_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
alter table public.transaction_lines add constraint transaction_lines_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;
alter table public.transactions add constraint transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
alter table public.transactions add constraint transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);
alter table public.transactions add constraint transactions_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.commission_periods(id);
alter table public.transactions add constraint transactions_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

-- ---------- Indexes ----------

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_type, entity_id);
CREATE INDEX idx_audit_user ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);
CREATE INDEX idx_customers_active ON public.customers USING btree (is_active);
CREATE INDEX idx_line_mechanics_line ON public.transaction_line_mechanics USING btree (line_id);
CREATE INDEX idx_line_mechanics_mech ON public.transaction_line_mechanics USING btree (mechanic_id);
CREATE INDEX idx_lines_transaction ON public.transaction_lines USING btree (transaction_id);
CREATE INDEX idx_mechanics_active ON public.mechanics USING btree (is_active);
CREATE INDEX idx_payouts_mechanic ON public.commission_payouts USING btree (mechanic_id);
CREATE INDEX idx_payouts_period ON public.commission_payouts USING btree (period_id);
CREATE INDEX idx_payouts_status ON public.commission_payouts USING btree (status);
CREATE INDEX idx_suppliers_active ON public.suppliers USING btree (is_active);
CREATE INDEX idx_transactions_deleted ON public.transactions USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_transactions_period ON public.transactions USING btree (period_id);
CREATE INDEX idx_transactions_tgl ON public.transactions USING btree (tgl DESC);
CREATE INDEX idx_transactions_tipe ON public.transactions USING btree (tipe);

-- ---------- Functions & triggers ----------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- Row Level Security ----------

alter table public.audit_logs enable row level security;
alter table public.bubut_luar_links enable row level security;
alter table public.categories enable row level security;
alter table public.commission_payouts enable row level security;
alter table public.commission_periods enable row level security;
alter table public.commission_rates enable row level security;
alter table public.customers enable row level security;
alter table public.mechanics enable row level security;
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.transaction_line_mechanics enable row level security;
alter table public.transaction_lines enable row level security;
alter table public.transactions enable row level security;

create policy "Audit logs insertable by authenticated" on public.audit_logs as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = user_id));
create policy "Audit logs readable by authenticated" on public.audit_logs as PERMISSIVE for SELECT to authenticated using (true);
create policy "Bubut luar links full access for authenticated" on public.bubut_luar_links as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Categories full access for authenticated" on public.categories as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Commission payouts full access for authenticated" on public.commission_payouts as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Commission periods full access for authenticated" on public.commission_periods as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Commission rates full access for authenticated" on public.commission_rates as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Customers full access for authenticated" on public.customers as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Mechanics full access for authenticated" on public.mechanics as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Profiles insertable by self" on public.profiles as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = id));
create policy "Profiles readable by authenticated" on public.profiles as PERMISSIVE for SELECT to authenticated using (true);
create policy "Profiles updatable by self" on public.profiles as PERMISSIVE for UPDATE to authenticated using ((auth.uid() = id));
create policy "Suppliers full access for authenticated" on public.suppliers as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Transaction line mechanics full access for authenticated" on public.transaction_line_mechanics as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Transaction lines full access for authenticated" on public.transaction_lines as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Transactions full access for authenticated" on public.transactions as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy auth_delete_categories on public.categories as PERMISSIVE for DELETE to authenticated using (true);
create policy auth_insert_categories on public.categories as PERMISSIVE for INSERT to authenticated with check (true);
create policy auth_select_categories on public.categories as PERMISSIVE for SELECT to authenticated using (true);
create policy auth_update_categories on public.categories as PERMISSIVE for UPDATE to authenticated using (true) with check (true);
create policy authenticated_select on public.customers as PERMISSIVE for SELECT to authenticated using (true);
create policy owner_insert on public.customers as PERMISSIVE for INSERT to authenticated with check (true);
create policy owner_update on public.customers as PERMISSIVE for UPDATE to authenticated using (true) with check (true);

-- ============================================================
-- The RLS policies above were REPLACED on 2026-11-19 by
-- supabase/migrations/20261119_role_based_rls.sql (applied to nq21-prod).
-- Public sign-up was also disabled in Auth settings the same day.
--
-- SECURITY NOTES (as found 2026-11-19, before that migration):
-- * Every policy grants ALL to any `authenticated` user with `true`.
--   Role (owner/kasir) and profiles.is_active are not checked anywhere in the DB.
-- * "Profiles updatable by self" has no column restriction: a kasir can
--   UPDATE their own profiles.role to 'owner' and is_active to true.
-- * No trigger blocks edits to transactions in a closed commission period.
-- * No unique (period_id, mechanic_id) on commission_payouts.
-- * tgl / week_start / week_end are timestamptz, not date.
-- ============================================================
