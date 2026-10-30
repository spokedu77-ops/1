-- Supabase-like auth helpers + inventory RLS for Stage 2 JWT/RLS tests (isolated DB only).
\set ON_ERROR_STOP on

create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists private;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema private to service_role;
grant service_role to postgres;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = pg_catalog, auth
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
set search_path = pg_catalog, auth
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
      'role', nullif(current_setting('request.jwt.claim.role', true), '')
    )
  );
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete restrict,
  name text not null default '',
  role text,
  is_active boolean not null default true
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'
  );
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
grant select on public.users to authenticated;
