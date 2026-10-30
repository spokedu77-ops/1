-- Apply on local Supabase only (not production): users shell + equipment expand stack.
\set ON_ERROR_STOP on

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete restrict,
  name text not null default '',
  role text,
  is_active boolean not null default true
);

alter table public.users
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  );
$$;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.users to authenticated;
grant execute on function public.is_admin() to authenticated;
