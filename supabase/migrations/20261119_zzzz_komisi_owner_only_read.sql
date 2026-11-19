-- ============================================================
-- NQ21 — Commission rates and payouts readable by owner only
-- Applied to nq21-prod on 2026-11-19.
--
-- Owner decision: kasir must not see commission data at all. The UI hides it;
-- before this, a kasir could still read every payout (with totals) and every
-- rate through the API. Kasir flows never need them: transactions go through
-- create/update_transaction (no rates involved), period binding reads
-- commission_periods (still staff-readable), close/mark-paid are owner-only.
-- ============================================================

begin;

drop policy if exists staff_select on public.commission_rates;
create policy owner_select on public.commission_rates for select to authenticated
  using ((select public.is_owner()));

drop policy if exists staff_select on public.commission_payouts;
create policy owner_select on public.commission_payouts for select to authenticated
  using ((select public.is_owner()));

commit;
