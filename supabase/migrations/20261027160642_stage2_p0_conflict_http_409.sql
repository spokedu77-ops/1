-- Stage 2 P0 hotfix: user-facing optimistic concurrency conflicts are HTTP 409,
-- not PostgreSQL serialization failures. Keep signatures, locking, writes,
-- SECURITY DEFINER, search_path, ownership, and existing function ACLs unchanged.

create or replace function public.spokedu_master_update_session_attendance_v2(
  p_owner_id uuid, p_session_id uuid, p_expected_version bigint, p_changes jsonb
) returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.spokedu_master_sessions%rowtype; v_next_version bigint;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception using errcode='22023', message='attendance changes must be an array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_changes) item
    where nullif(item->>'studentId','') is null or not (item ? 'status')
      or (item->'status' <> 'null'::jsonb and item->>'status' not in ('present','absent','pending'))
  ) or (select count(*) from jsonb_array_elements(p_changes)) <>
       (select count(distinct item->>'studentId') from jsonb_array_elements(p_changes) item) then
    raise exception using errcode='22023', message='invalid attendance changes';
  end if;

  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if v_session.status='cancelled' then raise exception using errcode='22023', message='attendance is not editable'; end if;
  if p_expected_version is null or p_expected_version <> v_session.attendance_version then
    raise exception using errcode='PT409', message='session attendance version conflict';
  end if;

  perform public.spokedu_master_class_integrity_lock(p_owner_id, v_session.class_id);
  if exists (
    select 1 from jsonb_array_elements(p_changes) item
    where (item->'status' = 'null'::jsonb and v_session.roster_locked_at is not null)
      or (item->>'status'='pending' and (v_session.status <> 'scheduled' or v_session.roster_locked_at is null))
      or not exists (
        select 1 from public.spokedu_master_students student
        where student.id=(item->>'studentId')::uuid and student.owner_id=p_owner_id
      )
      or (
        v_session.roster_locked_at is not null and not exists (
          select 1 from public.spokedu_master_session_attendance old
          where old.owner_id=p_owner_id and old.session_id=p_session_id and old.student_id=(item->>'studentId')::uuid
        )
      )
      or (
        v_session.roster_locked_at is null and not exists (
          select 1 from public.spokedu_master_class_students membership
          where membership.owner_id=p_owner_id and membership.class_id=v_session.class_id and membership.student_id=(item->>'studentId')::uuid
        )
      )
  ) then raise exception using errcode='22023', message='student is not an allowed participant'; end if;

  delete from public.spokedu_master_session_attendance attendance
  using jsonb_array_elements(p_changes) item
  where attendance.owner_id=p_owner_id and attendance.session_id=p_session_id
    and attendance.student_id=(item->>'studentId')::uuid and item->'status'='null'::jsonb;

  insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,student_name_snapshot,status)
  select p_owner_id,p_session_id,student.id,student.name,item->>'status'
  from jsonb_array_elements(p_changes) item
  join public.spokedu_master_students student on student.id=(item->>'studentId')::uuid and student.owner_id=p_owner_id
  where item->'status' <> 'null'::jsonb
  on conflict (session_id,student_id) do update set
    status=excluded.status,
    student_name_snapshot=case when v_session.status='scheduled' and v_session.roster_locked_at is null then excluded.student_name_snapshot else public.spokedu_master_session_attendance.student_name_snapshot end;

  update public.spokedu_master_sessions set attendance_version=attendance_version+1,updated_at=now()
  where id=p_session_id returning attendance_version into v_next_version;
  return v_next_version;
end $$;

create or replace function public.spokedu_master_save_session_v2(
  p_owner_id uuid, p_session_id uuid, p_expected_memo_version bigint, p_class_id uuid,
  p_start_at timestamptz, p_end_at timestamptz, p_status text, p_memo text
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.spokedu_master_sessions%rowtype; v_id uuid;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if p_expected_memo_version is null or p_expected_memo_version <> v_session.memo_version then
    raise exception using errcode='PT409', message='session memo version conflict';
  end if;
  v_id := public.spokedu_master_save_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,p_status,p_memo,'[]'::jsonb,'[]'::jsonb);
  update public.spokedu_master_sessions set memo_version=memo_version+1,updated_at=now()
  where id=p_session_id returning id into v_id;
  return v_id;
