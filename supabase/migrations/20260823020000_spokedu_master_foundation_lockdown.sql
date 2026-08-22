-- Final integrity boundary for the Session-centered SPOKEDU MASTER runtime.
-- ClassRecord tables and group_name remain historical sources only.

alter table public.spokedu_master_sessions
  add column if not exists class_name_snapshot text;
alter table public.spokedu_master_session_attendance
  add column if not exists student_name_snapshot text;

update public.spokedu_master_sessions session_row
set class_name_snapshot = class_row.name
from public.spokedu_master_classes class_row
where class_row.id = session_row.class_id
  and nullif(btrim(session_row.class_name_snapshot), '') is null;

update public.spokedu_master_session_attendance attendance
set student_name_snapshot = coalesce(
  (select record_student.student_name_snapshot
     from public.spokedu_master_sessions session_row
     join public.spokedu_master_class_record_students record_student
       on record_student.record_id = session_row.legacy_record_id
      and record_student.student_id = attendance.student_id
    where session_row.id = attendance.session_id
    limit 1),
  student.name
)
from public.spokedu_master_students student
where student.id = attendance.student_id
  and nullif(btrim(attendance.student_name_snapshot), '') is null;

alter table public.spokedu_master_sessions
  alter column class_name_snapshot set not null;
alter table public.spokedu_master_session_attendance
  alter column student_name_snapshot set not null;

create or replace function public.spokedu_master_guard_session_edit_policy()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare v_class_name text;
begin
  if old.status <> new.status and not (old.status='scheduled' and new.status in ('completed','cancelled')) then
    raise exception using errcode='22023', message='illegal session transition';
  end if;
  if old.status <> 'scheduled' and (
    new.class_id,new.start_at,new.end_at,new.class_name_snapshot,new.completed_at
  ) is distinct from (
    old.class_id,old.start_at,old.end_at,old.class_name_snapshot,old.completed_at
  ) then raise exception using errcode='22023', message='historical session fields are locked'; end if;
  if old.status='cancelled' and new.memo is distinct from old.memo then
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
  return new;
end $$;

