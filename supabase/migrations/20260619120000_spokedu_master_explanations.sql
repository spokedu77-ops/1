-- SPOKEDU MASTER saved explanations.
--
-- This migration moves the existing saved explanation shape to owner-scoped
-- server storage. It does not alter localStorage, class records, students, or
-- sharing flows.
--
-- Pre-apply checks:
--   select to_regclass('public.spokedu_master_explanations') as explanations_table;
--
-- Post-apply checks:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public'
--     and table_name = 'spokedu_master_explanations'
--   order by ordinal_position;
--
-- Rollback:
--   drop table if exists public.spokedu_master_explanations;

create table public.spokedu_master_explanations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  program_id text not null,
  program_title text not null,
  audience text not null check (audience in ('parent', 'center', 'school')),
  explanation_text text not null,
  created_at timestamptz not null default now()
);

create index spokedu_master_explanations_owner_created_at_idx
  on public.spokedu_master_explanations(owner_id, created_at desc);

alter table public.spokedu_master_explanations enable row level security;

create policy spokedu_master_explanations_select_own
  on public.spokedu_master_explanations
  for select
  using (owner_id = (select auth.uid()));

create policy spokedu_master_explanations_insert_own
  on public.spokedu_master_explanations
  for insert
  with check (owner_id = (select auth.uid()));
