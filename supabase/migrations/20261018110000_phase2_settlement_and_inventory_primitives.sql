-- Phase 2: server-only atomic mileage settlement primitives and inventory image bucket.
-- This migration is additive and must be deployed before the application starts
-- calling the RPCs. It does not rewrite historical points or mileage logs.

create table if not exists private.phase2_mileage_request_results (
  request_key text primary key,
  operation text not null,
  payload_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint phase2_mileage_request_key_length check (char_length(request_key) between 16 and 128)
);

revoke all on table private.phase2_mileage_request_results from public, anon, authenticated;
grant select, insert on table private.phase2_mileage_request_results to service_role;

create or replace function private.phase2_mileage_total(p_action text)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_label text;
  v_total bigint := 0;
begin
  if nullif(btrim(coalesce(p_action, '')), '') is null then
    return 0;
  end if;

  foreach v_label in array string_to_array(p_action, ',') loop
    v_label := btrim(v_label);
    case v_label
      when '보고 지연' then v_total := v_total - 2500;
      when '피드백 누락' then v_total := v_total - 2500;
      when '수업 연기' then v_total := v_total + 2500;
      when '당일 연기' then v_total := v_total + 5000;
      when '수업 연기 요청' then v_total := v_total - 5000;
      when '수업 당일 연기' then v_total := v_total - 15000;
      when '주간 베스트 수업안' then v_total := v_total + 4000;
      when '주간 베스트 포토' then v_total := v_total + 2000;
      when '주간 베스트 피드백' then v_total := v_total + 2000;
      else raise exception using errcode = '22023', message = 'MILEAGE_ACTION_UNKNOWN';
    end case;
  end loop;
  return v_total;
end;
$$;

revoke all on function private.phase2_mileage_total(text) from public, anon, authenticated;
grant execute on function private.phase2_mileage_total(text) to service_role;

