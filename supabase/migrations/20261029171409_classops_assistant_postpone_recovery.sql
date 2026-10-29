-- Class Ops P0/P1 recovery. Applied with explicit approval; version matches remote history.
-- Preserve Stage 2A/2B/2C, auth/RLS and the existing mileage policy.
-- Assistant inheritance approved by user: destination weekday, including both fees.
begin;

create or replace function private.classops_metadata_span(p_memo text, p_tag text)
returns integer[] language plpgsql immutable set search_path = '' as $$
declare
  v_source text := coalesce(p_memo, '');
  v_offset integer := 1;
  v_match text;
  v_start integer;
  v_end integer;
  v_i integer;
  v_depth integer;
  v_quoted boolean;
  v_escape boolean;
  v_char text;
  v_result integer[];
begin
  loop
    v_match := substring(substring(v_source from v_offset) from '\m[A-Z][A-Z0-9_]*:');
    exit when v_match is null;
    v_start := v_offset + strpos(substring(v_source from v_offset), v_match) + length(v_match) - 1;
    v_offset := v_start;
    while substring(v_source from v_start for 1) ~ '\s' loop v_start := v_start + 1; end loop;
    if substring(v_source from v_start for 1) not in ('[', '{') then
      if v_match = p_tag then raise exception 'SESSION_METADATA_INVALID'; end if;
      continue;
    end if;
    v_depth := 0; v_quoted := false; v_escape := false; v_end := null;
    for v_i in v_start..length(v_source) loop
      v_char := substring(v_source from v_i for 1);
      if v_escape then v_escape := false; continue; end if;
      if v_quoted and v_char = E'\\' then v_escape := true; continue; end if;
      if v_char = '"' then v_quoted := not v_quoted; continue; end if;
      if v_quoted then continue; end if;
      if v_char in ('[', '{') then v_depth := v_depth + 1; end if;
      if v_char in (']', '}') then
        v_depth := v_depth - 1;
        if v_depth = 0 then v_end := v_i; exit; end if;
      end if;
    end loop;
    if v_end is null then raise exception 'SESSION_METADATA_INVALID'; end if;
    if v_match = p_tag then
      if v_result is not null then raise exception 'SESSION_METADATA_DUPLICATE'; end if;
      perform substring(v_source from v_start for v_end - v_start + 1)::jsonb;
      v_result := array[v_start, v_end];
    end if;
    v_offset := v_end + 1;
  end loop;
  return v_result;
end; $$;

