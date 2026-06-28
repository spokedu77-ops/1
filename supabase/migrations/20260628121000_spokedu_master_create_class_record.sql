-- Atomically create one SPOKEDU MASTER class record and all child rows.
-- The existing owner-scoped legacy_id unique index is used as the idempotency key.

create or replace function public.spokedu_master_create_class_record(
  p_owner_id uuid,
  p_legacy_id text,
  p_class_date date,
  p_lesson_title text,
  p_class_id text,
  p_program_id bigint,
  p_program_title text,
  p_record_type text,
  p_memo text,
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

  if p_record_type not in ('quick', 'detailed') then
    raise exception using errcode = '22023', message = 'record_type is invalid';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_students) student
     where coalesce(student->>'attendance', '') not in ('pending', 'present', 'absent')
  ) then
    raise exception using errcode = '22023', message = 'attendance is invalid';
  end if;

  if exists (
    select 1
     from jsonb_array_elements(p_students) student
     where nullif(student->>'student_id', '') is not null
       and (
         (student->>'student_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or not exists (
           select 1
             from public.spokedu_master_students owned_student
            where owned_student.id::text = student->>'student_id'
              and owned_student.owner_id = p_owner_id
              and owned_student.deleted_at is null
         )
       )
  ) then
    raise exception using errcode = '22023', message = 'student is not available for this owner';
  end if;

  if p_legacy_id is not null then
    select record.id
      into v_record_id
      from public.spokedu_master_class_records record
     where record.owner_id = p_owner_id
       and record.legacy_id = p_legacy_id
       and record.deleted_at is null
     for update;

    if v_record_id is not null then
      record_id := v_record_id;
      created := false;
      return next;
      return;
    end if;
  end if;

  insert into public.spokedu_master_class_records (
    owner_id,
    legacy_id,
    class_date,
    lesson_title,
    class_id,
    program_id,
    program_title,
    record_type,
    memo,
    parent_note_snapshot
  )
  values (
    p_owner_id,
    p_legacy_id,
    p_class_date,
    p_lesson_title,
    p_class_id,
    p_program_id,
    p_program_title,
    p_record_type,
    p_memo,
    p_parent_note_snapshot
  )
  on conflict (owner_id, legacy_id) where legacy_id is not null do nothing
  returning id into v_record_id;

  if v_record_id is null and p_legacy_id is not null then
    select record.id
      into v_record_id
      from public.spokedu_master_class_records record
     where record.owner_id = p_owner_id
       and record.legacy_id = p_legacy_id
       and record.deleted_at is null
     for update;

    if v_record_id is null then
      raise exception using errcode = '23505', message = 'class record idempotency key conflicts with unavailable record';
    end if;

    record_id := v_record_id;
    created := false;
    return next;
    return;
  end if;

  insert into public.spokedu_master_class_record_students (
    owner_id,
    record_id,
    student_id,
    student_legacy_id,
    student_name_snapshot,
    attendance,
    focused,
    skills,
    memo
  )
  select
    p_owner_id,
    v_record_id,
    nullif(student->>'student_id', '')::uuid,
    nullif(student->>'student_legacy_id', ''),
    student->>'student_name_snapshot',
    student->>'attendance',
    coalesce((student->>'focused')::boolean, false),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(student->'skills', '[]'::jsonb))),
      '{}'::text[]
    ),
    nullif(student->>'memo', '')
  from jsonb_array_elements(p_students) student;

  record_id := v_record_id;
  created := true;
  return next;
end;
$$;

revoke all on function public.spokedu_master_create_class_record(
  uuid, text, date, text, text, bigint, text, text, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.spokedu_master_create_class_record(
  uuid, text, date, text, text, bigint, text, text, text, text, jsonb
) to service_role;
