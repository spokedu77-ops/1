create or replace function public.spokedu_master_create_next_session(
  p_owner_id uuid,
  p_source_session_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_copy_programs boolean
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_source public.spokedu_master_sessions%rowtype;
  v_class_name text;
  v_next_id uuid;
begin
  if p_end_at <= p_start_at then
    raise exception using errcode = '22023', message = 'invalid next session time';
  end if;

  select * into v_source
  from public.spokedu_master_sessions
  where id = p_source_session_id
    and owner_id = p_owner_id
    and status = 'completed'
    and deleted_at is null
  for share;
  if not found then
    raise exception using errcode = '22023', message = 'source session must be completed';
  end if;

  select name into v_class_name
  from public.spokedu_master_classes
  where id = v_source.class_id and owner_id = p_owner_id and deleted_at is null;
  if v_class_name is null then
    raise exception using errcode = '22023', message = 'class unavailable';
  end if;

  insert into public.spokedu_master_sessions(
    owner_id, class_id, class_name_snapshot, start_at, end_at,
    status, memo, completed_at
  ) values (
    p_owner_id, v_source.class_id, v_class_name, p_start_at, p_end_at,
    'scheduled', null, null
  ) returning id into v_next_id;

  if coalesce(p_copy_programs, false) then
    insert into public.spokedu_master_session_programs(
      owner_id, session_id, source_type, program_id, spomove_preset_id,
      program_title_snapshot, sort_order, is_completed
    )
    select
      p_owner_id, v_next_id, source_type, program_id, spomove_preset_id,
      program_title_snapshot, sort_order, false
    from public.spokedu_master_session_programs
    where owner_id = p_owner_id and session_id = p_source_session_id
    order by sort_order;
  end if;

  return v_next_id;
end $$;

revoke all on function public.spokedu_master_create_next_session(uuid,uuid,timestamptz,timestamptz,boolean)
from public, anon, authenticated;
grant execute on function public.spokedu_master_create_next_session(uuid,uuid,timestamptz,timestamptz,boolean)
to service_role;
