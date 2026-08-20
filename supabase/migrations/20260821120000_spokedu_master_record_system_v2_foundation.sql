-- SPOKEDU MASTER Record System V2 data foundation.
-- Existing quick/detailed records and the legacy RPC signatures remain unchanged.

alter table public.spokedu_master_class_records
  add column if not exists application_idea text null;

alter table public.spokedu_master_students
  add column if not exists guidance_note text null;

alter table public.spokedu_master_class_record_students
  add column if not exists observation_score smallint null;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select constraint_name
      from information_schema.table_constraints
     where table_schema = 'public'
       and table_name = 'spokedu_master_class_records'
       and constraint_type = 'CHECK'
       and constraint_name in (
         select conname
           from pg_constraint
          where conrelid = 'public.spokedu_master_class_records'::regclass
            and contype = 'c'
            and pg_get_constraintdef(oid) like '%record_type%'
       )
  loop
    execute format(
      'alter table public.spokedu_master_class_records drop constraint %I',
      constraint_row.constraint_name
    );
  end loop;

  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.spokedu_master_class_records'::regclass
       and conname = 'spokedu_master_class_records_record_type_check'
  ) then
    alter table public.spokedu_master_class_records
      add constraint spokedu_master_class_records_record_type_check
      check (record_type in ('quick', 'detailed', 'lesson_note'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.spokedu_master_class_record_students'::regclass
       and conname = 'spokedu_master_class_record_students_observation_score_check'
  ) then
    alter table public.spokedu_master_class_record_students
      add constraint spokedu_master_class_record_students_observation_score_check
      check (observation_score is null or observation_score between 1 and 3);
  end if;
end;
$$;

create or replace function public.spokedu_master_create_class_record_v2(
  p_owner_id uuid,
  p_legacy_id text,
  p_class_date date,
  p_lesson_title text,
  p_class_id text,
  p_program_id bigint,
  p_program_title text,
  p_record_type text,
  p_memo text,
  p_application_idea text,
  p_parent_note_snapshot text,
  p_students jsonb
)
returns table(record_id uuid, created boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_record_id uuid;
begin
  if p_students is null or jsonb_typeof(p_students) <> 'array' then
    raise exception using errcode = '22023', message = 'students must be an array';
  end if;
  if p_record_type not in ('quick', 'detailed', 'lesson_note') then
    raise exception using errcode = '22023', message = 'record_type is invalid';
  end if;
  if p_record_type = 'lesson_note'
     and (p_program_id is null or nullif(btrim(p_memo), '') is null or jsonb_array_length(p_students) <> 0) then
    raise exception using errcode = '22023', message = 'lesson_note requires program, memo, and no students';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_students) student
     where coalesce(student->>'attendance', '') not in ('pending', 'present', 'absent')
        or (student->>'observation_score' is not null
            and student->>'observation_score' not in ('1', '2', '3'))
  ) then
    raise exception using errcode = '22023', message = 'record student value is invalid';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_students) student
     where nullif(student->>'student_id', '') is not null
       and ((student->>'student_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or not exists (
           select 1 from public.spokedu_master_students owned_student
            where owned_student.id::text = student->>'student_id'
              and owned_student.owner_id = p_owner_id
              and owned_student.deleted_at is null
         ))
  ) then
    raise exception using errcode = '22023', message = 'student is not available for this owner';
  end if;

  if p_legacy_id is not null then
    select record.id into v_record_id
      from public.spokedu_master_class_records record
     where record.owner_id = p_owner_id and record.legacy_id = p_legacy_id
       and record.deleted_at is null for update;
    if v_record_id is not null then
      record_id := v_record_id; created := false; return next; return;
    end if;
  end if;

  insert into public.spokedu_master_class_records (
    owner_id, legacy_id, class_date, lesson_title, class_id, program_id,
    program_title, record_type, memo, application_idea, parent_note_snapshot
  ) values (
    p_owner_id, p_legacy_id, p_class_date, p_lesson_title, p_class_id, p_program_id,
    p_program_title, p_record_type, p_memo, p_application_idea, p_parent_note_snapshot
  )
  on conflict (owner_id, legacy_id) where legacy_id is not null do nothing
  returning id into v_record_id;

  if v_record_id is null and p_legacy_id is not null then
    select record.id into v_record_id
      from public.spokedu_master_class_records record
     where record.owner_id = p_owner_id and record.legacy_id = p_legacy_id
       and record.deleted_at is null for update;
    if v_record_id is null then
      raise exception using errcode = '23505', message = 'class record idempotency key conflicts with unavailable record';
    end if;
    record_id := v_record_id; created := false; return next; return;
  end if;

  insert into public.spokedu_master_class_record_students (
    owner_id, record_id, student_id, student_legacy_id, student_name_snapshot,
    attendance, focused, skills, memo, observation_score
  )
  select p_owner_id, v_record_id, nullif(student->>'student_id', '')::uuid,
    nullif(student->>'student_legacy_id', ''), student->>'student_name_snapshot',
    student->>'attendance', coalesce((student->>'focused')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(coalesce(student->'skills', '[]'::jsonb))), '{}'::text[]),
    nullif(student->>'memo', ''), nullif(student->>'observation_score', '')::smallint
  from jsonb_array_elements(p_students) student;

  record_id := v_record_id; created := true; return next;
