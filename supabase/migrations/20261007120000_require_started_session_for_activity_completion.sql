-- Activity completion is durable RUN evidence and cannot be changed during PREP.
create or replace function public.spokedu_master_update_session_program_completion(
  p_owner_id uuid, p_session_id uuid, p_session_program_id uuid, p_is_completed boolean
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (
    select 1 from public.spokedu_master_sessions
    where id = p_session_id
      and owner_id = p_owner_id
      and (
        status = 'completed'
        or (status = 'scheduled' and started_at is not null)
      )
      and deleted_at is null
    for update
  ) then
    raise exception using errcode = '22023', message = 'activity progress is not editable before session start';
  end if;

  update public.spokedu_master_session_programs
  set is_completed = p_is_completed
  where id = p_session_program_id
    and session_id = p_session_id
    and owner_id = p_owner_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'activity not found';
  end if;
end $$;

revoke all on function public.spokedu_master_update_session_program_completion(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.spokedu_master_update_session_program_completion(uuid,uuid,uuid,boolean) to service_role;
