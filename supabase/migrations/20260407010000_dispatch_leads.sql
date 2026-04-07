create table if not exists public.dispatch_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_name text not null,
  manager_name text not null,
  phone text null,
  email text null,
  location text null,
  start_date date null,
  end_date date null,
  programs text[] not null default '{}',
  target_ages text[] not null default '{}',
  headcount text null,
  special_needs text null,
  inquiry text null,
  source text not null default 'dispatch-page'
);

create index if not exists dispatch_leads_created_at_idx on public.dispatch_leads (created_at desc);
create index if not exists dispatch_leads_phone_idx on public.dispatch_leads (phone);
create index if not exists dispatch_leads_email_idx on public.dispatch_leads (email);

