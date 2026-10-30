-- Legacy catalog/inventory shells for local Supabase reset (IF NOT EXISTS — no-op on production).

create table if not exists public.catalog (
  id bigserial primary key,
  name text not null default '',
  category text,
  image text,
  simple_desc text,
  key_points text,
  usage_examples text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id bigserial primary key,
  user_id uuid,
  name text,
  quantity integer not null default 0,
  category text,
  image text,
  simple_desc text,
  key_points text,
  usage_examples text,
  updated_at timestamptz default now()
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
  category text,
  count integer not null default 0
);
