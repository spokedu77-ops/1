create or replace function public.spokedu_master_create_session_with_activities(
  p_owner_id uuid,
  p_class_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_memo text,
  p_activities jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session_id uuid;
  v_class_name text;
  v_item jsonb;
  v_index integer := 0;
  v_program_id bigint;
  v_program_title text;
begin
  if p_end_at <= p_start_at or jsonb_typeof(p_activities) <> 'array' then
    raise exception using errcode='22023', message='invalid session';
  end if;
  select name into v_class_name from public.spokedu_master_classes
   where id=p_class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;
  if jsonb_array_length(p_activities) > 50 then raise exception using errcode='22023', message='too many activities'; end if;

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

revoke all on function public.spokedu_master_create_session_with_activities(uuid,uuid,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_create_session_with_activities(uuid,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