create or replace function public.admin_apply_session_linked_mileage(
  p_session_id uuid,
  p_next_action text,
  p_expected_action text,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
  v_payload_hash text;
  v_saved private.phase2_mileage_request_results%rowtype;
  v_current_action text;
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

  v_new_total := private.phase2_mileage_total(coalesce(p_next_action, ''));
  v_payload_hash := pg_catalog.md5(
    concat_ws('|', p_session_id::text, coalesce(p_next_action, ''), coalesce(p_expected_action, ''))
  );

  select * into v_saved
  from private.phase2_mileage_request_results
  where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'session-linked' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'MILEAGE_SESSION_NOT_FOUND';
  end if;

  select * into v_saved
  from private.phase2_mileage_request_results
  where request_key = p_request_key;
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

  -- Legacy "adjustment" rows recorded a change amount rather than the settled
  -- session total. Reversing a negative row would credit points incorrectly.
  -- Fail closed and leave both the historical balance and log untouched.
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
    and private.phase2_mileage_total(v_current_action) <> 0 then
    raise exception using errcode = '23000', message = 'MILEAGE_HISTORICAL_LOG_MISSING';
  end if;

  if exists (
    select 1 from public.mileage_logs
    where session_id = p_session_id
      and (reason like '[수업연동]%' or reason like '[수업연동/보조]%')
      and amount is distinct from private.phase2_mileage_total(v_current_action)
  ) then
    raise exception using errcode = '23000', message = 'MILEAGE_HISTORICAL_AMOUNT_CONFLICT';
  end if;

  select coalesce(array_agg(distinct id order by id), array[]::uuid[])
  into v_all_teacher_ids
  from unnest(v_old_teacher_ids || v_new_teacher_ids) id;

  perform 1
  from public.users
  where id = any(v_all_teacher_ids)
  order by id
  for update;
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
    update public.users
    set points = coalesce(points, 0) - v_old_amount
    where id = v_teacher_id;
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
    'replayed', false
  );
  insert into private.phase2_mileage_request_results(request_key, operation, payload_hash, result)
  values (p_request_key, 'session-linked', v_payload_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.admin_apply_session_linked_mileage(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_apply_session_linked_mileage(uuid, text, text, text) to service_role;

create or replace function public.admin_apply_mileage_adjustment(
  p_teacher_id uuid,
  p_point_delta bigint,
  p_reason text,
  p_request_key text,
  p_reverse_log_id uuid default null,
  p_expected_log_amount bigint default null,
  p_expected_log_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload_hash text;
  v_saved private.phase2_mileage_request_results%rowtype;
  v_log public.mileage_logs%rowtype;
  v_log_id uuid;
  v_points bigint;
  v_effective_delta bigint;
  v_result jsonb;
begin
  if p_teacher_id is null or p_point_delta = 0
    or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'MILEAGE_ADJUSTMENT_INVALID';
  end if;
  if p_reverse_log_id is null and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception using errcode = '22023', message = 'MILEAGE_REASON_REQUIRED';
  end if;

  v_payload_hash := pg_catalog.md5(concat_ws('|', p_teacher_id::text, p_point_delta::text,
    coalesce(p_reason, ''), coalesce(p_reverse_log_id::text, ''), coalesce(p_expected_log_amount::text, ''),
    coalesce(p_expected_log_reason, '')));

  select * into v_saved from private.phase2_mileage_request_results where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'manual-adjustment' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select points into v_points from public.users where id = p_teacher_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'MILEAGE_TEACHER_NOT_FOUND'; end if;

  select * into v_saved from private.phase2_mileage_request_results where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'manual-adjustment' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  if p_reverse_log_id is not null then
    select * into v_log from public.mileage_logs where id = p_reverse_log_id for update;
    if not found or v_log.teacher_id is distinct from p_teacher_id
      or v_log.amount is distinct from p_expected_log_amount
      or v_log.reason is distinct from p_expected_log_reason then
      raise exception using errcode = '40001', message = 'MILEAGE_LOG_STALE';
    end if;
    if v_log.reason like '[수업연동]%' or v_log.reason like '[수업연동/보조]%' then
      raise exception using errcode = '42501', message = 'MILEAGE_LINKED_LOG_REQUIRES_SESSION_FLOW';
    end if;
    v_effective_delta := -v_log.amount;
    if p_point_delta is distinct from v_effective_delta then
      raise exception using errcode = '40001', message = 'MILEAGE_REVERSAL_AMOUNT_MISMATCH';
    end if;
    delete from public.mileage_logs where id = p_reverse_log_id;
    v_log_id := p_reverse_log_id;
  else
    v_effective_delta := p_point_delta;
    insert into public.mileage_logs(teacher_id, amount, reason, session_title)
    values (p_teacher_id, p_point_delta, btrim(p_reason), '운영진 수동 조정')
    returning id into v_log_id;
  end if;

  update public.users set points = coalesce(points, 0) + v_effective_delta where id = p_teacher_id
  returning points into v_points;

  v_result := jsonb_build_object('ok', true, 'teacherId', p_teacher_id, 'points', v_points,
    'logId', v_log_id, 'reversed', p_reverse_log_id is not null, 'replayed', false);
  insert into private.phase2_mileage_request_results(request_key, operation, payload_hash, result)
  values (p_request_key, 'manual-adjustment', v_payload_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.admin_apply_mileage_adjustment(uuid, bigint, text, text, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.admin_apply_mileage_adjustment(uuid, bigint, text, text, uuid, bigint, text) to service_role;

create or replace function public.admin_cas_inventory_image(
  p_table text,
  p_id bigint,
  p_expected_md5 text,
  p_next_image text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed bigint;
begin
  if p_table = 'catalog' then
    update public.catalog
    set image = p_next_image
    where id = p_id and pg_catalog.md5(coalesce(image, '')) = p_expected_md5;
  elsif p_table = 'inventory' then
    update public.inventory
    set image = p_next_image
    where id = p_id and pg_catalog.md5(coalesce(image, '')) = p_expected_md5;
  else
    raise exception using errcode = '22023', message = 'INVENTORY_IMAGE_TABLE_INVALID';
  end if;
  get diagnostics v_changed = row_count;
  return v_changed = 1;
end;
$$;

revoke all on function public.admin_cas_inventory_image(text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.admin_cas_inventory_image(text, bigint, text, text) to service_role;

do $$
declare
  v_bucket storage.buckets%rowtype;
  v_mimes constant text[] := array['image/jpeg','image/png','image/webp','image/gif']::text[];
begin
  select * into v_bucket from storage.buckets where id = 'spokedu-inventory-images' for update;
  if not found then
    insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
    values ('spokedu-inventory-images','spokedu-inventory-images',true,15728640,v_mimes);
    select * into strict v_bucket from storage.buckets where id = 'spokedu-inventory-images' for update;
  end if;
  if v_bucket.name is distinct from 'spokedu-inventory-images'
    or v_bucket.public is distinct from true
    or v_bucket.file_size_limit is distinct from 15728640
    or v_bucket.allowed_mime_types is distinct from v_mimes then
    raise exception using errcode='P0001', message='inventory image bucket settings mismatch; no changes applied';
  end if;
end;
$$;
