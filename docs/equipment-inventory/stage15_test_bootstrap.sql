-- Minimal PostgreSQL bootstrap for equipment ledger Stage 1.5 integration (isolated test only).
\set ON_ERROR_STOP on

create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists private;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to service_role;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = pg_catalog, auth, public
as $$
  select null::uuid;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select true;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete restrict,
  name text not null default '',
  role text
);

create table if not exists public.catalog (
  id bigserial primary key,
  name text not null,
  category text,
  image text,
  simple_desc text,
  key_points text,
  usage_examples text,
  created_at timestamptz not null default now()
);

-- Legacy tables preserved by expand migration (empty shells for FK-free expand test).
create table if not exists public.inventory (
  id bigserial primary key,
  user_id uuid references public.users (id),
  name text,
  quantity integer default 0
);

create table if not exists public.inventory_logs (
  id bigserial primary key,
  user_id uuid,
  content text,
  type text,
  created_at timestamptz default now()
);

create table if not exists public.teacher_inventory (
  id bigserial primary key,
  user_id uuid,
  name text,
  quantity integer default 0
);
