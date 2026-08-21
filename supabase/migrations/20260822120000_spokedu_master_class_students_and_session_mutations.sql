-- Session runtime hardening: ID-based class rosters and narrow program/attendance mutations.
-- Legacy group_name and class-record tables remain unchanged as migration/history sources.

create table if not exists public.spokedu_master_class_students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.spokedu_master_classes(id) on delete cascade,
  student_id uuid not null references public.spokedu_master_students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(class_id, student_id)
);

create index if not exists spokedu_master_class_students_owner_idx
  on public.spokedu_master_class_students(owner_id);
create index if not exists spokedu_master_class_students_student_idx
  on public.spokedu_master_class_students(student_id);

create or replace function public.spokedu_master_guard_class_student_owner()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.spokedu_master_classes class_row
     where class_row.id = new.class_id and class_row.owner_id = new.owner_id and class_row.deleted_at is null
  ) or not exists (
    select 1 from public.spokedu_master_students student
     where student.id = new.student_id and student.owner_id = new.owner_id and student.deleted_at is null
  ) then
    raise exception using errcode = '23514', message = 'class student owner mismatch';
  end if;
  return new;
end $$;

drop trigger if exists spokedu_master_class_students_owner_guard on public.spokedu_master_class_students;
create trigger spokedu_master_class_students_owner_guard
  before insert or update on public.spokedu_master_class_students
  for each row execute function public.spokedu_master_guard_class_student_owner();

alter table public.spokedu_master_class_students enable row level security;
drop policy if exists spokedu_master_class_students_own_all on public.spokedu_master_class_students;
create policy spokedu_master_class_students_own_all on public.spokedu_master_class_students
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

insert into public.spokedu_master_class_students(owner_id, class_id, student_id)
select student.owner_id, class_row.id, student.id
from public.spokedu_master_students student
join public.spokedu_master_classes class_row
  on class_row.owner_id = student.owner_id
 and lower(btrim(class_row.name)) = lower(btrim(student.group_name))
 and class_row.deleted_at is null
where student.deleted_at is null
  and nullif(btrim(student.group_name), '') is not null
on conflict (class_id, student_id) do nothing;

-- Whole-session save now changes only the Session row. Children have narrow mutations below.
create or replace function public.spokedu_master_save_session(
  p_owner_id uuid, p_session_id uuid, p_class_id uuid, p_start_at timestamptz,
  p_end_at timestamptz, p_status text, p_memo text, p_programs jsonb, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid; v_completed_at timestamptz;
begin
  if p_status not in ('scheduled', 'completed', 'cancelled') or p_end_at <= p_start_at then
    raise exception using errcode = '22023', message = 'invalid session';
  end if;
  if not exists (select 1 from public.spokedu_master_classes where id=p_class_id and owner_id=p_owner_id and deleted_at is null) then
    raise exception using errcode = '22023', message = 'class unavailable';
  end if;
  v_completed_at := case when p_status='completed' then coalesce((select completed_at from public.spokedu_master_sessions where id=p_session_id), now()) else null end;
  if p_session_id is null then
    insert into public.spokedu_master_sessions(owner_id,class_id,start_at,end_at,status,memo,completed_at)
    values(p_owner_id,p_class_id,p_start_at,p_end_at,p_status,nullif(btrim(p_memo),''),v_completed_at) returning id into v_id;
  else
    update public.spokedu_master_sessions set class_id=p_class_id,start_at=p_start_at,end_at=p_end_at,
      status=p_status,memo=nullif(btrim(p_memo),''),completed_at=v_completed_at
    where id=p_session_id and owner_id=p_owner_id and deleted_at is null returning id into v_id;
    if v_id is null then raise exception using errcode='P0002', message='session not found'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.spokedu_master_replace_session_attendance(
  p_owner_id uuid, p_session_id uuid, p_attendance jsonb
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if jsonb_typeof(p_attendance) <> 'array' then raise exception using errcode='22023', message='invalid attendance'; end if;
  if not exists (select 1 from public.spokedu_master_sessions where id=p_session_id and owner_id=p_owner_id and status in ('scheduled','completed') and deleted_at is null) then
    raise exception using errcode='22023', message='session is not editable';
  end if;
  if exists (select 1 from jsonb_array_elements(p_attendance) item where item->>'status' not in ('present','absent')) then
    raise exception using errcode='22023', message='invalid attendance';
  end if;
  delete from public.spokedu_master_session_attendance where owner_id=p_owner_id and session_id=p_session_id;
  insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,status)
  select p_owner_id,p_session_id,(item->>'studentId')::uuid,item->>'status'
  from jsonb_array_elements(p_attendance) item
  join public.spokedu_master_class_students membership
    on membership.class_id=(select class_id from public.spokedu_master_sessions where id=p_session_id)
   and membership.student_id=(item->>'studentId')::uuid and membership.owner_id=p_owner_id;
end $$;

create or replace function public.spokedu_master_reorder_session_programs(
  p_owner_id uuid, p_session_id uuid, p_program_ids uuid[]
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from public.spokedu_master_sessions where id=p_session_id and owner_id=p_owner_id and status='scheduled' and deleted_at is null) then
    raise exception using errcode='22023', message='session is not editable';
  end if;
  if cardinality(p_program_ids) <> (select count(*) from public.spokedu_master_session_programs where session_id=p_session_id and owner_id=p_owner_id)
     or exists (select 1 from unnest(p_program_ids) id where not exists (select 1 from public.spokedu_master_session_programs item where item.id=id and item.session_id=p_session_id and item.owner_id=p_owner_id)) then
    raise exception using errcode='22023', message='invalid program order';
  end if;
  update public.spokedu_master_session_programs item set sort_order=ordered.position + 100000
  from unnest(p_program_ids) with ordinality ordered(id, position)
  where item.id=ordered.id and item.session_id=p_session_id and item.owner_id=p_owner_id;
  update public.spokedu_master_session_programs set sort_order=sort_order-100001
  where session_id=p_session_id and owner_id=p_owner_id;
end $$;

revoke all on function public.spokedu_master_guard_class_student_owner() from public,anon,authenticated;
create or replace function public.spokedu_master_add_session_program(
  p_owner_id uuid, p_session_id uuid, p_program_id bigint, p_program_title text
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.spokedu_master_sessions where id=p_session_id and owner_id=p_owner_id and status='scheduled' and deleted_at is null for update) then
    raise exception using errcode='22023', message='programs can only be added to scheduled sessions';
  end if;
  insert into public.spokedu_master_session_programs(owner_id,session_id,program_id,program_title_snapshot,sort_order,is_completed)
  select p_owner_id,p_session_id,p_program_id,nullif(btrim(p_program_title),''),coalesce(max(sort_order)+1,0),false
  from public.spokedu_master_session_programs where session_id=p_session_id
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.spokedu_master_add_session_program(uuid,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.spokedu_master_reorder_session_programs(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) to service_role;
grant execute on function public.spokedu_master_reorder_session_programs(uuid,uuid,uuid[]) to service_role;
grant execute on function public.spokedu_master_add_session_program(uuid,uuid,bigint,text) to service_role;
