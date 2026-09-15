-- Canonical "next session" flow: preserve the completed occurrence roster while
-- starting the new occurrence with no attendance results, activities, or memo.

alter table public.spokedu_master_session_attendance
  drop constraint if exists spokedu_master_session_attendance_status_check;
alter table public.spokedu_master_session_attendance
  add constraint spokedu_master_session_attendance_status_check
  check (status in ('pending', 'present', 'absent'));

create or replace function public.spokedu_master_guard_locked_roster_class()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if old.roster_locked_at is not null and new.class_id is distinct from old.class_id then
    raise exception using errcode='22023', message='locked roster class cannot be changed';
  end if;
  return new;
end $$;

drop trigger if exists spokedu_master_sessions_locked_roster_class on public.spokedu_master_sessions;
create trigger spokedu_master_sessions_locked_roster_class
before update of class_id on public.spokedu_master_sessions
for each row execute function public.spokedu_master_guard_locked_roster_class();

revoke all on function public.spokedu_master_guard_locked_roster_class() from public, anon, authenticated;

create or replace function public.spokedu_master_replace_session_attendance(
  p_owner_id uuid, p_session_id uuid, p_attendance jsonb
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_session public.spokedu_master_sessions%rowtype;
begin
  if jsonb_typeof(p_attendance) <> 'array' then raise exception using errcode='22023', message='invalid attendance'; end if;
  select * into v_session from public.spokedu_master_sessions
   where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found or v_session.status='cancelled' then raise exception using errcode='22023', message='attendance is not editable'; end if;
  perform public.spokedu_master_class_integrity_lock(p_owner_id, v_session.class_id);
  if exists (
    select 1 from jsonb_array_elements(p_attendance) item
    where item->>'status' not in ('present','absent','pending')
      or (item->>'status'='pending' and (v_session.status <> 'scheduled' or v_session.roster_locked_at is null))
      or nullif(item->>'studentId','') is null
  ) or (select count(*) from jsonb_array_elements(p_attendance)) <>
       (select count(distinct item->>'studentId') from jsonb_array_elements(p_attendance) item) then
    raise exception using errcode='22023', message='invalid attendance';
  end if;

  if v_session.roster_locked_at is not null then
    if exists (
      select 1 from jsonb_array_elements(p_attendance) item
      where not exists (
        select 1 from public.spokedu_master_session_attendance old
        where old.owner_id=p_owner_id and old.session_id=p_session_id
          and old.student_id=(item->>'studentId')::uuid
      )
    ) or exists (
      select 1 from public.spokedu_master_session_attendance old
      where old.owner_id=p_owner_id and old.session_id=p_session_id
        and not exists (select 1 from jsonb_array_elements(p_attendance) item where (item->>'studentId')::uuid=old.student_id)
    ) then
      raise exception using errcode='22023', message='locked roster cannot add or remove students';
    end if;
  else
    if exists (
      select 1 from jsonb_array_elements(p_attendance) item
      where not exists (
        select 1 from public.spokedu_master_class_students membership
        where membership.owner_id=p_owner_id and membership.class_id=v_session.class_id
          and membership.student_id=(item->>'studentId')::uuid
      ) and not (
        v_session.status='completed' and exists (
          select 1 from public.spokedu_master_session_attendance old
          where old.owner_id=p_owner_id and old.session_id=p_session_id
            and old.student_id=(item->>'studentId')::uuid
        )
      )
    ) then raise exception using errcode='22023', message='student is not an allowed participant'; end if;

    if v_session.status='completed' and exists (
      select 1 from public.spokedu_master_session_attendance old
      where old.owner_id=p_owner_id and old.session_id=p_session_id
        and not exists (select 1 from jsonb_array_elements(p_attendance) item where (item->>'studentId')::uuid=old.student_id)
    ) then raise exception using errcode='22023', message='historical participant cannot be removed'; end if;
  end if;

  if v_session.status='scheduled' then
    delete from public.spokedu_master_session_attendance where owner_id=p_owner_id and session_id=p_session_id;
  end if;
  insert into public.spokedu_master_session_attendance(
    owner_id,session_id,student_id,student_name_snapshot,status
  )
  select p_owner_id,p_session_id,student.id,student.name,item->>'status'
  from jsonb_array_elements(p_attendance) item
  join public.spokedu_master_students student
    on student.id=(item->>'studentId')::uuid and student.owner_id=p_owner_id
  on conflict (session_id,student_id) do update set
    status=excluded.status,
    student_name_snapshot=case
      when v_session.status='scheduled' then excluded.student_name_snapshot
      else public.spokedu_master_session_attendance.student_name_snapshot
    end;
end $$;

create or replace function public.spokedu_master_create_next_session_fresh(
  p_owner_id uuid, p_source_session_id uuid, p_start_at timestamptz, p_end_at timestamptz
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_source public.spokedu_master_sessions%rowtype; v_next_id uuid;
begin
  if p_end_at <= p_start_at then raise exception using errcode='22023', message='invalid next session time'; end if;
  select * into v_source from public.spokedu_master_sessions
  where id=p_source_session_id and owner_id=p_owner_id and status='completed' and deleted_at is null for share;
  if not found then raise exception using errcode='22023', message='source session must be completed'; end if;
  if not exists (
    select 1 from public.spokedu_master_classes
    where id=v_source.class_id and owner_id=p_owner_id and deleted_at is null
  ) then raise exception using errcode='22023', message='class unavailable'; end if;

  perform public.spokedu_master_assert_no_class_time_collision(p_owner_id, v_source.class_id, null, p_start_at, p_end_at);
  insert into public.spokedu_master_sessions(
    owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at,started_at,roster_locked_at
  ) values (
    p_owner_id,v_source.class_id,v_source.class_name_snapshot,p_start_at,p_end_at,'scheduled',null,null,null,now()
  ) returning id into v_next_id;

  insert into public.spokedu_master_session_attendance(
    owner_id,session_id,student_id,student_name_snapshot,status
  )
  select p_owner_id,v_next_id,student_id,student_name_snapshot,'pending'
  from public.spokedu_master_session_attendance
  where owner_id=p_owner_id and session_id=p_source_session_id;

  return v_next_id;
end $$;

revoke all on function public.spokedu_master_create_next_session_fresh(uuid,uuid,timestamptz,timestamptz)
  from public, anon, authenticated;
grant execute on function public.spokedu_master_create_next_session_fresh(uuid,uuid,timestamptz,timestamptz)
  to service_role;
