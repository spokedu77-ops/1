-- Local Supabase only: unblock requireTeacherMaterialsAccess (getMasterAccountType).
\set ON_ERROR_STOP on

create table if not exists public.spokedu_master_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '선생님',
  school text not null default '',
  role text not null default 'teacher',
  age_groups jsonb not null default '[]'::jsonb,
  program_types jsonb not null default '[]'::jsonb,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  account_type text not null default 'individual'
);

alter table public.spokedu_master_profiles
  add column if not exists account_type text not null default 'individual';
