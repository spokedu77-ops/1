create extension if not exists pgcrypto;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key);

create table public.spokedu_master_classes(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  name text not null, deleted_at timestamptz null
);
create table public.spokedu_master_students(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  name text not null, deleted_at timestamptz null
);
create table public.spokedu_master_sessions(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  class_id uuid not null references public.spokedu_master_classes(id), class_name_snapshot text not null,
  start_at timestamptz not null, end_at timestamptz not null, status text not null,
  memo text null, deleted_at timestamptz null
);
create table public.spokedu_master_session_attendance(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  session_id uuid not null references public.spokedu_master_sessions(id),
  student_id uuid not null references public.spokedu_master_students(id),
  student_name_snapshot text not null, status text not null check(status in ('pending','present','absent')),
  unique(session_id,student_id)
);
create table public.spokedu_master_class_records(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  session_id uuid null references public.spokedu_master_sessions(id) on delete restrict,
  legacy_id text null, class_date date not null, lesson_title text null, class_id text null,
  program_id bigint null, program_title text null, record_type text not null check(record_type in ('quick','detailed','lesson_note')),
  memo text null, application_idea text null, parent_note_snapshot text null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz null
);
create unique index spokedu_master_class_records_owner_session_unique
  on public.spokedu_master_class_records(owner_id,session_id) where session_id is not null and deleted_at is null;
create table public.spokedu_master_class_record_students(
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  record_id uuid not null references public.spokedu_master_class_records(id) on delete cascade,
  student_id uuid null references public.spokedu_master_students(id) on delete set null,
  student_legacy_id text null, student_name_snapshot text not null,
  attendance text not null check(attendance in ('pending','present','absent')),
  focused boolean not null default false, skills text[] not null default '{}'::text[], memo text null,
  observation_score smallint null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
