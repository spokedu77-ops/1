-- A PREP Session cannot be completed before its durable start marker exists.
-- Deploy this database guard before the matching application API guard.
create or replace function public.spokedu_master_complete_session(
  p_owner_id uuid,
  p_session_id uuid,
  p_class_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_memo text,
  p_attendance jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_session public.spokedu_master_sessions%rowtype;
begin
  select * into v_session
  from public.spokedu_master_sessions
  where id = p_session_id and owner_id = p_owner_id and deleted_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'session not found';
  end if;

  if v_session.status = 'completed' then
    if v_session.class_id is distinct from p_class_id
      or v_session.start_at is distinct from p_start_at
      or v_session.end_at is distinct from p_end_at then
      raise exception using errcode = '22023', message = 'historical session fields are locked';
    end if;
    perform public.spokedu_master_replace_session_attendance(p_owner_id, p_session_id, coalesce(p_attendance, '[]'::jsonb));
    perform public.spokedu_master_assert_complete_attendance(p_owner_id, p_session_id);
    update public.spokedu_master_sessions
    set memo = nullif(btrim(p_memo), ''), updated_at = now()
    where id = p_session_id and owner_id = p_owner_id;
    return p_session_id;
  end if;

  if v_session.status <> 'scheduled' then
    raise exception using errcode = '22023', message = 'session cannot be completed';
  end if;
  if v_session.started_at is null then
    raise exception using errcode = '22023', message = 'session must be started before completion';
  end if;

  perform public.spokedu_master_save_session(p_owner_id, p_session_id, p_class_id, p_start_at, p_end_at, 'scheduled', p_memo, '[]'::jsonb, '[]'::jsonb);
  perform public.spokedu_master_replace_session_attendance(p_owner_id, p_session_id, coalesce(p_attendance, '[]'::jsonb));
  perform public.spokedu_master_assert_complete_attendance(p_owner_id, p_session_id);
  perform public.spokedu_master_save_session(p_owner_id, p_session_id, p_class_id, p_start_at, p_end_at, 'completed', p_memo, '[]'::jsonb, '[]'::jsonb);
  return p_session_id;
end $$;

revoke all on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb)
  to service_role;
