-- Stage 2 P0 EXPAND: add versioned Session write paths without disabling legacy callers.
-- Contract revocations are deliberately isolated in the later contract migration.

create table if not exists public.spokedu_master_stage2_write_gate (
  singleton boolean primary key default true check (singleton),
  blocked boolean not null default false,
  reason text,
  updated_at timestamptz not null default now()
);

insert into public.spokedu_master_stage2_write_gate(singleton,blocked,reason)
values (true,false,null)
on conflict (singleton) do nothing;

alter table public.spokedu_master_stage2_write_gate enable row level security;
revoke all on table public.spokedu_master_stage2_write_gate from public,anon,authenticated,service_role;

create or replace function public.spokedu_master_enforce_stage2_write_gate()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(742021,2);

  if exists (
    select 1 from public.spokedu_master_stage2_write_gate
    where singleton and blocked
  ) then
    raise exception using
      errcode='55P03',
      message='stage2_cutover_write_gate_active',
      hint='Retry after the Stage 2 maintenance window';
  end if;

  return coalesce(new,old);
end;
$$;

revoke all on function public.spokedu_master_enforce_stage2_write_gate() from public,anon,authenticated,service_role;

drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_sessions;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_sessions
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_session_attendance;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_session_attendance
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_session_programs;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_session_programs
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_class_records;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_class_records
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_class_record_students;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_class_record_students
for each row execute function public.spokedu_master_enforce_stage2_write_gate();

alter table public.spokedu_master_sessions
  add column if not exists memo_version bigint not null default 1,
  add column if not exists attendance_version bigint not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.spokedu_master_sessions'::regclass and conname='spokedu_master_sessions_memo_version_check') then
    alter table public.spokedu_master_sessions add constraint spokedu_master_sessions_memo_version_check check (memo_version >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.spokedu_master_sessions'::regclass and conname='spokedu_master_sessions_attendance_version_check') then
    alter table public.spokedu_master_sessions add constraint spokedu_master_sessions_attendance_version_check check (attendance_version >= 1);
  end if;
end $$;

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
    raise exception using errcode='40001', message='session attendance version conflict';
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
    raise exception using errcode='40001', message='session memo version conflict';
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
    raise exception using errcode='40001', message='session write version conflict';
  end if;
  v_id := public.spokedu_master_complete_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,p_memo,p_attendance);
  update public.spokedu_master_sessions
  set memo_version=memo_version+1,attendance_version=attendance_version+1,updated_at=now()
  where id=p_session_id;
  return v_id;
end $$;

revoke all on function public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb) to service_role;
grant execute on function public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text) to service_role;
grant execute on function public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
