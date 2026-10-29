-- Read-only production function capture, 2026-10-30. Unmodified policy test baseline.
CREATE OR REPLACE FUNCTION public.admin_apply_session_linked_mileage(p_session_id uuid, p_next_action text, p_expected_action text, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session public.sessions%rowtype;
  v_payload_hash text;
  v_saved private.phase2_mileage_request_results%rowtype;
  v_current_action text;
  v_policy_total bigint;
  v_new_total bigint;
  v_extra_json text;
  v_extra jsonb := '[]'::jsonb;
  v_new_teacher_ids uuid[] := array[]::uuid[];
  v_old_teacher_ids uuid[] := array[]::uuid[];
  v_all_teacher_ids uuid[] := array[]::uuid[];
  v_teacher_id uuid;
  v_old_amount bigint;
  v_title text;
  v_reason text;
  v_result jsonb;
begin
  if p_session_id is null or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'MILEAGE_REQUEST_INVALID';
  end if;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'MILEAGE_SESSION_NOT_FOUND';
  end if;

  v_new_total := private.phase2_mileage_total(coalesce(p_next_action, ''), v_session.start_at);
  v_payload_hash := pg_catalog.md5(
    concat_ws('|', p_session_id::text, coalesce(p_next_action, ''), coalesce(p_expected_action, ''))
  );

  select * into v_saved from private.phase2_mileage_request_results where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'session-linked' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'MILEAGE_SESSION_NOT_FOUND';
  end if;

  select * into v_saved from private.phase2_mileage_request_results where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'session-linked' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  v_current_action := coalesce(v_session.mileage_option, '');
  if v_current_action is distinct from coalesce(p_expected_action, '') then
    raise exception using errcode = '40001', message = 'MILEAGE_STALE_SESSION';
  end if;

  v_policy_total := private.phase2_mileage_total(v_current_action, v_session.start_at);

  if v_session.created_by is not null then
    v_new_teacher_ids := array_append(v_new_teacher_ids, v_session.created_by);
  end if;

  if position('EXTRA_TEACHERS:' in coalesce(v_session.memo, '')) > 0 then
    v_extra_json := substring(split_part(v_session.memo, 'EXTRA_TEACHERS:', 2) from '(\[[^\r\n]*\])');
    if v_extra_json is not null then
      begin
        v_extra := v_extra_json::jsonb;
      exception when others then
        raise exception using errcode = '22023', message = 'MILEAGE_EXTRA_TEACHERS_INVALID';
      end;
    end if;
  end if;

  select coalesce(array_agg(x.teacher_id order by x.ordinality), array[]::uuid[])
  into v_new_teacher_ids
  from (
    select distinct on (teacher_id) teacher_id, ordinality
    from (
      select v_session.created_by as teacher_id, 0::bigint as ordinality
      where v_session.created_by is not null
      union all
      select extras.teacher_id, extras.ordinality
      from (
        select nullif(e.value->>'id', '')::uuid as teacher_id, e.ordinality
        from jsonb_array_elements(v_extra) with ordinality e(value, ordinality)
        where nullif(e.value->>'id', '') is not null
          and nullif(e.value->>'id', '')::uuid is distinct from v_session.created_by
        order by e.ordinality
        limit 2
      ) extras
    ) raw
    order by teacher_id, ordinality
  ) x;

  select coalesce(array_agg(teacher_id order by teacher_id), array[]::uuid[])
  into v_old_teacher_ids
  from (
    select teacher_id
    from public.mileage_logs
    where session_id = p_session_id
      and (reason like '[수업연동]%' or reason like '[수업연동/보조]%')
    group by teacher_id
    having count(*) = 1
  ) old_rows;

  if exists (
    select 1 from public.mileage_logs
    where session_id = p_session_id
      and (reason like '[수업연동]%' or reason like '[수업연동/보조]%')
    group by teacher_id having count(*) > 1
  ) then
    raise exception using errcode = '23000', message = 'MILEAGE_HISTORICAL_DUPLICATE_CONFLICT';
  end if;

  if exists (
    select 1 from public.mileage_logs
    where session_id = p_session_id
      and (reason like '[수업연동]%' or reason like '[수업연동/보조]%')
      and reason like '%조정%'
  ) then
    raise exception using errcode = '23000', message = 'MILEAGE_HISTORICAL_ADJUSTMENT_CONFLICT';
  end if;

  if cardinality(v_old_teacher_ids) = 0
    and nullif(v_current_action, '') is not null
    and v_policy_total <> 0 then
    raise exception using errcode = '23000', message = 'MILEAGE_HISTORICAL_LOG_MISSING';
  end if;

  if v_policy_total <> 0 and exists (
    select 1 from public.mileage_logs
    where session_id = p_session_id
      and (reason like '[수업연동]%' or reason like '[수업연동/보조]%')
      and amount is distinct from v_policy_total
  ) then
    raise exception using errcode = '23000', message = 'MILEAGE_HISTORICAL_AMOUNT_CONFLICT';
  end if;

  select coalesce(array_agg(distinct id order by id), array[]::uuid[])
  into v_all_teacher_ids
  from unnest(v_old_teacher_ids || v_new_teacher_ids) id;

  perform 1 from public.users where id = any(v_all_teacher_ids) order by id for update;
  if (select count(*) from public.users where id = any(v_all_teacher_ids)) <> cardinality(v_all_teacher_ids) then
    raise exception using errcode = 'P0002', message = 'MILEAGE_TEACHER_NOT_FOUND';
  end if;

  for v_teacher_id, v_old_amount in
    select teacher_id, amount
    from public.mileage_logs
    where session_id = p_session_id
      and (reason like '[수업연동]%' or reason like '[수업연동/보조]%')
    order by teacher_id
    for update
  loop
    update public.users set points = coalesce(points, 0) - v_old_amount where id = v_teacher_id;
  end loop;

  delete from public.mileage_logs
  where session_id = p_session_id
    and (reason like '[수업연동]%' or reason like '[수업연동/보조]%');

  v_title := regexp_replace(coalesce(v_session.title, ''), '\s*\([^()]*\d{4}[^()]*\d{1,2}[^()]*\d{1,2}[^()]*\)\s*$', '');
  v_title := concat_ws(' ', nullif(btrim(v_title), ''), '(' || to_char(v_session.start_at at time zone 'Asia/Seoul', 'YYYY. MM. DD.') || ')');
  v_reason := case when v_new_total < 0 then '차감' else '지급' end;

  if v_new_total <> 0 then
    foreach v_teacher_id in array v_new_teacher_ids loop
      update public.users set points = coalesce(points, 0) + v_new_total where id = v_teacher_id;
      insert into public.mileage_logs(teacher_id, amount, reason, session_title, session_id, session_started_at)
      values (
        v_teacher_id,
        v_new_total,
        case when v_teacher_id = v_session.created_by
          then '[수업연동] ' || v_reason || ': ' || p_next_action
          else '[수업연동/보조] ' || v_reason || ': ' || p_next_action end,
        v_title,
        p_session_id,
        v_session.start_at
      );
    end loop;
  end if;

  update public.sessions set mileage_option = coalesce(p_next_action, '') where id = p_session_id;

  v_result := jsonb_build_object(
    'ok', true,
    'sessionId', p_session_id,
    'action', coalesce(p_next_action, ''),
    'total', v_new_total,
    'teacherCount', cardinality(v_new_teacher_ids),
    'holidayPosture', private.kr_public_holiday_posture(v_session.start_at),
    'replayed', false
  );
  insert into private.phase2_mileage_request_results(request_key, operation, payload_hash, result)
  values (p_request_key, 'session-linked', v_payload_hash, v_result);
  return v_result;
end;
$function$
;
