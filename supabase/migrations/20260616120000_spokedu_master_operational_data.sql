-- SPOKEDU MASTER operational data tables.
--
-- This migration prepares server-owned storage for local students and class records.
-- It does not migrate, delete, or alter existing localStorage data or spokedu_pro_* tables.
--
-- Pre-apply checks:
--   select to_regclass('public.spokedu_master_students') as students_table;
--   select to_regclass('public.spokedu_master_class_records') as records_table;
--   select to_regclass('public.spokedu_master_class_record_students') as record_students_table;
--
-- Post-apply checks:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public'
--     and table_name in (
--       'spokedu_master_students',
--       'spokedu_master_class_records',
--       'spokedu_master_class_record_students'
--     )
--   order by table_name, ordinal_position;
--
-- Rollback:
--   drop table if exists public.spokedu_master_class_record_students;
--   drop table if exists public.spokedu_master_class_records;
--   drop table if exists public.spokedu_master_students;

create table public.spokedu_master_students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text null,
  name text not null,
  group_name text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create unique index spokedu_master_students_owner_legacy_unique
  on public.spokedu_master_students(owner_id, legacy_id)
  where legacy_id is not null;

create table public.spokedu_master_class_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text null,
  class_date date not null,
  lesson_title text null,
  class_id text null,
  program_id bigint null,
  program_title text null,
  record_type text not null check (record_type in ('quick', 'detailed')),
  memo text null,
  parent_note_snapshot text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create unique index spokedu_master_class_records_owner_legacy_unique
  on public.spokedu_master_class_records(owner_id, legacy_id)
  where legacy_id is not null;

create table public.spokedu_master_class_record_students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.spokedu_master_class_records(id) on delete cascade,
  student_id uuid null references public.spokedu_master_students(id) on delete set null,
  student_legacy_id text null,
  student_name_snapshot text not null,
  attendance text not null check (attendance in ('pending', 'present', 'absent')),
  focused boolean not null default false,
  skills text[] not null default '{}'::text[],
  memo text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index spokedu_master_class_record_students_record_legacy_unique
  on public.spokedu_master_class_record_students(record_id, student_legacy_id)
  where student_legacy_id is not null;

create or replace function public.spokedu_master_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger spokedu_master_students_updated_at
  before update on public.spokedu_master_students
  for each row execute function public.spokedu_master_set_updated_at();

create trigger spokedu_master_class_records_updated_at
  before update on public.spokedu_master_class_records
  for each row execute function public.spokedu_master_set_updated_at();

create trigger spokedu_master_class_record_students_updated_at
  before update on public.spokedu_master_class_record_students
  for each row execute function public.spokedu_master_set_updated_at();

alter table public.spokedu_master_students enable row level security;
alter table public.spokedu_master_class_records enable row level security;
alter table public.spokedu_master_class_record_students enable row level security;

create policy spokedu_master_students_select_own
  on public.spokedu_master_students
  for select
  using (owner_id = (select auth.uid()));

create policy spokedu_master_students_insert_own
  on public.spokedu_master_students
  for insert
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_students_update_own
  on public.spokedu_master_students
  for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_students_delete_own
  on public.spokedu_master_students
  for delete
  using (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_select_own
  on public.spokedu_master_class_records
  for select
  using (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_insert_own
  on public.spokedu_master_class_records
  for insert
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_update_own
  on public.spokedu_master_class_records
  for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_delete_own
  on public.spokedu_master_class_records
  for delete
  using (owner_id = (select auth.uid()));

create policy spokedu_master_class_record_students_select_own
  on public.spokedu_master_class_record_students
  for select
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );

create policy spokedu_master_class_record_students_insert_own
  on public.spokedu_master_class_record_students
  for insert
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );

create policy spokedu_master_class_record_students_update_own
  on public.spokedu_master_class_record_students
  for update
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );

create policy spokedu_master_class_record_students_delete_own
  on public.spokedu_master_class_record_students
  for delete
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );
