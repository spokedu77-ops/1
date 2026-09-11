-- P0 session integrity. Existing rows are not deleted, cancelled, or backfilled.

create or replace function public.spokedu_master_class_integrity_lock(p_owner_id uuid, p_class_id uuid)
returns void language sql security definer set search_path = pg_catalog, public as $$
  select pg_advisory_xact_lock(hashtextextended(p_owner_id::text || ':' || p_class_id::text, 0));
$$;

create or replace function public.spokedu_master_lock_class_membership()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  perform public.spokedu_master_class_integrity_lock(coalesce(new.owner_id, old.owner_id), coalesce(new.class_id, old.class_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists spokedu_master_class_students_integrity_lock on public.spokedu_master_class_students;
create trigger spokedu_master_class_students_integrity_lock
before insert or update or delete on public.spokedu_master_class_students
for each row execute function public.spokedu_master_lock_class_membership();

create or replace function public.spokedu_master_assert_complete_attendance(p_owner_id uuid, p_session_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_session public.spokedu_master_sessions%rowtype;
  v_roster_count integer;
  v_attendance_count integer;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;

  perform public.spokedu_master_class_integrity_lock(p_owner_id, v_session.class_id);
  select count(*) into v_roster_count from public.spokedu_master_class_students
  where owner_id=p_owner_id and class_id=v_session.class_id;
  select count(*) into v_attendance_count from public.spokedu_master_session_attendance
  where owner_id=p_owner_id and session_id=p_session_id and status in ('present','absent');

  if v_attendance_count <> v_roster_count or exists (
    select 1 from public.spokedu_master_class_students membership
    where membership.owner_id=p_owner_id and membership.class_id=v_session.class_id
      and not exists (
        select 1 from public.spokedu_master_session_attendance attendance
        where attendance.owner_id=p_owner_id and attendance.session_id=p_session_id
          and attendance.student_id=membership.student_id and attendance.status in ('present','absent')
      )
  ) or exists (
    select 1 from public.spokedu_master_session_attendance attendance
    where attendance.owner_id=p_owner_id and attendance.session_id=p_session_id
      and not exists (
        select 1 from public.spokedu_master_class_students membership
        where membership.owner_id=p_owner_id and membership.class_id=v_session.class_id
          and membership.student_id=attendance.student_id
      )
  ) then
    raise exception using errcode='22023', message='complete attendance must exactly match current class roster';
  end if;
end;
$$;

create or replace function public.spokedu_master_guard_session_completion_attendance()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from new.status) then
    perform public.spokedu_master_assert_complete_attendance(new.owner_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists spokedu_master_sessions_completion_attendance_guard on public.spokedu_master_sessions;
create trigger spokedu_master_sessions_completion_attendance_guard
before insert or update of status on public.spokedu_master_sessions
for each row execute function public.spokedu_master_guard_session_completion_attendance();

create or replace function public.spokedu_master_assert_no_class_time_collision(
  p_owner_id uuid, p_class_id uuid, p_session_id uuid, p_start_at timestamptz, p_end_at timestamptz
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform public.spokedu_master_class_integrity_lock(p_owner_id, p_class_id);
  if exists (
    select 1 from public.spokedu_master_sessions existing
    where existing.owner_id=p_owner_id and existing.class_id=p_class_id
      and existing.id is distinct from p_session_id
      and existing.deleted_at is null and existing.status <> 'cancelled'
      and existing.start_at < p_end_at and existing.end_at > p_start_at
  ) then
    raise exception using errcode='23505', message='active session time overlaps for this class';
  end if;
end;
$$;

create or replace function public.spokedu_master_guard_session_time_collision()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.deleted_at is not null or new.status='cancelled' then return new; end if;
  if tg_op='UPDATE' and old.owner_id=new.owner_id and old.class_id=new.class_id
    and old.start_at=new.start_at and old.end_at=new.end_at
    and old.deleted_at is null and old.status <> 'cancelled' then return new; end if;
  perform public.spokedu_master_assert_no_class_time_collision(
    new.owner_id, new.class_id, new.id, new.start_at, new.end_at
  );
  return new;
end;
$$;

drop trigger if exists spokedu_master_sessions_time_collision_guard on public.spokedu_master_sessions;
create trigger spokedu_master_sessions_time_collision_guard
before insert or update of owner_id,class_id,start_at,end_at,status,deleted_at on public.spokedu_master_sessions
for each row execute function public.spokedu_master_guard_session_time_collision();

create or replace function public.spokedu_master_complete_session(
  p_owner_id uuid, p_session_id uuid, p_class_id uuid, p_start_at timestamptz,
  p_end_at timestamptz, p_memo text, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_session public.spokedu_master_sessions%rowtype;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if v_session.status='completed' then return v_session.id; end if;
  if v_session.status <> 'scheduled' then raise exception using errcode='22023', message='session cannot be completed'; end if;

  perform public.spokedu_master_save_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,'scheduled',p_memo,'[]'::jsonb,'[]'::jsonb);
  perform public.spokedu_master_replace_session_attendance(p_owner_id,p_session_id,coalesce(p_attendance,'[]'::jsonb));
  perform public.spokedu_master_assert_complete_attendance(p_owner_id,p_session_id);
  perform public.spokedu_master_save_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,'completed',p_memo,'[]'::jsonb,'[]'::jsonb);
  return p_session_id;
end;
$$;

create or replace function public.spokedu_master_guard_completed_attendance_mutation()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare
  v_session_id uuid := coalesce(new.session_id, old.session_id);
  v_owner_id uuid := coalesce(new.owner_id, old.owner_id);
  v_status text;
begin
  select status into v_status from public.spokedu_master_sessions
  where id=v_session_id and owner_id=v_owner_id and deleted_at is null;
  if v_status='completed' then
    perform public.spokedu_master_assert_complete_attendance(v_owner_id, v_session_id);
  end if;
  return null;
end;
$$;

drop trigger if exists spokedu_master_session_attendance_completion_guard on public.spokedu_master_session_attendance;
create constraint trigger spokedu_master_session_attendance_completion_guard
after insert or update or delete on public.spokedu_master_session_attendance
deferrable initially deferred
for each row execute function public.spokedu_master_guard_completed_attendance_mutation();

create or replace function public.spokedu_master_create_session_with_activities(
  p_owner_id uuid, p_class_id uuid, p_start_at timestamptz, p_end_at timestamptz, p_memo text, p_activities jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_session_id uuid; v_class_name text; v_item jsonb; v_index integer := 0; v_program_id bigint; v_program_title text;
begin
  if p_end_at <= p_start_at or jsonb_typeof(p_activities) <> 'array' then
    raise exception using errcode='22023', message='invalid session';
  end if;
  select name into v_class_name from public.spokedu_master_classes
   where id=p_class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;
  if jsonb_array_length(p_activities) > 50 then raise exception using errcode='22023', message='too many activities'; end if;
  perform public.spokedu_master_assert_no_class_time_collision(p_owner_id, p_class_id, null, p_start_at, p_end_at);

  insert into public.spokedu_master_sessions(
    owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at
  ) values (
    p_owner_id,p_class_id,v_class_name,p_start_at,p_end_at,'scheduled',nullif(btrim(p_memo),''),null
  ) returning id into v_session_id;

  for v_item in select value from jsonb_array_elements(p_activities) loop
    if v_item->>'sourceType' = 'program' then
      begin v_program_id := (v_item->>'programId')::bigint;
      exception when others then raise exception using errcode='22023', message='invalid program'; end;
      select program.title into v_program_title
      from public.spokedu_pro_programs program
      where program.source_center_curriculum_id=v_program_id and program.is_published=true
      order by program.updated_at desc nulls last limit 1;
      if nullif(btrim(v_program_title),'') is null then raise exception using errcode='22023', message='program unavailable'; end if;
      insert into public.spokedu_master_session_programs(
        owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed
      ) values (p_owner_id,v_session_id,'program',v_program_id,null,v_program_title,v_index,false);
    elsif v_item->>'sourceType' = 'spomove' then
      if nullif(btrim(v_item->>'spomovePresetId'),'') is null or nullif(btrim(v_item->>'programTitle'),'') is null then
        raise exception using errcode='22023', message='invalid spomove preset';
      end if;
      insert into public.spokedu_master_session_programs(
        owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed
      ) values (p_owner_id,v_session_id,'spomove',null,btrim(v_item->>'spomovePresetId'),btrim(v_item->>'programTitle'),v_index,false);
    else
      raise exception using errcode='22023', message='invalid activity source';
    end if;
    v_index := v_index + 1;
  end loop;
  return v_session_id;
end $$;

create or replace function public.spokedu_master_create_next_session(
  p_owner_id uuid, p_source_session_id uuid, p_start_at timestamptz, p_end_at timestamptz, p_copy_programs boolean
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_source public.spokedu_master_sessions%rowtype; v_class_name text; v_next_id uuid;
begin
  if p_end_at <= p_start_at then raise exception using errcode='22023', message='invalid next session time'; end if;
  select * into v_source from public.spokedu_master_sessions
  where id=p_source_session_id and owner_id=p_owner_id and status='completed' and deleted_at is null for share;
  if not found then raise exception using errcode='22023', message='source session must be completed'; end if;
  select name into v_class_name from public.spokedu_master_classes
  where id=v_source.class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;
  perform public.spokedu_master_assert_no_class_time_collision(p_owner_id, v_source.class_id, null, p_start_at, p_end_at);
  insert into public.spokedu_master_sessions(owner_id, class_id, class_name_snapshot, start_at, end_at, status, memo, completed_at)
  values (p_owner_id, v_source.class_id, v_class_name, p_start_at, p_end_at, 'scheduled', null, null)
  returning id into v_next_id;
  if coalesce(p_copy_programs, false) then
    insert into public.spokedu_master_session_programs(
      owner_id, session_id, source_type, program_id, spomove_preset_id, program_title_snapshot, sort_order, is_completed
    )
    select p_owner_id, v_next_id, source_type, program_id, spomove_preset_id, program_title_snapshot, sort_order, false
    from public.spokedu_master_session_programs
    where owner_id=p_owner_id and session_id=p_source_session_id
    order by sort_order;
  end if;
  return v_next_id;
end $$;

create or replace function public.spokedu_master_create_next_session_v2(
  p_owner_id uuid, p_source_session_id uuid, p_start_at timestamptz, p_end_at timestamptz, p_source_session_program_ids uuid[]
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_source public.spokedu_master_sessions%rowtype; v_class_name text; v_next_id uuid; v_ids uuid[];
begin
  if p_end_at <= p_start_at then raise exception using errcode='22023', message='invalid next session time'; end if;
  v_ids := array(select distinct id from unnest(coalesce(p_source_session_program_ids, '{}'::uuid[])) id);
  select * into v_source from public.spokedu_master_sessions
  where id=p_source_session_id and owner_id=p_owner_id and status='completed' and deleted_at is null for share;
  if not found then raise exception using errcode='22023', message='source session must be completed'; end if;
  if cardinality(v_ids) <> cardinality(coalesce(p_source_session_program_ids, '{}'::uuid[])) then
    raise exception using errcode='22023', message='duplicate source program ids';
  end if;
  if exists (
    select 1 from unnest(v_ids) id
    where not exists (select 1 from public.spokedu_master_session_programs p where p.id=id and p.session_id=v_source.id and p.owner_id=p_owner_id)
  ) then raise exception using errcode='22023', message='invalid source program id'; end if;
  select name into v_class_name from public.spokedu_master_classes
  where id=v_source.class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;
  perform public.spokedu_master_assert_no_class_time_collision(p_owner_id, v_source.class_id, null, p_start_at, p_end_at);
  insert into public.spokedu_master_sessions(owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at)
  values(p_owner_id,v_source.class_id,v_class_name,p_start_at,p_end_at,'scheduled',null,null) returning id into v_next_id;
  insert into public.spokedu_master_session_programs(owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed)
  select p_owner_id,v_next_id,p.source_type,p.program_id,p.spomove_preset_id,p.program_title_snapshot,(row_number() over(order by p.sort_order,p.id)-1)::integer,false
  from public.spokedu_master_session_programs p where p.owner_id=p_owner_id and p.session_id=v_source.id and p.id=any(v_ids) order by p.sort_order,p.id;
  return v_next_id;
end $$;

create or replace function public.spokedu_master_materialize_schedule_rule(
  p_owner_id uuid, p_class_id uuid, p_rule_id uuid, p_occurrences jsonb
) returns table(session_id uuid, start_at timestamptz, created boolean)
language plpgsql security definer set search_path=public as $$
declare
  v_rule public.spokedu_master_class_schedule_rules%rowtype;
  v_class_name text; v_item jsonb; v_start timestamptz; v_end timestamptz; v_id uuid;
begin
  select * into v_rule from public.spokedu_master_class_schedule_rules
    where id=p_rule_id and owner_id=p_owner_id and class_id=p_class_id and active for update;
  if not found then raise exception 'schedule rule not found' using errcode='22023'; end if;
  select name into v_class_name from public.spokedu_master_classes
    where id=p_class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception 'class not found' using errcode='22023'; end if;
  if jsonb_typeof(p_occurrences) <> 'array' or jsonb_array_length(p_occurrences) not between 1 and 12 then
    raise exception 'invalid occurrences' using errcode='22023';
  end if;
  perform public.spokedu_master_class_integrity_lock(p_owner_id, p_class_id);

  for v_item in select value from jsonb_array_elements(p_occurrences) loop
    v_start := (v_item->>'startAt')::timestamptz;
    v_end := (v_item->>'endAt')::timestamptz;
    if v_end <= v_start then raise exception 'invalid occurrence time' using errcode='22023'; end if;
    select id into v_id from public.spokedu_master_sessions
      where owner_id=p_owner_id and class_id=p_class_id and deleted_at is null
        and status <> 'cancelled' and start_at < v_end and end_at > v_start
      order by start_at limit 1;
    if v_id is not null then
      session_id := v_id; start_at := v_start; created := false; return next;
    else
      insert into public.spokedu_master_sessions(owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at,schedule_rule_id)
      values(p_owner_id,p_class_id,v_class_name,v_start,v_end,'scheduled',null,null,p_rule_id)
      returning id into v_id;
      session_id := v_id; start_at := v_start; created := true; return next;
    end if;
    v_id := null;
  end loop;
end $$;

revoke all on function public.spokedu_master_class_integrity_lock(uuid,uuid) from public,anon,authenticated;
revoke all on function public.spokedu_master_assert_complete_attendance(uuid,uuid) from public,anon,authenticated;
revoke all on function public.spokedu_master_assert_no_class_time_collision(uuid,uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_class_integrity_lock(uuid,uuid) to service_role;
grant execute on function public.spokedu_master_assert_complete_attendance(uuid,uuid) to service_role;
grant execute on function public.spokedu_master_assert_no_class_time_collision(uuid,uuid,uuid,timestamptz,timestamptz) to service_role;
grant execute on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
