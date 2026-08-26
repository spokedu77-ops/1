-- Exact Session identity for additive Session Capture. Legacy rows remain session_id = null.
alter table public.spokedu_master_class_records
  add column if not exists session_id uuid null
  references public.spokedu_master_sessions(id) on delete restrict;

create unique index if not exists spokedu_master_class_records_owner_session_unique
  on public.spokedu_master_class_records(owner_id, session_id)
  where session_id is not null and deleted_at is null;

create index if not exists spokedu_master_class_records_session_id_idx
  on public.spokedu_master_class_records(session_id)
  where session_id is not null;

create or replace function public.spokedu_master_save_session_capture(
  p_owner_id uuid,
  p_session_id uuid,
  p_next_session_note text,
  p_students jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.spokedu_master_sessions%rowtype;
  v_record_id uuid;
begin
  if p_students is null or jsonb_typeof(p_students) <> 'array' then
    raise exception using errcode = '22023', message = 'students must be an array';
  end if;
  select * into v_session from public.spokedu_master_sessions
   where id = p_session_id and owner_id = p_owner_id and deleted_at is null;
  if v_session.id is null then raise exception using errcode = 'P0002', message = 'session not found'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_students) item
     where nullif(item->>'student_id', '') is null
        or not exists (
          select 1 from public.spokedu_master_students student
           where student.id::text = item->>'student_id' and student.owner_id = p_owner_id
        )
  ) then raise exception using errcode = '22023', message = 'student is not available for this owner'; end if;

  insert into public.spokedu_master_class_records (
    owner_id, session_id, class_date, lesson_title, class_id, record_type,
    memo, application_idea, parent_note_snapshot
  ) values (
    p_owner_id, p_session_id, (v_session.start_at at time zone 'Asia/Seoul')::date,
    null, v_session.class_id::text, 'detailed', null, nullif(btrim(p_next_session_note), ''), null
  ) on conflict (owner_id, session_id) where session_id is not null and deleted_at is null
  do update set application_idea = excluded.application_idea, updated_at = now()
  returning id into v_record_id;

  delete from public.spokedu_master_class_record_students
   where record_id = v_record_id and owner_id = p_owner_id;
  insert into public.spokedu_master_class_record_students (
    owner_id, record_id, student_id, student_name_snapshot, attendance,
    focused, skills, memo, observation_score
  )
  select p_owner_id, v_record_id, student.id, student.name,
    coalesce(attendance.status, 'pending'), false, '{}'::text[],
    nullif(btrim(item->>'memo'), ''), null
  from jsonb_array_elements(p_students) item
  join public.spokedu_master_students student
    on student.id::text = item->>'student_id' and student.owner_id = p_owner_id
  left join public.spokedu_master_session_attendance attendance
    on attendance.session_id = p_session_id and attendance.student_id = student.id
  where nullif(btrim(item->>'memo'), '') is not null;
  return v_record_id;
end;
$$;

revoke all on function public.spokedu_master_save_session_capture(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.spokedu_master_save_session_capture(uuid, uuid, text, jsonb) to service_role;
