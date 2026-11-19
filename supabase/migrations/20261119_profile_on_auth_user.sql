-- ============================================================
-- NQ21 — Auto-create a profiles row for every new auth user.
-- Applied to nq21-prod on 2026-11-19.
--
-- Public sign-up is disabled, so new users only come from the Supabase
-- Dashboard (Authentication → Users → Add user). Without a profile row the
-- user can sign in but RLS gives them nothing; this trigger makes them an
-- active kasir. The owner promotes / renames / deactivates in Table Editor.
-- ============================================================

begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role, is_active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    'kasir',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;
