-- Restore the owner-scoped session activity removal RPC when migration history
-- exists but the function has drifted out of the live schema.

create or replace function public.spokedu_master_remove_session_program(
  p_owner_id uuid,
  p_session_id uuid,
  p_program_id uuid
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_removed_order integer;
begin
  if not exists (
    select 1
    from public.spokedu_master_sessions
    where id = p_session_id
      and owner_id = p_owner_id
      and status = 'scheduled'
      and deleted_at is null
    for update
  ) then
    raise exception using errcode = '22023', message = 'session is not editable';
  end if;

  delete from public.spokedu_master_session_programs
  where id = p_program_id
    and session_id = p_session_id
    and owner_id = p_owner_id
  returning sort_order into v_removed_order;

  if v_removed_order is null then
    raise exception using errcode = 'P0002', message = 'program not found';
  end if;

  update public.spokedu_master_session_programs
  set sort_order = sort_order - 1
  where session_id = p_session_id
    and owner_id = p_owner_id
    and sort_order > v_removed_order;
end;
$$;

revoke all on function public.spokedu_master_remove_session_program(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.spokedu_master_remove_session_program(uuid, uuid, uuid)
  to service_role;
