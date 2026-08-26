-- Additive selective carryover. Existing create-next RPC remains available for compatibility.
create or replace function public.spokedu_master_create_next_session_v2(
  p_owner_id uuid, p_source_session_id uuid, p_start_at timestamptz,
  p_end_at timestamptz, p_source_session_program_ids uuid[]
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_source public.spokedu_master_sessions%rowtype; v_class_name text; v_next_id uuid; v_ids uuid[];
begin
  if p_end_at <= p_start_at then raise exception using errcode='22023', message='invalid next session time'; end if;
  v_ids := array(select distinct id from unnest(coalesce(p_source_session_program_ids, '{}'::uuid[])) id);
  select * into v_source from public.spokedu_master_sessions where id=p_source_session_id and owner_id=p_owner_id and status='completed' and deleted_at is null for share;
  if not found then raise exception using errcode='22023', message='source session must be completed'; end if;
  if cardinality(v_ids) <> cardinality(coalesce(p_source_session_program_ids, '{}'::uuid[])) then raise exception using errcode='22023', message='duplicate source program ids'; end if;
  if exists (select 1 from unnest(v_ids) id where not exists (select 1 from public.spokedu_master_session_programs p where p.id=id and p.session_id=v_source.id and p.owner_id=p_owner_id)) then raise exception using errcode='22023', message='invalid source program id'; end if;
  if exists (select 1 from public.spokedu_master_sessions s where s.owner_id=p_owner_id and s.class_id=v_source.class_id and s.start_at=p_start_at and s.end_at=p_end_at and s.status <> 'cancelled' and s.deleted_at is null) then raise exception using errcode='23505', message='exact session time already exists'; end if;
  select name into v_class_name from public.spokedu_master_classes where id=v_source.class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;
  insert into public.spokedu_master_sessions(owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at)
  values(p_owner_id,v_source.class_id,v_class_name,p_start_at,p_end_at,'scheduled',null,null) returning id into v_next_id;
  insert into public.spokedu_master_session_programs(owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed)
  select p_owner_id,v_next_id,p.source_type,p.program_id,p.spomove_preset_id,p.program_title_snapshot,(row_number() over(order by p.sort_order,p.id)-1)::integer,false
  from public.spokedu_master_session_programs p where p.owner_id=p_owner_id and p.session_id=v_source.id and p.id=any(v_ids) order by p.sort_order,p.id;
  return v_next_id;
end $$;

create or replace function public.spokedu_master_carryover_session_programs(
  p_owner_id uuid, p_source_session_id uuid, p_target_session_id uuid,
  p_source_session_program_ids uuid[]
) returns uuid[] language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_source public.spokedu_master_sessions%rowtype; v_target public.spokedu_master_sessions%rowtype; v_ids uuid[]; v_inserted uuid[];
begin
  v_ids := array(select distinct id from unnest(coalesce(p_source_session_program_ids, '{}'::uuid[])) id);
  if cardinality(v_ids) <> cardinality(coalesce(p_source_session_program_ids, '{}'::uuid[])) then raise exception using errcode='22023', message='duplicate source program ids'; end if;
  select * into v_source from public.spokedu_master_sessions where id=p_source_session_id and owner_id=p_owner_id and status='completed' and deleted_at is null for share;
  select * into v_target from public.spokedu_master_sessions where id=p_target_session_id and owner_id=p_owner_id and status='scheduled' and deleted_at is null for update;
  if v_source.id is null or v_target.id is null or v_source.class_id <> v_target.class_id then raise exception using errcode='22023', message='invalid continuity sessions'; end if;
  if exists (select 1 from unnest(v_ids) id where not exists (select 1 from public.spokedu_master_session_programs p where p.id=id and p.session_id=v_source.id and p.owner_id=p_owner_id)) then raise exception using errcode='22023', message='invalid source program id'; end if;
  with inserted as (
    insert into public.spokedu_master_session_programs(owner_id,session_id,source_type,program_id,spomove_preset_id,program_title_snapshot,sort_order,is_completed)
    select p_owner_id,v_target.id,p.source_type,p.program_id,p.spomove_preset_id,p.program_title_snapshot,
      (coalesce((select max(sort_order)+1 from public.spokedu_master_session_programs where session_id=v_target.id),0)+row_number() over(order by p.sort_order,p.id)-1)::integer,false
    from public.spokedu_master_session_programs p
    where p.owner_id=p_owner_id and p.session_id=v_source.id and p.id=any(v_ids)
      and not exists (select 1 from public.spokedu_master_session_programs t where t.session_id=v_target.id and ((p.source_type='program' and t.source_type='program' and t.program_id=p.program_id) or (p.source_type='spomove' and t.source_type='spomove' and t.spomove_preset_id=p.spomove_preset_id)))
    order by p.sort_order,p.id returning id
  ) select coalesce(array_agg(id), '{}'::uuid[]) into v_inserted from inserted;
  return v_inserted;
end $$;

revoke all on function public.spokedu_master_create_next_session_v2(uuid,uuid,timestamptz,timestamptz,uuid[]) from public,anon,authenticated;
revoke all on function public.spokedu_master_carryover_session_programs(uuid,uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.spokedu_master_create_next_session_v2(uuid,uuid,timestamptz,timestamptz,uuid[]) to service_role;
grant execute on function public.spokedu_master_carryover_session_programs(uuid,uuid,uuid,uuid[]) to service_role;
