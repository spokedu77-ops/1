-- Lock completed-session attendance as the class roster snapshot.
-- Existing completed rows are not backfilled or rewritten.

alter table public.spokedu_master_sessions
  add column if not exists roster_locked_at timestamptz null;

comment on column public.spokedu_master_sessions.roster_locked_at is
  'When set, session_attendance is the frozen student roster. Existing completed rows stay null.';

drop trigger if exists spokedu_master_sessions_mark_participants_initialized on public.spokedu_master_sessions;
drop trigger if exists spokedu_master_sessions_snapshot_participants on public.spokedu_master_sessions;
drop trigger if exists spokedu_master_sessions_snapshot_participants_on_start on public.spokedu_master_sessions;
drop trigger if exists spokedu_master_class_students_sync_session_participants on public.spokedu_master_class_students;
drop trigger if exists spokedu_master_students_sync_future_participant_names on public.spokedu_master_students;
drop table if exists public.spokedu_master_session_participants cascade;
alter table public.spokedu_master_sessions drop column if exists participants_initialized_at;

drop function if exists public.spokedu_master_mark_new_session_participants();
drop function if exists public.spokedu_master_snapshot_new_session_participants();
drop function if exists public.spokedu_master_snapshot_participants_on_start();
drop function if exists public.spokedu_master_sync_future_session_participants();
drop function if exists public.spokedu_master_sync_future_participant_names();
drop function if exists public.spokedu_master_session_roster_sync_open(uuid);
drop function if exists public.spokedu_master_session_class_change_open(uuid);
drop function if exists public.spokedu_master_write_session_participants_from_class(uuid,uuid,uuid);
drop function if exists public.spokedu_master_lock_class_pair(uuid,uuid,uuid);
drop function if exists public.spokedu_master_ensure_session_participants(uuid,uuid);

create or replace function public.spokedu_master_guard_session_owner()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_table_name = 'spokedu_master_sessions' then
    if not exists (select 1 from public.spokedu_master_classes c where c.id = new.class_id and c.owner_id = new.owner_id) then
      raise exception using errcode = '23514', message = 'session class owner mismatch';
    end if;
  elsif not exists (select 1 from public.spokedu_master_sessions s where s.id = new.session_id and s.owner_id = new.owner_id) then
    raise exception using errcode = '23514', message = 'session aggregate owner mismatch';
  end if;
  if tg_table_name = 'spokedu_master_session_attendance' then
    if not exists (
      select 1 from public.spokedu_master_students s
      where s.id = new.student_id and s.owner_id = new.owner_id
    ) then
      raise exception using errcode = '23514', message = 'attendance student owner mismatch';
    end if;
  end if;
  return new;
end $$;

create or replace function public.spokedu_master_guard_session_edit_policy()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare v_class_name text;
begin
  if old.status <> new.status and not (
    (old.status='scheduled' and new.status in ('completed','cancelled'))
    or (old.status in ('cancelled','completed') and new.status='scheduled')
  ) then
    raise exception using errcode='22023', message='illegal session transition';
  end if;
  if old.status <> 'scheduled' and new.status = old.status and (
    new.class_id,new.start_at,new.end_at,new.class_name_snapshot,new.completed_at,new.roster_locked_at
  ) is distinct from (
    old.class_id,old.start_at,old.end_at,old.class_name_snapshot,old.completed_at,old.roster_locked_at
  ) then raise exception using errcode='22023', message='historical session fields are locked'; end if;
  if old.status='cancelled' and new.status='cancelled' and new.memo is distinct from old.memo then
    raise exception using errcode='22023', message='cancelled session is locked';
  end if;
  if old.status='scheduled' and old.class_id is distinct from new.class_id then
    select name into v_class_name from public.spokedu_master_classes
     where id=new.class_id and owner_id=new.owner_id and deleted_at is null;
    if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;
    new.class_name_snapshot := v_class_name;
    delete from public.spokedu_master_session_attendance
     where owner_id=old.owner_id and session_id=old.id;
  end if;
  if old.status='scheduled' then
    if v_class_name is null then
      select name into v_class_name from public.spokedu_master_classes
       where id=new.class_id and owner_id=new.owner_id and deleted_at is null;
    end if;
    new.class_name_snapshot := v_class_name;
    new.completed_at := case when new.status='completed' then now() else null end;
  end if;
  if old.status='scheduled' and new.status='completed' and new.roster_locked_at is null then
    new.roster_locked_at := now();
  end if;
  if old.status in ('cancelled','completed') and new.status='scheduled' then
    new.completed_at := null;
    new.roster_locked_at := null;
  end if;
  return new;
end $$;

create or replace function public.spokedu_master_assert_complete_attendance(p_owner_id uuid, p_session_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_session public.spokedu_master_sessions%rowtype;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;

  perform public.spokedu_master_class_integrity_lock(p_owner_id, v_session.class_id);
  if v_session.roster_locked_at is not null then
    if exists (
      select 1 from public.spokedu_master_session_attendance attendance
      where attendance.owner_id=p_owner_id and attendance.session_id=p_session_id
        and attendance.status not in ('present','absent')
    ) then
      raise exception using errcode='22023', message='complete attendance must exactly match locked roster';
    end if;
    return;
  end if;

  if exists (
    select 1 from public.spokedu_master_class_students membership
    where membership.owner_id=p_owner_id and membership.class_id=v_session.class_id
      and not exists (
        select 1 from public.spokedu_master_session_attendance attendance
        where attendance.owner_id=p_owner_id and attendance.session_id=p_session_id
          and attendance.student_id=membership.student_id and attendance.status in ('present','absent')
      )
  ) then
    raise exception using errcode='22023', message='complete attendance must include current class roster';
  end if;
end;
$$;

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
    where item->>'status' not in ('present','absent') or nullif(item->>'studentId','') is null
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

create or replace function public.spokedu_master_complete_session(
  p_owner_id uuid, p_session_id uuid, p_class_id uuid, p_start_at timestamptz,
  p_end_at timestamptz, p_memo text, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_session public.spokedu_master_sessions%rowtype;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;

  if v_session.status='completed' then
    if v_session.class_id is distinct from p_class_id or v_session.start_at is distinct from p_start_at
      or v_session.end_at is distinct from p_end_at then
      raise exception using errcode='22023', message='historical session fields are locked';
    end if;
    perform public.spokedu_master_replace_session_attendance(p_owner_id,p_session_id,coalesce(p_attendance,'[]'::jsonb));
    perform public.spokedu_master_assert_complete_attendance(p_owner_id,p_session_id);
    update public.spokedu_master_sessions set memo=nullif(btrim(p_memo),''), updated_at=now()
    where id=p_session_id and owner_id=p_owner_id;
    return p_session_id;
  end if;

  if v_session.status <> 'scheduled' then raise exception using errcode='22023', message='session cannot be completed'; end if;
  perform public.spokedu_master_save_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,'scheduled',p_memo,'[]'::jsonb,'[]'::jsonb);
  perform public.spokedu_master_replace_session_attendance(p_owner_id,p_session_id,coalesce(p_attendance,'[]'::jsonb));
  perform public.spokedu_master_assert_complete_attendance(p_owner_id,p_session_id);
  perform public.spokedu_master_save_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,'completed',p_memo,'[]'::jsonb,'[]'::jsonb);
  return p_session_id;
end;
$$;

revoke all on function public.spokedu_master_assert_complete_attendance(uuid,uuid) from public,anon,authenticated;
revoke all on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
revoke all on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_assert_complete_attendance(uuid,uuid) to service_role;
grant execute on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
grant execute on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) to service_role;