create or replace function private.classops_read_assistants(p_memo text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare v_span integer[]; v_rows jsonb; v_item jsonb; v_ids uuid[] := array[]::uuid[]; v_id uuid; v_price numeric;
begin
  v_span := private.classops_metadata_span(p_memo, 'EXTRA_TEACHERS:');
  if v_span is null then return '[]'::jsonb; end if;
  v_rows := substring(p_memo from v_span[1] for v_span[2] - v_span[1] + 1)::jsonb;
  if jsonb_typeof(v_rows) <> 'array' or jsonb_array_length(v_rows) > 2 then raise exception 'POSTPONE_EXTRA_TEACHERS_INVALID'; end if;
  for v_item in select value from jsonb_array_elements(v_rows) loop
    v_id := nullif(v_item->>'id', '')::uuid;
    v_price := (v_item->>'price')::numeric;
    if v_id is null or v_id = any(v_ids) or v_price is null or v_price < 0 or v_price <> trunc(v_price) or v_price > 2147483647 then
      raise exception 'POSTPONE_EXTRA_TEACHERS_INVALID';
    end if;
    v_ids := array_append(v_ids, v_id);
  end loop;
  return v_rows;
exception when others then raise exception using errcode = '23000', message = 'POSTPONE_EXTRA_TEACHERS_INVALID';
end; $$;

create or replace function private.classops_replace_assistants(p_memo text, p_assistants jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare v_source text := coalesce(p_memo, ''); v_span integer[];
begin
  v_span := private.classops_metadata_span(v_source, 'EXTRA_TEACHERS:');
  if v_span is not null then
    return substring(v_source from 1 for v_span[1] - 1) || p_assistants::text || substring(v_source from v_span[2] + 1);
  end if;
  -- An explicit [] before the new snapshot also keeps the unchanged legacy mileage parser safe.
  return v_source || case when v_source <> '' and right(v_source, 1) <> E'\n' then E'\n' else '' end || 'EXTRA_TEACHERS:' || p_assistants::text;
end; $$;

revoke all on function private.classops_metadata_span(text,text) from public, anon, authenticated;
revoke all on function private.classops_read_assistants(text) from public, anon, authenticated;
revoke all on function private.classops_replace_assistants(text,jsonb) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_apply_class_postpone(p_session_id uuid, p_mode text, p_expected_start_at timestamp with time zone, p_request_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_new_memo text;
  v_span integer[];
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
    if coalesce(v_session.status, '') in ('postponed', 'cancelled', 'deleted', 'finished', 'verified') then
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
    if exists (select 1 from unnest(v_active) active_session where active_session.status in ('finished', 'verified')) then
      raise exception using errcode = '55000', message = 'POSTPONE_SETTLED_SESSION_CONFLICT';
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

      -- Approved 2026-10-30: main AND assistant assignments/fees follow the destination weekday.
      -- Validate the source too: do not silently repair historical malformed assistant records.
      perform private.classops_read_assistants(v_active[v_i].memo);
      v_extra_teachers := private.classops_read_assistants(v_destination.memo);
      v_new_memo := private.classops_replace_assistants(v_active[v_i].memo, v_extra_teachers);
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
        'oldMemo', v_active[v_i].memo,
        'shiftedMemo', v_new_memo,
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
        status = v_new_status,
        memo = v_new_memo
      where id = v_active[v_i].id and start_at = v_active[v_i].start_at;
      if not found then raise exception using errcode = '40001', message = 'POSTPONE_STALE_SESSION'; end if;
    end loop;

    v_new_id := gen_random_uuid();
    v_ghost := jsonb_populate_record(v_session, jsonb_build_object(
      'id', v_new_id, 'created_at', now(), 'updated_at', now(), 'short_code', null,
      'start_at', v_session.start_at, 'end_at', v_session.end_at,
      'status', 'postponed', 'mileage_option', '',
      'memo', concat_ws(E'\n', nullif(private.classops_replace_assistants(v_session.memo, private.classops_read_assistants(v_session.memo)), ''), 'POSTPONE_SNAPSHOT:' || v_snapshot::text),
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
      v_span := private.classops_metadata_span(v_session.memo, 'POSTPONE_SNAPSHOT:');
      v_snapshot := substring(v_session.memo from v_span[1] for v_span[2] - v_span[1] + 1)::jsonb;
      if jsonb_typeof(v_snapshot) <> 'array' or jsonb_array_length(v_snapshot) = 0 then
        raise exception 'invalid postpone snapshot' using errcode = '22023';
      end if;
    exception when others then
      raise exception using errcode = '23000', message = 'POSTPONE_SNAPSHOT_INVALID';
    end;

    if exists (select 1 from jsonb_array_elements(v_snapshot) item where not (item ? 'oldMemo' and item ? 'shiftedMemo')) then
      raise exception using errcode = '23000', message = 'POSTPONE_SNAPSHOT_REVIEW_REQUIRED';
    end if;

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
        or v_row.status is distinct from v_snapshot_item->>'shiftedStatus'
        or v_row.memo is distinct from v_snapshot_item->>'shiftedMemo' then
        raise exception using errcode = '40001', message = 'POSTPONE_RESTORE_STATE_CHANGED';
      end if;

      update public.sessions set
        start_at = (v_snapshot_item->>'oldStartAt')::timestamptz,
        end_at = (v_snapshot_item->>'oldEndAt')::timestamptz,
        created_by = nullif(v_snapshot_item->>'oldCreatedBy', '')::uuid,
        price = (v_snapshot_item->>'oldPrice')::integer,
        status = v_snapshot_item->>'oldStatus',
        memo = v_snapshot_item->>'oldMemo'
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
$function$
;
revoke all on function public.admin_apply_class_postpone(uuid,text,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.admin_apply_class_postpone(uuid,text,timestamptz,uuid) to service_role;

-- Optimistic concurrency wrapper. The existing Stage 2C bulk RPC and triggers are unchanged.
create or replace function public.admin_apply_session_checked_changes(p_changes jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_item jsonb; v_expected jsonb; v_row public.sessions%rowtype; v_clean jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'SESSION_UPDATE_INVALID';
  end if;
  if (select count(distinct item->>'id') from jsonb_array_elements(p_changes) item) <> jsonb_array_length(p_changes) then
    raise exception using errcode = '22023', message = 'SESSION_UPDATE_INVALID';
  end if;
  perform 1 from public.sessions s join jsonb_array_elements(p_changes) item on s.id=(item->>'id')::uuid order by s.id for update;
  for v_item in select value from jsonb_array_elements(p_changes) loop
    v_expected := v_item->'expected';
    if v_expected is null or jsonb_typeof(v_expected) <> 'object'
      or not (v_expected ?& array['start_at','end_at','created_by','memo','price','status']) then
      raise exception using errcode = '22023', message = 'SESSION_UPDATE_INVALID';
    end if;
    select * into v_row from public.sessions where id=(v_item->>'id')::uuid;
    if not found or v_row.start_at is distinct from (v_expected->>'start_at')::timestamptz
      or v_row.end_at is distinct from (v_expected->>'end_at')::timestamptz
      or v_row.created_by is distinct from (v_expected->>'created_by')::uuid
      or v_row.memo is distinct from v_expected->>'memo'
      or v_row.price is distinct from (v_expected->>'price')::integer
      or v_row.status is distinct from v_expected->>'status' then
      raise exception using errcode = '40001', message = 'SESSION_UPDATE_STALE';
    end if;
    if v_item ? 'memo' then
      -- Historical malformed metadata is not automatically removed by a bulk edit.
      perform private.classops_read_assistants(v_row.memo);
      perform private.classops_read_assistants(v_item->>'memo');
    end if;
    v_clean := v_clean || jsonb_build_array(v_item - 'expected');
  end loop;
  return public.admin_apply_session_schedule_changes(v_clean);
end; $$;
revoke all on function public.admin_apply_session_checked_changes(jsonb) from public, anon, authenticated;
grant execute on function public.admin_apply_session_checked_changes(jsonb) to service_role;
commit;
