-- Stage 2: preserve Session Capture observations under concurrent editors.
-- The legacy RPC remains available for the currently deployed application.
alter table public.spokedu_master_class_records
  add column if not exists capture_version bigint not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.spokedu_master_class_records'::regclass and conname='spokedu_master_class_records_capture_version_check') then
    alter table public.spokedu_master_class_records add constraint spokedu_master_class_records_capture_version_check check (capture_version >= 1);
  end if;
end $$;

create unique index if not exists spokedu_master_record_students_record_student_unique
  on public.spokedu_master_class_record_students(record_id, student_id)
  where student_id is not null;

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
      raise exception using errcode='40001', message='session capture version conflict';
    end if;
    update public.spokedu_master_class_records
    set application_idea=nullif(btrim(p_next_session_note),''), capture_version=capture_version+1, updated_at=now()
    where id=v_record.id returning * into v_record;
  else
    if p_expected_version is not null and p_expected_version <> 0 then
      raise exception using errcode='40001', message='session capture version conflict';
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

revoke all on function public.spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb) to service_role;
