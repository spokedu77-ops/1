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
  v_active public.sessions[];
  v_templates public.sessions[];
  v_destination public.sessions%rowtype;
  v_template public.sessions%rowtype;
  v_weekdays integer[];
  v_count integer;
  v_i integer;
  v_duration interval;
  v_new_start timestamptz;
  v_new_end timestamptz;
  v_delta_days integer;
  v_total integer;
  v_new_status public.sessions.status%type;
  v_snapshot jsonb := '[]'::jsonb;
  v_snapshot_item jsonb;
  v_extra_json text;
  v_extra_teachers jsonb;
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
    if position('POSTPONE_SNAPSHOT:' in coalesce(v_session.memo, '')) > 0 then
      raise exception using errcode = '23000', message = 'POSTPONE_SNAPSHOT_CONFLICT';
    end if;
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
    if exists (
      select 1 from unnest(v_active) active_session
      where active_session.created_by is null
        or active_session.price is null
        or active_session.end_at <= active_session.start_at
    ) then
      raise exception using errcode = '23000', message = 'POSTPONE_DESTINATION_SLOT_AMBIGUOUS';
    end if;

    -- Resolve the latest operational template for every Seoul weekday from
    -- the whole group, including slots before the postponed occurrence.
    select array_agg(q.session_row order by q.weekday) into v_templates
    from (
      select distinct on (weekday) session_row, weekday
      from (
        select s as session_row,
          extract(dow from (s.start_at at time zone 'Asia/Seoul'))::integer as weekday
        from public.sessions s
        where s.group_id = v_group_id
          and coalesce(s.status, '') not in ('postponed', 'cancelled', 'deleted')
      ) candidates
      order by weekday, (session_row).start_at desc, (session_row).id desc
    ) q;

    if coalesce(cardinality(v_templates), 0) not in (1, 2)
      or exists (
        select 1 from unnest(v_templates) template
        where template.created_by is null
          or template.price is null
          or template.end_at <= template.start_at
      ) then
      raise exception using errcode = '23000', message = 'POSTPONE_WEEKDAY_TEMPLATE_AMBIGUOUS';
    end if;

    select array_agg(extract(dow from (x.start_at at time zone 'Asia/Seoul'))::integer order by x.start_at)
    into v_weekdays from unnest(v_templates) x;

    v_delta_days := coalesce(
      (
        select d - extract(dow from (v_active[v_count].start_at at time zone 'Asia/Seoul'))::integer
        from unnest(v_weekdays) d
        where d > extract(dow from (v_active[v_count].start_at at time zone 'Asia/Seoul'))::integer
        order by d limit 1
      ),
      v_weekdays[1] + 7 - extract(dow from (v_active[v_count].start_at at time zone 'Asia/Seoul'))::integer
    );

    select template.* into v_template
    from unnest(v_templates) template
    where extract(dow from (template.start_at at time zone 'Asia/Seoul'))::integer
      = (
        extract(dow from (v_active[v_count].start_at at time zone 'Asia/Seoul'))::integer
        + v_delta_days
      ) % 7;
    if not found then
      raise exception using errcode = '23000', message = 'POSTPONE_WEEKDAY_TEMPLATE_AMBIGUOUS';
    end if;

    for v_i in reverse v_count..1 loop
      if v_i < v_count then
        v_destination := v_active[v_i + 1];
        v_new_start := v_destination.start_at;
        v_new_end := v_destination.end_at;
      else
        v_destination := v_template;
        v_duration := v_template.end_at - v_template.start_at;
        v_new_start := (
          (v_active[v_count].start_at at time zone 'Asia/Seoul')::date
          + v_delta_days
          + (v_template.start_at at time zone 'Asia/Seoul')::time
        ) at time zone 'Asia/Seoul';
        v_new_end := v_new_start + v_duration;
      end if;
      v_new_status := case
        when coalesce(v_active[v_i].status, '') in ('finished', 'verified') and v_new_end > now() then 'opened'
        else v_active[v_i].status
      end;

      v_extra_teachers := '[]'::jsonb;
      if position('EXTRA_TEACHERS:' in coalesce(v_active[v_i].memo, '')) > 0 then
        v_extra_json := substring(
          split_part(v_active[v_i].memo, 'EXTRA_TEACHERS:', 2)
          from '(\[[^\r\n]*\])'
        );
        begin
          if v_extra_json is null then
            raise exception 'assistant metadata is missing' using errcode = '22023';
          end if;
          v_extra_teachers := v_extra_json::jsonb;
          if jsonb_typeof(v_extra_teachers) <> 'array' then
            raise exception 'assistant metadata is not an array' using errcode = '22023';
          end if;
          perform nullif(item->>'id', '')::uuid
          from jsonb_array_elements(v_extra_teachers) item;
        exception when others then
          raise exception using errcode = '23000', message = 'POSTPONE_EXTRA_TEACHERS_INVALID';
        end;
      end if;
      if exists (
        select 1 from jsonb_array_elements(v_extra_teachers) item
        where nullif(item->>'id', '')::uuid = v_destination.created_by
      ) then
        raise exception using errcode = '23000', message = 'POSTPONE_MAIN_ASSIST_TEACHER_CONFLICT';
      end if;
      v_snapshot := jsonb_build_array(jsonb_build_object(
        'id', v_active[v_i].id,
        'oldStartAt', v_active[v_i].start_at,
        'oldEndAt', v_active[v_i].end_at,
        'oldCreatedBy', v_active[v_i].created_by,
        'oldPrice', v_active[v_i].price,
        'oldStatus', v_active[v_i].status,
        'shiftedStartAt', v_new_start,
        'shiftedEndAt', v_new_end,
        'shiftedCreatedBy', v_destination.created_by,
        'shiftedPrice', v_destination.price,
        'shiftedStatus', v_new_status
      )) || v_snapshot;

      if v_new_status = 'opened'
        and exists (
          select 1 from public.session_count_logs
          where session_id = v_active[v_i].id
            and reason is distinct from '트리거: sessions.status sync'
        ) then
        raise exception using errcode = '23000', message = 'POSTPONE_SESSION_COUNT_MANUAL_CONFLICT';
      end if;

      if coalesce(v_active[v_i].status, '') in ('finished', 'verified')
        and (
          nullif(v_active[v_i].mileage_option, '') is not null
          or exists (select 1 from public.mileage_logs where session_id = v_active[v_i].id)
        ) then
        raise exception using errcode = '23000', message = 'POSTPONE_SETTLED_SESSION_CONFLICT';
      end if;
      update public.sessions set
        start_at = v_new_start,
        end_at = v_new_end,
        created_by = v_destination.created_by,
        price = v_destination.price,
        status = v_new_status
      where id = v_active[v_i].id and start_at = v_active[v_i].start_at;
      if not found then raise exception using errcode = '40001', message = 'POSTPONE_STALE_SESSION'; end if;
    end loop;

    v_new_id := gen_random_uuid();
    v_ghost := jsonb_populate_record(v_session, jsonb_build_object(
      'id', v_new_id, 'created_at', now(), 'updated_at', now(), 'short_code', null,
      'start_at', v_session.start_at, 'end_at', v_session.end_at,
      'status', 'postponed', 'mileage_option', '',
      'memo', concat_ws(E'\n', nullif(v_session.memo, ''), 'POSTPONE_SNAPSHOT:' || v_snapshot::text),
      'students_text', null, 'feedback_fields', '{}'::jsonb,
      'completion_status', '{}'::jsonb,
      'photo_url', '[]'::jsonb, 'file_url', '[]'::jsonb
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

    if position('POSTPONE_SNAPSHOT:' in coalesce(v_session.memo, '')) = 0 then
      raise exception using errcode = '23000', message = 'POSTPONE_SNAPSHOT_MISSING';
    end if;
    begin
      v_snapshot := btrim(split_part(v_session.memo, 'POSTPONE_SNAPSHOT:', 2))::jsonb;
      if jsonb_typeof(v_snapshot) <> 'array' or jsonb_array_length(v_snapshot) = 0 then
        raise exception 'invalid postpone snapshot' using errcode = '22023';
      end if;
    exception when others then
      raise exception using errcode = '23000', message = 'POSTPONE_SNAPSHOT_INVALID';
    end;

    -- Validate and reverse the exact linked settlement before schedule deletion.
    perform public.admin_apply_session_linked_mileage(p_session_id, '', coalesce(v_session.mileage_option, ''), p_request_key::text || '-mileage');

    for v_snapshot_item in select value from jsonb_array_elements(v_snapshot)
    loop
      select * into v_row
      from public.sessions
      where id = (v_snapshot_item->>'id')::uuid
        and group_id = v_group_id;
      if not found
        or v_row.start_at is distinct from (v_snapshot_item->>'shiftedStartAt')::timestamptz
        or v_row.end_at is distinct from (v_snapshot_item->>'shiftedEndAt')::timestamptz
        or v_row.created_by is distinct from nullif(v_snapshot_item->>'shiftedCreatedBy', '')::uuid
        or v_row.price is distinct from (v_snapshot_item->>'shiftedPrice')::integer
        or v_row.status is distinct from v_snapshot_item->>'shiftedStatus' then
        raise exception using errcode = '40001', message = 'POSTPONE_RESTORE_STATE_CHANGED';
      end if;

      update public.sessions set
        start_at = (v_snapshot_item->>'oldStartAt')::timestamptz,
        end_at = (v_snapshot_item->>'oldEndAt')::timestamptz,
        created_by = nullif(v_snapshot_item->>'oldCreatedBy', '')::uuid,
        price = (v_snapshot_item->>'oldPrice')::integer,
        status = v_snapshot_item->>'oldStatus'
      where id = v_row.id;
    end loop;
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