end;
$$;

create or replace function public.spokedu_master_replace_class_record_v2(
  p_owner_id uuid,
  p_record_id uuid,
  p_class_date date,
  p_lesson_title text,
  p_class_id text,
  p_program_id bigint,
  p_program_title text,
  p_record_type text,
  p_memo text,
  p_application_idea text,
  p_parent_note_snapshot text,
  p_students jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_record_id uuid;
begin
  if p_students is null or jsonb_typeof(p_students) <> 'array' then
    raise exception using errcode = '22023', message = 'students must be an array';
  end if;
  if p_record_type not in ('quick', 'detailed', 'lesson_note') then
    raise exception using errcode = '22023', message = 'record_type is invalid';
  end if;
  if p_record_type = 'lesson_note'
     and (p_program_id is null or nullif(btrim(p_memo), '') is null or jsonb_array_length(p_students) <> 0) then
    raise exception using errcode = '22023', message = 'lesson_note requires program, memo, and no students';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_students) student
     where coalesce(student->>'attendance', '') not in ('pending', 'present', 'absent')
        or (student->>'observation_score' is not null
            and student->>'observation_score' not in ('1', '2', '3'))
  ) then
    raise exception using errcode = '22023', message = 'record student value is invalid';
  end if;

  select record.id into v_record_id
    from public.spokedu_master_class_records record
   where record.id = p_record_id and record.owner_id = p_owner_id
     and record.deleted_at is null for update;
  if v_record_id is null then
    raise exception using errcode = 'P0002', message = 'class record not found';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_students) student
     where nullif(student->>'student_id', '') is not null
       and ((student->>'student_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or not exists (
           select 1 from public.spokedu_master_students owned_student
            where owned_student.id::text = student->>'student_id'
              and owned_student.owner_id = p_owner_id
              and owned_student.deleted_at is null
         ))
  ) then
    raise exception using errcode = '22023', message = 'student is not available for this owner';
  end if;

  update public.spokedu_master_class_records
     set class_date = p_class_date, lesson_title = p_lesson_title, class_id = p_class_id,
         program_id = p_program_id, program_title = p_program_title, record_type = p_record_type,
         memo = p_memo, application_idea = p_application_idea,
         parent_note_snapshot = p_parent_note_snapshot
   where id = v_record_id;

  delete from public.spokedu_master_class_record_students
   where record_id = v_record_id and owner_id = p_owner_id;

  insert into public.spokedu_master_class_record_students (
    owner_id, record_id, student_id, student_legacy_id, student_name_snapshot,
    attendance, focused, skills, memo, observation_score
  )
  select p_owner_id, v_record_id, nullif(student->>'student_id', '')::uuid,
    nullif(student->>'student_legacy_id', ''), student->>'student_name_snapshot',
    student->>'attendance', coalesce((student->>'focused')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(coalesce(student->'skills', '[]'::jsonb))), '{}'::text[]),
    nullif(student->>'memo', ''), nullif(student->>'observation_score', '')::smallint
  from jsonb_array_elements(p_students) student;

  return v_record_id;
end;
$$;

revoke all on function public.spokedu_master_create_class_record_v2(
  uuid, text, date, text, text, bigint, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.spokedu_master_create_class_record_v2(
  uuid, text, date, text, text, bigint, text, text, text, text, text, jsonb
) to service_role;

revoke all on function public.spokedu_master_replace_class_record_v2(
  uuid, uuid, date, text, text, bigint, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.spokedu_master_replace_class_record_v2(
  uuid, uuid, date, text, text, bigint, text, text, text, text, text, jsonb
) to service_role;

-- Rollback consideration: stop V2 writes first. Preserve/export lesson_note rows before
-- restoring the old record_type check, then drop the V2 functions and nullable columns.
