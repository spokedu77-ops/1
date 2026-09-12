-- Keep completed-session history editable and materialize recurring activities atomically.

create or replace function public.spokedu_master_assert_complete_attendance(p_owner_id uuid, p_session_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_session public.spokedu_master_sessions%rowtype;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;

  perform public.spokedu_master_class_integrity_lock(p_owner_id, v_session.class_id);
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

create or replace function public.spokedu_master_materialize_schedule_rule_with_activities(
  p_owner_id uuid, p_class_id uuid, p_rule_id uuid, p_occurrences jsonb,
  p_memo text, p_activities jsonb
) returns table(session_id uuid, start_at timestamptz, created boolean)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_rule public.spokedu_master_class_schedule_rules%rowtype;
  v_class_name text; v_item jsonb; v_activity jsonb; v_start timestamptz; v_end timestamptz;
  v_id uuid; v_index integer; v_program_id bigint; v_program_title text;
begin
  select * into v_rule from public.spokedu_master_class_schedule_rules
    where id=p_rule_id and owner_id=p_owner_id and class_id=p_class_id and active for update;
  if not found then raise exception using errcode='22023', message='schedule rule not found'; end if;
  select name into v_class_name from public.spokedu_master_classes
    where id=p_class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class not found'; end if;
  if jsonb_typeof(p_occurrences) <> 'array' or jsonb_array_length(p_occurrences) not between 1 and 12
    or jsonb_typeof(coalesce(p_activities,'[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_activities,'[]'::jsonb)) > 50 then
    raise exception using errcode='22023', message='invalid recurring session payload';
  end if;

  perform public.spokedu_master_class_integrity_lock(p_owner_id, p_class_id);
  for v_item in select value from jsonb_array_elements(p_occurrences) loop
    v_start := (v_item->>'startAt')::timestamptz;
    v_end := (v_item->>'endAt')::timestamptz;
    if v_end <= v_start then raise exception using errcode='22023', message='invalid occurrence time'; end if;
    select id into v_id from public.spokedu_master_sessions
      where owner_id=p_owner_id and class_id=p_class_id and deleted_at is null
        and status <> 'cancelled' and start_at < v_end and end_at > v_start
      order by start_at limit 1;
    if v_id is not null then
      session_id := v_id; start_at := v_start; created := false; return next;
    else
      insert into public.spokedu_master_sessions(owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at,schedule_rule_id)
      values(p_owner_id,p_class_id,v_class_name,v_start,v_end,'scheduled',nullif(btrim(p_memo),''),null,p_rule_id)
      returning id into v_id;
      v_index := 0;
      for v_activity in select value from jsonb_array_elements(coalesce(p_activities,'[]'::jsonb)) loop
        if v_activity->>'sourceType' = 'program' then
          begin v_program_id := (v_activity->>'programId')::bigint;
          exception when others then raise exception using errcode='22023', message='invalid program'; end;
          select program.title into v_program_title from public.spokedu_pro_programs program
          where program.source_center_curriculum_id=v_program_id and program.is_published=true
          order by program.updated_at desc nulls last limit 1;
          if nullif(btrim(v_program_title),'') is null then raise exception using errcode='22023', message='program unavailable'; end if;
          insert into public.spokedu_master_session_programs(owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed)
          values(p_owner_id,v_id,'program',v_program_id,null,v_program_title,v_index,false);
        elsif v_activity->>'sourceType' = 'spomove' then
          if nullif(btrim(v_activity->>'spomovePresetId'),'') is null or nullif(btrim(v_activity->>'programTitle'),'') is null then
            raise exception using errcode='22023', message='invalid spomove preset';
          end if;
          insert into public.spokedu_master_session_programs(owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed)
          values(p_owner_id,v_id,'spomove',null,btrim(v_activity->>'spomovePresetId'),btrim(v_activity->>'programTitle'),v_index,false);
        else
          raise exception using errcode='22023', message='invalid activity source';
        end if;
        v_index := v_index + 1;
      end loop;
      session_id := v_id; start_at := v_start; created := true; return next;
    end if;
    v_id := null;
  end loop;
end;
$$;

revoke all on function public.spokedu_master_materialize_schedule_rule_with_activities(uuid,uuid,uuid,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_materialize_schedule_rule_with_activities(uuid,uuid,uuid,jsonb,text,jsonb) to service_role;