end $$;

create or replace function public.spokedu_master_complete_session_v2(
  p_owner_id uuid, p_session_id uuid, p_expected_memo_version bigint, p_expected_attendance_version bigint,
  p_class_id uuid, p_start_at timestamptz, p_end_at timestamptz, p_memo text, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.spokedu_master_sessions%rowtype; v_id uuid;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if p_expected_memo_version is null or p_expected_memo_version <> v_session.memo_version
     or p_expected_attendance_version is null or p_expected_attendance_version <> v_session.attendance_version then
    raise exception using errcode='PT409', message='session write version conflict';
  end if;
  v_id := public.spokedu_master_complete_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,p_memo,p_attendance);
  update public.spokedu_master_sessions
  set memo_version=memo_version+1,attendance_version=attendance_version+1,updated_at=now()
  where id=p_session_id;
  return v_id;
end $$;

create or replace function public.spokedu_master_save_session_capture_v2(
  p_owner_id uuid, p_session_id uuid, p_expected_version bigint,
  p_next_session_note text, p_observation_changes jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_session public.spokedu_master_sessions%rowtype;
  v_record public.spokedu_master_class_records%rowtype;
begin
  if p_observation_changes is null or jsonb_typeof(p_observation_changes) <> 'array' then
    raise exception using errcode='22023', message='observation changes must be an array';
  end if;
  if char_length(coalesce(p_next_session_note,'')) > 500 then
    raise exception using errcode='22023', message='next session note is too long';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_observation_changes) item
    where nullif(item->>'student_id','') is null
      or char_length(coalesce(item->>'memo','')) > 1000
      or not exists (select 1 from public.spokedu_master_students student where student.id::text=item->>'student_id' and student.owner_id=p_owner_id)
  ) or (select count(*) from jsonb_array_elements(p_observation_changes)) <>
       (select count(distinct item->>'student_id') from jsonb_array_elements(p_observation_changes) item) then
    raise exception using errcode='22023', message='invalid observation changes';
  end if;

  -- This lock also serializes creation when no capture row exists yet.
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;

  select * into v_record from public.spokedu_master_class_records
  where owner_id=p_owner_id and session_id=p_session_id and deleted_at is null for update;
  if found then
    if p_expected_version is null or p_expected_version <> v_record.capture_version then
      raise exception using errcode='PT409', message='session capture version conflict';
    end if;
    update public.spokedu_master_class_records
    set application_idea=nullif(btrim(p_next_session_note),''), capture_version=capture_version+1, updated_at=now()
    where id=v_record.id returning * into v_record;
  else
    if p_expected_version is not null and p_expected_version <> 0 then
      raise exception using errcode='PT409', message='session capture version conflict';
    end if;
    insert into public.spokedu_master_class_records(
      owner_id,session_id,class_date,lesson_title,class_id,record_type,memo,application_idea,parent_note_snapshot,capture_version
    ) values (
      p_owner_id,p_session_id,(v_session.start_at at time zone 'Asia/Seoul')::date,null,v_session.class_id::text,'detailed',null,nullif(btrim(p_next_session_note),''),null,1
    ) returning * into v_record;
  end if;

  delete from public.spokedu_master_class_record_students child
  using jsonb_array_elements(p_observation_changes) item
  where child.record_id=v_record.id and child.owner_id=p_owner_id
    and child.student_id=(item->>'student_id')::uuid and nullif(btrim(item->>'memo'),'') is null;

  insert into public.spokedu_master_class_record_students(
    owner_id,record_id,student_id,student_name_snapshot,attendance,focused,skills,memo,observation_score
  )
  select p_owner_id,v_record.id,student.id,student.name,coalesce(attendance.status,'pending'),false,'{}'::text[],btrim(item->>'memo'),null
  from jsonb_array_elements(p_observation_changes) item
  join public.spokedu_master_students student on student.id=(item->>'student_id')::uuid and student.owner_id=p_owner_id
  left join public.spokedu_master_session_attendance attendance on attendance.owner_id=p_owner_id and attendance.session_id=p_session_id and attendance.student_id=student.id
  where nullif(btrim(item->>'memo'),'') is not null
  on conflict (record_id,student_id) where student_id is not null
  do update set memo=excluded.memo,updated_at=now();
  return v_record.id;
end $$;
