-- Read-only verification for 20260823020000_spokedu_master_foundation_lockdown.sql.
-- Run in the Supabase SQL editor for the intended staging/target project.
-- This script does not mutate application data.

begin transaction read only;

do $$
declare
  missing_items text[] := array[]::text[];
  function_name text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spokedu_master_sessions'
      and column_name = 'class_name_snapshot' and is_nullable = 'NO'
  ) then
    missing_items := array_append(missing_items, 'sessions.class_name_snapshot NOT NULL');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spokedu_master_session_attendance'
      and column_name = 'student_name_snapshot' and is_nullable = 'NO'
  ) then
    missing_items := array_append(missing_items, 'attendance.student_name_snapshot NOT NULL');
  end if;

  foreach function_name in array array[
    'spokedu_master_save_student',
    'spokedu_master_soft_delete_student',
    'spokedu_master_save_session',
    'spokedu_master_replace_session_attendance',
    'spokedu_master_add_session_program',
    'spokedu_master_update_session_program_completion'
  ] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = function_name
    ) then
      missing_items := array_append(missing_items, 'RPC ' || function_name);
    end if;
  end loop;

  if cardinality(missing_items) > 0 then
    raise exception 'Foundation lockdown verification failed; missing: %', array_to_string(missing_items, ', ');
  end if;
end $$;

select
  count(*) filter (where nullif(btrim(class_name_snapshot), '') is null) as null_class_snapshots,
  count(*) as total_sessions
from public.spokedu_master_sessions;

select
  count(*) filter (where nullif(btrim(student_name_snapshot), '') is null) as null_student_snapshots,
  count(*) as total_attendance_rows
from public.spokedu_master_session_attendance;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'spokedu_master_sessions',
    'spokedu_master_session_programs',
    'spokedu_master_session_attendance',
    'spokedu_master_class_students'
  )
order by c.relname;

select p.proname, p.prosecdef as security_definer, p.proacl as grants
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'spokedu_master_save_student',
    'spokedu_master_soft_delete_student',
    'spokedu_master_save_session',
    'spokedu_master_replace_session_attendance',
    'spokedu_master_add_session_program',
    'spokedu_master_update_session_program_completion'
  )
order by p.proname;

select count(*) as sessions_with_class_snapshot_drift
from public.spokedu_master_sessions s
join public.spokedu_master_classes c on c.id = s.class_id
where s.status = 'scheduled' and s.class_name_snapshot is distinct from c.name;

rollback;

-- Expected:
-- 1) both null snapshot counts are 0;
-- 2) all four tables show rls_enabled = true;
-- 3) all six RPCs are present and security_definer = true;
-- 4) scheduled sessions_with_class_snapshot_drift = 0.
-- The following smoke writes only inside a transaction and always rolls back.
-- Run it on local/staging only. It reuses one active owner/class and leaves no rows.
begin;
do $$
declare
  v_owner uuid;
  v_class uuid;
  v_student uuid;
  v_session uuid;
  v_snapshot text;
  v_reopen_blocked boolean := false;
begin
  select owner_id, id into v_owner, v_class
  from public.spokedu_master_classes
  where deleted_at is null
  order by created_at
  limit 1;

  if v_owner is null then
    raise notice 'Mutation smoke skipped: no active class fixture exists.';
    return;
  end if;

  v_student := public.spokedu_master_save_student(
    v_owner, null, 'foundation-verification', '검증 학생', '{}'::jsonb, null, array[v_class]
  );
  if not exists (
    select 1 from public.spokedu_master_class_students
    where owner_id = v_owner and class_id = v_class and student_id = v_student
  ) then raise exception 'transactional student membership smoke failed'; end if;

  v_session := public.spokedu_master_save_session(
    v_owner, null, v_class, now() + interval '1 day', now() + interval '2 hours 1 day',
    'scheduled', 'verification', '[]'::jsonb, '[]'::jsonb
  );
  perform public.spokedu_master_replace_session_attendance(
    v_owner, v_session,
    jsonb_build_array(jsonb_build_object('studentId', v_student::text, 'status', 'present'))
  );
  perform public.spokedu_master_save_session(
    v_owner, v_session, v_class, now() + interval '1 day', now() + interval '2 hours 1 day',
    'completed', 'verification complete', '[]'::jsonb, '[]'::jsonb
  );
  perform public.spokedu_master_soft_delete_student(v_owner, v_student);

  select student_name_snapshot into v_snapshot
  from public.spokedu_master_session_attendance
  where session_id = v_session and student_id = v_student;
  if v_snapshot <> '검증 학생' then raise exception 'historical attendance snapshot smoke failed'; end if;

  begin
    perform public.spokedu_master_save_session(
      v_owner, v_session, v_class, now() + interval '1 day', now() + interval '2 hours 1 day',
      'scheduled', 'illegal reopen', '[]'::jsonb, '[]'::jsonb
    );
  exception when sqlstate '22023' then
    v_reopen_blocked := true;
  end;
  if not v_reopen_blocked then raise exception 'illegal Session reopen was not blocked'; end if;

  raise notice 'Foundation mutation smoke passed for owner % (all changes will roll back).', v_owner;
end $$;
rollback;
