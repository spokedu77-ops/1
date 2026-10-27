create table if not exists public.admin_settlement_sheet_months (
  month_key text primary key check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  payload jsonb not null,
  revision text not null,
  locked boolean not null default false,
  locked_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.admin_settlement_sheet_centers (
  id text primary key,
  payload jsonb not null,
  revision text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.admin_settlement_sheet_settings (
  singleton boolean primary key default true check (singleton),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.admin_settlement_sheet_months enable row level security;
alter table public.admin_settlement_sheet_centers enable row level security;
alter table public.admin_settlement_sheet_settings enable row level security;
revoke all on public.admin_settlement_sheet_months from anon, authenticated;
revoke all on public.admin_settlement_sheet_centers from anon, authenticated;
revoke all on public.admin_settlement_sheet_settings from anon, authenticated;
grant all on public.admin_settlement_sheet_months to service_role;
grant all on public.admin_settlement_sheet_centers to service_role;
grant all on public.admin_settlement_sheet_settings to service_role;
