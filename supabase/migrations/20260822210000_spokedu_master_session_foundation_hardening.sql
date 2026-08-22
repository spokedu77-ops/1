-- Final Session foundation hardening. Legacy tables/columns remain untouched.

create or replace function public.spokedu_master_guard_session_edit_policy()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if old.status='completed' and new.status='completed'
     and (new.class_id,new.start_at,new.end_at) is distinct from (old.class_id,old.start_at,old.end_at) then
    raise exception using errcode='22023', message='completed session basic information is locked';
  end if;
  if old.status='cancelled' and new.status='cancelled'
     and (new.class_id,new.start_at,new.end_at,new.memo) is distinct from (old.class_id,old.start_at,old.end_at,old.memo) then
    raise exception using errcode='22023', message='cancelled session is locked';
  end if;
  return new;
end $$;

drop trigger if exists spokedu_master_sessions_edit_policy on public.spokedu_master_sessions;
create trigger spokedu_master_sessions_edit_policy before update on public.spokedu_master_sessions
for each row execute function public.spokedu_master_guard_session_edit_policy();

create or replace function public.spokedu_master_replace_session_attendance(
  p_owner_id uuid, p_session_id uuid, p_attendance jsonb
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_class_id uuid;
begin
  if jsonb_typeof(p_attendance) <> 'array' then raise exception using errcode='22023', message='invalid attendance'; end if;
  select class_id into v_class_id from public.spokedu_master_sessions
   where id=p_session_id and owner_id=p_owner_id and status in ('scheduled','completed') and deleted_at is null;
  if v_class_id is null then raise exception using errcode='22023', message='session is not editable'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_attendance) item
    where item->>'status' not in ('present','absent')
       or not exists (
         select 1 from public.spokedu_master_class_students membership
          where membership.owner_id=p_owner_id and membership.class_id=v_class_id
            and membership.student_id=(item->>'studentId')::uuid
       )
  ) then raise exception using errcode='22023', message='attendance student is not a current class member'; end if;
  if (select count(*) from jsonb_array_elements(p_attendance)) <>
     (select count(distinct item->>'studentId') from jsonb_array_elements(p_attendance) item) then
    raise exception using errcode='22023', message='duplicate attendance student';
  end if;
  delete from public.spokedu_master_session_attendance attendance
   where attendance.owner_id=p_owner_id and attendance.session_id=p_session_id
     and exists (select 1 from public.spokedu_master_class_students membership
       where membership.owner_id=p_owner_id and membership.class_id=v_class_id and membership.student_id=attendance.student_id);
  insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,status)
  select p_owner_id,p_session_id,(item->>'studentId')::uuid,item->>'status'
  from jsonb_array_elements(p_attendance) item
  on conflict (session_id,student_id) do update set status=excluded.status;
end $$;

create or replace function public.spokedu_master_reorder_session_programs(
  p_owner_id uuid, p_session_id uuid, p_program_ids uuid[]
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from public.spokedu_master_sessions where id=p_session_id and owner_id=p_owner_id and status='scheduled' and deleted_at is null) then
    raise exception using errcode='22023', message='session is not editable';
  end if;
  if cardinality(p_program_ids) <> (select count(*) from public.spokedu_master_session_programs where session_id=p_session_id and owner_id=p_owner_id)
     or cardinality(p_program_ids) <> (select count(distinct id) from unnest(p_program_ids) id)
     or exists (select 1 from unnest(p_program_ids) id where not exists (select 1 from public.spokedu_master_session_programs item where item.id=id and item.session_id=p_session_id and item.owner_id=p_owner_id)) then
    raise exception using errcode='22023', message='invalid program order';
  end if;
  update public.spokedu_master_session_programs item set sort_order=ordered.position + 100000
  from unnest(p_program_ids) with ordinality ordered(id, position)
  where item.id=ordered.id and item.session_id=p_session_id and item.owner_id=p_owner_id;
  update public.spokedu_master_session_programs set sort_order=sort_order-100001
  where session_id=p_session_id and owner_id=p_owner_id;
end $$;

create or replace function public.spokedu_master_remove_session_program(
  p_owner_id uuid, p_session_id uuid, p_program_id uuid
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_removed_order integer;
begin
  if not exists (select 1 from public.spokedu_master_sessions where id=p_session_id and owner_id=p_owner_id and status='scheduled' and deleted_at is null for update) then
    raise exception using errcode='22023', message='session is not editable';
  end if;
  delete from public.spokedu_master_session_programs
   where id=p_program_id and session_id=p_session_id and owner_id=p_owner_id
   returning sort_order into v_removed_order;
  if v_removed_order is null then raise exception using errcode='P0002', message='program not found'; end if;
  update public.spokedu_master_session_programs set sort_order=sort_order-1
   where session_id=p_session_id and owner_id=p_owner_id and sort_order>v_removed_order;
end $$;

revoke all on function public.spokedu_master_remove_session_program(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.spokedu_master_remove_session_program(uuid,uuid,uuid) to service_role;
