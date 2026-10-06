-- PD-012: return RUN to PREP only before any durable run evidence exists.
create or replace function public.spokedu_master_undo_session_start(
  p_owner_id uuid,
  p_session_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.spokedu_master_sessions%rowtype;
begin
  select * into v_session
  from public.spokedu_master_sessions
  where id = p_session_id
    and owner_id = p_owner_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'session not found';
  end if;
  if v_session.status <> 'scheduled' or v_session.started_at is null then
    raise exception using errcode = '55000', message = 'session is not running';
  end if;
  if exists (
    select 1
    from public.spokedu_master_session_programs program
    where program.owner_id = p_owner_id
      and program.session_id = p_session_id
      and program.is_completed = true
  ) or exists (
    select 1
    from public.spokedu_master_class_records record
    where record.owner_id = p_owner_id
      and record.session_id = p_session_id
      and record.deleted_at is null
  ) then
    raise exception using errcode = '55000', message = 'session has run evidence';
  end if;

  update public.spokedu_master_sessions
  set started_at = null,
      roster_locked_at = null
  where id = p_session_id
    and owner_id = p_owner_id;

  return p_session_id;
end;
$$;

revoke all on function public.spokedu_master_undo_session_start(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.spokedu_master_undo_session_start(uuid, uuid)
  to service_role;