create or replace function public.spokedu_master_save_student(
  p_owner_id uuid, p_student_id uuid, p_legacy_id text, p_name text,
  p_meta jsonb, p_guidance_note text, p_class_ids uuid[]
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid; v_class_ids uuid[] := coalesce(p_class_ids, array[]::uuid[]);
begin
  if nullif(btrim(p_name), '') is null then
    raise exception using errcode='22023', message='student name is required';
  end if;
  if cardinality(v_class_ids) <> (select count(distinct id) from unnest(v_class_ids) id) then
    raise exception using errcode='22023', message='duplicate class id';
  end if;
  if exists (
    select 1 from unnest(v_class_ids) requested(id)
    where not exists (
      select 1 from public.spokedu_master_classes class_row
      where class_row.id=requested.id and class_row.owner_id=p_owner_id and class_row.deleted_at is null
    )
  ) then
    raise exception using errcode='22023', message='class unavailable';
  end if;

  if p_student_id is null then
    insert into public.spokedu_master_students(owner_id,legacy_id,name,group_name,meta,guidance_note)
    values(p_owner_id,nullif(btrim(p_legacy_id),''),btrim(p_name),null,coalesce(p_meta,'{}'::jsonb),nullif(btrim(p_guidance_note),''))
    returning id into v_id;
  else
    update public.spokedu_master_students
       set name=btrim(p_name), meta=coalesce(p_meta,'{}'::jsonb), guidance_note=nullif(btrim(p_guidance_note),'')
     where id=p_student_id and owner_id=p_owner_id and deleted_at is null
     returning id into v_id;
    if v_id is null then raise exception using errcode='P0002', message='student not found'; end if;
  end if;

  delete from public.spokedu_master_class_students membership
   where membership.owner_id=p_owner_id and membership.student_id=v_id
     and not (membership.class_id = any(v_class_ids));
  insert into public.spokedu_master_class_students(owner_id,class_id,student_id)
  select p_owner_id,class_id,v_id from unnest(v_class_ids) class_id
  on conflict (class_id,student_id) do nothing;
  return v_id;
end $$;

create or replace function public.spokedu_master_soft_delete_student(
  p_owner_id uuid, p_student_id uuid
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.spokedu_master_students
    where id=p_student_id and owner_id=p_owner_id and deleted_at is null for update
  ) then raise exception using errcode='P0002', message='student not found'; end if;
  delete from public.spokedu_master_class_students
   where owner_id=p_owner_id and student_id=p_student_id;
  update public.spokedu_master_students set deleted_at=now()
   where id=p_student_id and owner_id=p_owner_id;
end $$;

create or replace function public.spokedu_master_save_session(
  p_owner_id uuid, p_session_id uuid, p_class_id uuid, p_start_at timestamptz,
  p_end_at timestamptz, p_status text, p_memo text, p_programs jsonb, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_id uuid; v_old public.spokedu_master_sessions%rowtype;
  v_class_name text; v_completed_at timestamptz;
begin
  if p_status not in ('scheduled','completed','cancelled') or p_end_at <= p_start_at then
    raise exception using errcode='22023', message='invalid session';
  end if;
  select name into v_class_name from public.spokedu_master_classes
   where id=p_class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;

  if p_session_id is null then
    if p_status <> 'scheduled' then raise exception using errcode='22023', message='new session must be scheduled'; end if;
    insert into public.spokedu_master_sessions(
      owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at
    ) values (
      p_owner_id,p_class_id,v_class_name,p_start_at,p_end_at,'scheduled',nullif(btrim(p_memo),''),null
    ) returning id into v_id;
    return v_id;
  end if;

  select * into v_old from public.spokedu_master_sessions
   where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if v_old.status <> p_status and not (v_old.status='scheduled' and p_status in ('completed','cancelled')) then
    raise exception using errcode='22023', message='illegal session transition';
  end if;
  if v_old.status <> 'scheduled' and (
    v_old.class_id is distinct from p_class_id or v_old.start_at is distinct from p_start_at
    or v_old.end_at is distinct from p_end_at
  ) then raise exception using errcode='22023', message='historical session fields are locked'; end if;

  if v_old.status='scheduled' and v_old.class_id is distinct from p_class_id then
    delete from public.spokedu_master_session_attendance
     where owner_id=p_owner_id and session_id=p_session_id;
  end if;
  v_completed_at := case
    when v_old.status='completed' then v_old.completed_at
    when p_status='completed' then now()
    else null
  end;
  update public.spokedu_master_sessions set
    class_id=p_class_id,
    class_name_snapshot=case when v_old.status='scheduled' then v_class_name else v_old.class_name_snapshot end,
    start_at=p_start_at,end_at=p_end_at,status=p_status,memo=nullif(btrim(p_memo),''),completed_at=v_completed_at
  where id=p_session_id returning id into v_id;
  return v_id;
end $$;

create or replace function public.spokedu_master_replace_session_attendance(
  p_owner_id uuid, p_session_id uuid, p_attendance jsonb
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_session public.spokedu_master_sessions%rowtype;
begin
  if jsonb_typeof(p_attendance) <> 'array' then raise exception using errcode='22023', message='invalid attendance'; end if;
  select * into v_session from public.spokedu_master_sessions
   where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found or v_session.status='cancelled' then raise exception using errcode='22023', message='attendance is not editable'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_attendance) item
    where item->>'status' not in ('present','absent') or nullif(item->>'studentId','') is null
  ) or (select count(*) from jsonb_array_elements(p_attendance)) <>
       (select count(distinct item->>'studentId') from jsonb_array_elements(p_attendance) item) then
    raise exception using errcode='22023', message='invalid attendance';
  end if;
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

create or replace function public.spokedu_master_add_session_program(
  p_owner_id uuid, p_session_id uuid, p_program_id bigint, p_program_title text
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid; v_title text;
begin
  if not exists (
    select 1 from public.spokedu_master_sessions
    where id=p_session_id and owner_id=p_owner_id and status='scheduled' and deleted_at is null for update
  ) then raise exception using errcode='22023', message='activities can only be added to scheduled sessions'; end if;
  select program.title into v_title
  from public.spokedu_pro_programs program
  where program.source_center_curriculum_id=p_program_id and program.is_published=true
  order by program.updated_at desc nulls last limit 1;
  if nullif(btrim(v_title),'') is null then raise exception using errcode='22023', message='program unavailable'; end if;
  insert into public.spokedu_master_session_programs(
    owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed
  ) select p_owner_id,p_session_id,'program',p_program_id,null,v_title,coalesce(max(sort_order)+1,0),false
    from public.spokedu_master_session_programs where session_id=p_session_id
  returning id into v_id;
  return v_id;
end $$;

comment on table public.spokedu_master_session_programs is
  'Ordered Session activities. Foundation sources are exactly program and spomove. Before adding a third independent source, review a SessionActivity domain rename; do not append nullable source columns.';

create or replace function public.spokedu_master_update_session_program_completion(
  p_owner_id uuid, p_session_id uuid, p_session_program_id uuid, p_is_completed boolean
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.spokedu_master_sessions
    where id=p_session_id and owner_id=p_owner_id and status in ('scheduled','completed') and deleted_at is null
    for update
  ) then raise exception using errcode='22023', message='activity progress is not editable'; end if;
  update public.spokedu_master_session_programs set is_completed=p_is_completed
   where id=p_session_program_id and session_id=p_session_id and owner_id=p_owner_id;
  if not found then raise exception using errcode='P0002', message='activity not found'; end if;
end $$;

create or replace function public.spokedu_master_refresh_scheduled_class_snapshot()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.name is distinct from old.name then
    update public.spokedu_master_sessions set class_name_snapshot=new.name
    where class_id=new.id and owner_id=new.owner_id and status='scheduled' and deleted_at is null;
  end if;
  return new;
end $$;
drop trigger if exists spokedu_master_refresh_scheduled_class_snapshot on public.spokedu_master_classes;
create trigger spokedu_master_refresh_scheduled_class_snapshot
after update of name on public.spokedu_master_classes
for each row execute function public.spokedu_master_refresh_scheduled_class_snapshot();

revoke all on function public.spokedu_master_save_student(uuid,uuid,text,text,jsonb,text,uuid[]) from public,anon,authenticated;
revoke all on function public.spokedu_master_soft_delete_student(uuid,uuid) from public,anon,authenticated;
grant execute on function public.spokedu_master_save_student(uuid,uuid,text,text,jsonb,text,uuid[]) to service_role;
grant execute on function public.spokedu_master_soft_delete_student(uuid,uuid) to service_role;
revoke all on function public.spokedu_master_update_session_program_completion(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.spokedu_master_update_session_program_completion(uuid,uuid,uuid,boolean) to service_role;
