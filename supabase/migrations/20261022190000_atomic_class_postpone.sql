-- Atomically shifts/restores a class schedule and settles its linked mileage.
-- Existing tables and admin_apply_session_linked_mileage are reused; historical
-- inconsistencies fail closed and are never repaired by this function.

create or replace function public.admin_apply_class_postpone(
  p_session_id uuid,
  p_mode text,
  p_expected_start_at timestamptz,
  p_request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
  v_ghost public.sessions%rowtype;
  v_row public.sessions%rowtype;
  v_saved private.phase2_mileage_request_results%rowtype;
  v_payload_hash text;
  v_group_id public.sessions.group_id%type;
  v_action text;
  v_new_id uuid;
  v_active public.sessions%rowtype[];
  v_weekdays integer[];
  v_count integer;
  v_i integer;
  v_duration interval;
  v_new_start timestamptz;
  v_new_end timestamptz;
  v_gap interval;
  v_delta_days integer;
  v_total integer;
  v_result jsonb;
begin
  if p_session_id is null or p_request_key is null
    or p_mode not in ('postpone', 'postpone_request', 'undo') then
    raise exception using errcode = '22023', message = 'POSTPONE_REQUEST_INVALID';
  end if;

  v_payload_hash := pg_catalog.md5(concat_ws('|', p_session_id::text, p_mode, p_expected_start_at::text));
  select * into v_saved
  from private.phase2_mileage_request_results
  where request_key = p_request_key::text;
  if found then
    if v_saved.operation <> 'class-postpone' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'POSTPONE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'POSTPONE_SESSION_NOT_FOUND';
  end if;
  if v_session.group_id is null then
    raise exception using errcode = '22023', message = 'POSTPONE_GROUP_REQUIRED';
  end if;
  v_group_id := v_session.group_id;

  -- One deterministic lock order serializes every postpone/undo in this group.
  perform 1 from public.sessions where group_id = v_group_id order by id for update;
  select * into v_saved
  from private.phase2_mileage_request_results
  where request_key = p_request_key::text;
  if found then
    if v_saved.operation <> 'class-postpone' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'POSTPONE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'POSTPONE_SESSION_NOT_FOUND';
  end if;
  if v_session.start_at is distinct from p_expected_start_at then
    raise exception using errcode = '40001', message = 'POSTPONE_STALE_SESSION';
  end if;

  if position('MILEAGE_ACTIONS:' in coalesce(v_session.memo, '')) > 0 then
    raise exception using errcode = '23000', message = 'POSTPONE_LEGACY_MILEAGE_REVIEW_REQUIRED';
  end if;

  if p_mode in ('postpone', 'postpone_request') then
    if coalesce(v_session.status, '') in ('postponed', 'cancelled', 'deleted') then
      raise exception using errcode = '55000', message = 'POSTPONE_INVALID_STATUS';
    end if;
    if exists (
      select 1 from public.sessions
      where group_id = v_group_id and start_at = v_session.start_at and status = 'postponed'
    ) then
      raise exception using errcode = '23505', message = 'POSTPONE_DUPLICATE_SLOT';
    end if;
    if exists (
      select 1 from public.sessions s
      where s.created_by = v_session.created_by
        and s.start_at = v_session.start_at
        and s.group_id is distinct from v_group_id
        and coalesce(s.status, '') not in ('cancelled', 'deleted')
        and btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(s.title, ''), '\m[0-9]+\s*/\s*[0-9]+\M', ' ', 'g'), '\m[0-9]+\s*(회차|회|차)\M', ' ', 'g'), '[|_]|\s*-\s*|\([^)]*\)', ' ', 'g'), '\s+', ' ', 'g'))
          = btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(v_session.title, ''), '\m[0-9]+\s*/\s*[0-9]+\M', ' ', 'g'), '\m[0-9]+\s*(회차|회|차)\M', ' ', 'g'), '[|_]|\s*-\s*|\([^)]*\)', ' ', 'g'), '\s+', ' ', 'g'))
    ) then
      raise exception using errcode = '23505', message = 'POSTPONE_CROSS_GROUP_CONFLICT';
    end if;

    select array_agg(s order by s.start_at, s.id) into v_active
    from public.sessions s
    where s.group_id = v_group_id and s.start_at >= v_session.start_at
      and coalesce(s.status, '') not in ('postponed', 'cancelled', 'deleted');
    v_count := coalesce(cardinality(v_active), 0);
    if v_count = 0 then
      raise exception using errcode = 'P0002', message = 'POSTPONE_NO_ACTIVE_SESSION';
    end if;

    select array_agg(d order by d) into v_weekdays
    from (select distinct extract(dow from (x.start_at at time zone 'Asia/Seoul'))::integer d from unnest(v_active) x) q;
    if cardinality(v_weekdays) = 2 then
      v_delta_days := coalesce((select d - extract(dow from (v_active[v_count].start_at at time zone 'Asia/Seoul'))::integer from unnest(v_weekdays) d where d > extract(dow from (v_active[v_count].start_at at time zone 'Asia/Seoul'))::integer order by d limit 1), v_weekdays[1] + 7 - extract(dow from (v_active[v_count].start_at at time zone 'Asia/Seoul'))::integer);
      v_gap := make_interval(days => v_delta_days);
    elsif v_count >= 2 then
      v_gap := v_active[v_count].start_at - v_active[v_count - 1].start_at;
    else
      v_gap := interval '7 days';
    end if;

    for v_i in reverse v_count..1 loop
      v_duration := v_active[v_i].end_at - v_active[v_i].start_at;
      v_new_start := case when v_i < v_count then v_active[v_i + 1].start_at else v_active[v_i].start_at + v_gap end;
      v_new_end := v_new_start + v_duration;
      update public.sessions set
        start_at = v_new_start,
        end_at = v_new_end,
        status = case when coalesce(status, '') in ('finished', 'verified') and v_new_end > now() then 'opened' else status end
      where id = v_active[v_i].id and start_at = v_active[v_i].start_at;
      if not found then raise exception using errcode = '40001', message = 'POSTPONE_STALE_SESSION'; end if;
    end loop;

    v_new_id := gen_random_uuid();
    v_ghost := jsonb_populate_record(v_session, jsonb_build_object(
      'id', v_new_id, 'created_at', now(), 'updated_at', now(), 'short_code', null,
      'start_at', v_session.start_at, 'end_at', v_session.end_at,
      'status', 'postponed', 'mileage_option', ''
    ));
    insert into public.sessions select (v_ghost).*;

    v_action := case when p_mode = 'postpone_request' then '수업 연기 요청' else '수업 연기' end;
    perform public.admin_apply_session_linked_mileage(v_new_id, v_action, '', p_request_key::text || '-mileage');
  else
    if v_session.status is distinct from 'postponed' then
      raise exception using errcode = '55000', message = 'POSTPONE_INVALID_STATUS';
    end if;
    if exists (
      select 1 from public.mileage_logs where session_id = p_session_id
        and not (reason like '[수업연동]%' or reason like '[수업연동/보조]%')
    ) then
      raise exception using errcode = '23000', message = 'POSTPONE_LEGACY_MILEAGE_REVIEW_REQUIRED';
    end if;

    -- Validate and reverse the exact linked settlement before schedule deletion.
    perform public.admin_apply_session_linked_mileage(p_session_id, '', coalesce(v_session.mileage_option, ''), p_request_key::text || '-mileage');

    select array_agg(s order by s.start_at, s.id) into v_active
    from public.sessions s
    where s.group_id = v_group_id and s.start_at >= v_session.start_at
      and coalesce(s.status, '') not in ('postponed', 'cancelled', 'deleted');
    v_count := coalesce(cardinality(v_active), 0);
    if v_count > 0 then
      for v_i in 1..v_count loop
        v_duration := v_active[v_i].end_at - v_active[v_i].start_at;
        v_new_start := case when v_i = 1 then v_session.start_at else v_active[v_i - 1].start_at end;
        v_new_end := v_new_start + v_duration;
        update public.sessions set
          start_at = v_new_start,
          end_at = v_new_end,
          status = case when coalesce(status, '') in ('finished', 'verified') and v_new_end > now() then 'opened' else status end
        where id = v_active[v_i].id and start_at = v_active[v_i].start_at;
        if not found then raise exception using errcode = '40001', message = 'POSTPONE_STALE_SESSION'; end if;
      end loop;
    end if;
    delete from public.sessions where id = p_session_id and status = 'postponed';
    if not found then raise exception using errcode = '40001', message = 'POSTPONE_STALE_SESSION'; end if;
    v_new_id := p_session_id;
  end if;

  select coalesce(max(round_total), max(round_index), 1)::integer into v_total
  from public.sessions where group_id = v_group_id and coalesce(status, '') <> 'deleted';
  v_i := 0;
  for v_row in
    select * from public.sessions
    where group_id = v_group_id and coalesce(status, '') not in ('postponed', 'deleted')
    order by start_at, coalesce(round_index, 0), id
  loop
    v_i := v_i + 1;
    update public.sessions set round_index = v_i, sequence_number = v_i,
      round_total = v_total, round_display = v_i::text || '/' || v_total::text
    where id = v_row.id;
  end loop;

  v_result := jsonb_build_object('ok', true, 'mode', p_mode, 'sessionId', v_new_id, 'groupId', v_group_id, 'replayed', false);
  insert into private.phase2_mileage_request_results(request_key, operation, payload_hash, result)
  values (p_request_key::text, 'class-postpone', v_payload_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.admin_apply_class_postpone(uuid, text, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.admin_apply_class_postpone(uuid, text, timestamptz, uuid) to service_role;
