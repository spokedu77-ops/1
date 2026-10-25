-- Mileage: KR holiday calendar, holiday-aware settlement, admin cancel (single vs session settlement).
-- Production already has 20261023135717 / 20261023135727 — do not re-apply postpone migrations under new names.

create table if not exists public.kr_public_holidays (
  holiday_date date primary key,
  name text not null,
  holiday_kind text not null check (holiday_kind in ('legal', 'substitute', 'temporary'))
);

create table if not exists public.kr_public_holiday_coverage (
  calendar_year integer primary key,
  source_version text not null,
  loaded_at timestamptz not null default now()
);

revoke all on table public.kr_public_holidays from public, anon, authenticated;
revoke all on table public.kr_public_holiday_coverage from public, anon, authenticated;
grant select on table public.kr_public_holidays to authenticated;
grant select on table public.kr_public_holiday_coverage to authenticated;
grant select, insert, update, delete on table public.kr_public_holidays to service_role;
grant select, insert, update, delete on table public.kr_public_holiday_coverage to service_role;

create table if not exists private.mileage_log_cancel_audits (
  id uuid primary key default gen_random_uuid(),
  original_log_id uuid not null unique,
  teacher_id uuid not null,
  session_id uuid null,
  amount bigint not null,
  reason text not null,
  session_title text,
  session_started_at timestamptz,
  cancel_scope text not null check (cancel_scope in ('single', 'session_settlement', 'manual')),
  request_key text not null unique,
  cancelled_at timestamptz not null default now()
);

revoke all on table private.mileage_log_cancel_audits from public, anon, authenticated;
grant select, insert on table private.mileage_log_cancel_audits to service_role;

create or replace function private.kr_seoul_local_date(p_ts timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_ts at time zone 'Asia/Seoul')::date;
$$;

create or replace function private.kr_public_holiday_posture(p_ts timestamptz)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_date date;
  v_year integer;
begin
  if p_ts is null then
    return 'unknown';
  end if;
  v_date := private.kr_seoul_local_date(p_ts);
  v_year := extract(year from v_date)::integer;
  if not exists (select 1 from public.kr_public_holiday_coverage c where c.calendar_year = v_year) then
    return 'unknown';
  end if;
  if exists (select 1 from public.kr_public_holidays h where h.holiday_date = v_date) then
    return 'holiday';
  end if;
  return 'weekday';
end;
$$;

create or replace function private.kr_public_holiday_blocks_postpone_credit(p_session_start_at timestamptz)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_session_start_at is null then
    return true;
  end if;
  return private.kr_public_holiday_posture(p_session_start_at) in ('holiday', 'unknown');
end;
$$;

revoke all on function private.kr_seoul_local_date(timestamptz) from public, anon, authenticated;
revoke all on function private.kr_public_holiday_posture(timestamptz) from public, anon, authenticated;
revoke all on function private.kr_public_holiday_blocks_postpone_credit(timestamptz) from public, anon, authenticated;
grant execute on function private.kr_seoul_local_date(timestamptz) to service_role;
grant execute on function private.kr_public_holiday_posture(timestamptz) to service_role;
grant execute on function private.kr_public_holiday_blocks_postpone_credit(timestamptz) to service_role;

drop function if exists private.phase2_mileage_total(text);

create or replace function private.phase2_mileage_total(p_action text, p_session_start_at timestamptz default null)
returns bigint
language plpgsql
stable
set search_path = ''
as $$
declare
  v_label text;
  v_total bigint := 0;
  v_block boolean;
begin
  if nullif(btrim(coalesce(p_action, '')), '') is null then
    return 0;
  end if;
  v_block := private.kr_public_holiday_blocks_postpone_credit(p_session_start_at);

  foreach v_label in array string_to_array(p_action, ',') loop
    v_label := btrim(v_label);
    case v_label
      when '보고 지연' then v_total := v_total - 2500;
      when '피드백 누락' then v_total := v_total - 2500;
      when '수업 연기' then
        if v_block then v_total := v_total + 0; else v_total := v_total + 2500; end if;
      when '당일 연기' then
        if v_block then v_total := v_total + 0; else v_total := v_total + 5000; end if;
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

revoke all on function private.phase2_mileage_total(text, timestamptz) from public, anon, authenticated;
grant execute on function private.phase2_mileage_total(text, timestamptz) to service_role;

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
$$;

revoke all on function public.admin_apply_session_linked_mileage(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_apply_session_linked_mileage(uuid, text, text, text) to service_role;

-- Single mileage log cancel (does not cancel other teachers on the same session).
create or replace function public.admin_cancel_mileage_log(
  p_teacher_id uuid,
  p_log_id uuid,
  p_expected_log_amount bigint,
  p_expected_log_reason text,
  p_request_key text
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
  v_points bigint;
  v_remaining integer;
  v_result jsonb;
begin
  if p_teacher_id is null or p_log_id is null
    or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'MILEAGE_CANCEL_INVALID';
  end if;

  v_payload_hash := pg_catalog.md5(concat_ws('|', 'single', p_teacher_id::text, p_log_id::text,
    coalesce(p_expected_log_amount::text, ''), coalesce(p_expected_log_reason, '')));

  select * into v_saved from private.phase2_mileage_request_results where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'mileage-cancel-single' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  if exists (select 1 from private.mileage_log_cancel_audits a where a.original_log_id = p_log_id) then
    raise exception using errcode = '23505', message = 'MILEAGE_ALREADY_CANCELLED';
  end if;

  select * into v_log from public.mileage_logs where id = p_log_id for update;
  if not found or v_log.teacher_id is distinct from p_teacher_id
    or v_log.amount is distinct from p_expected_log_amount
    or v_log.reason is distinct from p_expected_log_reason then
    raise exception using errcode = '40001', message = 'MILEAGE_LOG_STALE';
  end if;

  select points into v_points from public.users where id = p_teacher_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'MILEAGE_TEACHER_NOT_FOUND';
  end if;

  insert into private.mileage_log_cancel_audits(
    original_log_id, teacher_id, session_id, amount, reason, session_title, session_started_at, cancel_scope, request_key
  ) values (
    v_log.id, v_log.teacher_id, v_log.session_id, v_log.amount, v_log.reason,
    v_log.session_title, v_log.session_started_at, 'single', p_request_key
  );

  update public.users set points = coalesce(points, 0) - v_log.amount where id = p_teacher_id;
  delete from public.mileage_logs where id = p_log_id;

  if v_log.session_id is not null then
    perform 1 from public.sessions where id = v_log.session_id for update;
    select count(*) into v_remaining
    from public.mileage_logs ml
    where ml.session_id = v_log.session_id
      and (ml.reason like '[수업연동]%' or ml.reason like '[수업연동/보조]%');
    if v_remaining = 0 then
      update public.sessions set mileage_option = '' where id = v_log.session_id;
    end if;
  end if;

  select points into v_points from public.users where id = p_teacher_id;

  v_result := jsonb_build_object(
    'ok', true,
    'scope', 'single',
    'teacherId', p_teacher_id,
    'points', v_points,
    'logId', p_log_id,
    'replayed', false
  );
  insert into private.phase2_mileage_request_results(request_key, operation, payload_hash, result)
  values (p_request_key, 'mileage-cancel-single', v_payload_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.admin_cancel_mileage_log(uuid, uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.admin_cancel_mileage_log(uuid, uuid, bigint, text, text) to service_role;

create or replace function public.admin_cancel_session_linked_settlement(
  p_session_id uuid,
  p_expected_mileage_option text,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload_hash text;
  v_saved private.phase2_mileage_request_results%rowtype;
  v_session public.sessions%rowtype;
  v_rec record;
  v_cancelled jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  if p_session_id is null or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'MILEAGE_CANCEL_INVALID';
  end if;

  v_payload_hash := pg_catalog.md5(concat_ws('|', 'session_settlement', p_session_id::text, coalesce(p_expected_mileage_option, '')));

  select * into v_saved from private.phase2_mileage_request_results where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'mileage-cancel-session' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'MILEAGE_SESSION_NOT_FOUND';
  end if;
  if coalesce(v_session.mileage_option, '') is distinct from coalesce(p_expected_mileage_option, '') then
    raise exception using errcode = '40001', message = 'MILEAGE_STALE_SESSION';
  end if;

  for v_rec in
    select ml.*
    from public.mileage_logs ml
    where ml.session_id = p_session_id
      and (ml.reason like '[수업연동]%' or ml.reason like '[수업연동/보조]%')
    order by ml.teacher_id, ml.id
    for update
  loop
    if exists (select 1 from private.mileage_log_cancel_audits a where a.original_log_id = v_rec.id) then
      raise exception using errcode = '23505', message = 'MILEAGE_ALREADY_CANCELLED';
    end if;
    perform 1 from public.users where id = v_rec.teacher_id for update;
    insert into private.mileage_log_cancel_audits(
      original_log_id, teacher_id, session_id, amount, reason, session_title, session_started_at, cancel_scope, request_key
    ) values (
      v_rec.id, v_rec.teacher_id, v_rec.session_id, v_rec.amount, v_rec.reason,
      v_rec.session_title, v_rec.session_started_at, 'session_settlement', p_request_key || ':' || v_rec.id::text
    );
    update public.users set points = coalesce(points, 0) - v_rec.amount where id = v_rec.teacher_id;
    v_cancelled := v_cancelled || jsonb_build_array(jsonb_build_object(
      'teacherId', v_rec.teacher_id,
      'logId', v_rec.id,
      'amount', v_rec.amount,
      'reason', v_rec.reason
    ));
  end loop;

  delete from public.mileage_logs
  where session_id = p_session_id
    and (reason like '[수업연동]%' or reason like '[수업연동/보조]%');

  update public.sessions set mileage_option = '' where id = p_session_id;

  v_result := jsonb_build_object(
    'ok', true,
    'scope', 'session_settlement',
    'sessionId', p_session_id,
    'cancelled', v_cancelled,
    'replayed', false
  );
  insert into private.phase2_mileage_request_results(request_key, operation, payload_hash, result)
  values (p_request_key, 'mileage-cancel-session', v_payload_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.admin_cancel_session_linked_settlement(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_cancel_session_linked_settlement(uuid, text, text) to service_role;

-- GENERATED from data/kr-public-holidays.json — do not edit by hand
insert into public.kr_public_holidays (holiday_date, name, holiday_kind)
values
('2024-01-01'::date, '신정', 'legal'),
('2024-02-09'::date, '설날 연휴', 'legal'),
('2024-02-10'::date, '설날', 'legal'),
('2024-02-11'::date, '설날 연휴', 'legal'),
('2024-02-12'::date, '대체공휴일(설날)', 'substitute'),
('2024-03-01'::date, '삼일절', 'legal'),
('2024-04-10'::date, '부처님오신날', 'legal'),
('2024-05-01'::date, '근로자의 날', 'legal'),
('2024-05-05'::date, '어린이날', 'legal'),
('2024-05-06'::date, '대체공휴일(어린이날)', 'substitute'),
('2024-05-15'::date, '임시공휴일(국회의원선거)', 'temporary'),
('2024-06-06'::date, '현충일', 'legal'),
('2024-08-15'::date, '광복절', 'legal'),
('2024-09-16'::date, '추석 연휴', 'legal'),
('2024-09-17'::date, '추석', 'legal'),
('2024-09-18'::date, '추석 연휴', 'legal'),
('2024-10-03'::date, '개천절', 'legal'),
('2024-10-09'::date, '한글날', 'legal'),
('2024-12-25'::date, '기독탄신일', 'legal'),
('2025-01-01'::date, '신정', 'legal'),
('2025-01-28'::date, '설날 연휴', 'legal'),
('2025-01-29'::date, '설날', 'legal'),
('2025-01-30'::date, '설날 연휴', 'legal'),
('2025-03-01'::date, '삼일절', 'legal'),
('2025-03-03'::date, '대체공휴일(삼일절)', 'substitute'),
('2025-05-01'::date, '근로자의 날', 'legal'),
('2025-05-05'::date, '어린이날', 'legal'),
('2025-05-06'::date, '부처님오신날', 'legal'),
('2025-06-06'::date, '현충일', 'legal'),
('2025-08-15'::date, '광복절', 'legal'),
('2025-10-03'::date, '개천절', 'legal'),
('2025-10-05'::date, '추석 연휴', 'legal'),
('2025-10-06'::date, '추석', 'legal'),
('2025-10-07'::date, '추석 연휴', 'legal'),
('2025-10-08'::date, '대체공휴일(추석)', 'substitute'),
('2025-10-09'::date, '한글날', 'legal'),
('2025-12-25'::date, '기독탄신일', 'legal'),
('2026-01-01'::date, '신정', 'legal'),
('2026-02-16'::date, '설날 연휴', 'legal'),
('2026-02-17'::date, '설날', 'legal'),
('2026-02-18'::date, '설날 연휴', 'legal'),
('2026-03-01'::date, '삼일절', 'legal'),
('2026-05-01'::date, '근로자의 날', 'legal'),
('2026-05-05'::date, '어린이날', 'legal'),
('2026-05-24'::date, '부처님오신날', 'legal'),
('2026-06-03'::date, '임시공휴일(지방선거)', 'temporary'),
('2026-06-06'::date, '현충일', 'legal'),
('2026-08-15'::date, '광복절', 'legal'),
('2026-08-17'::date, '대체공휴일(광복절)', 'substitute'),
('2026-09-24'::date, '추석 연휴', 'legal'),
('2026-09-25'::date, '추석', 'legal'),
('2026-09-26'::date, '추석 연휴', 'legal'),
('2026-10-03'::date, '개천절', 'legal'),
('2026-10-05'::date, '대체공휴일(개천절)', 'substitute'),
('2026-10-09'::date, '한글날', 'legal'),
('2026-12-25'::date, '기독탄신일', 'legal'),
('2027-01-01'::date, '신정', 'legal'),
('2027-02-06'::date, '설날 연휴', 'legal'),
('2027-02-07'::date, '설날', 'legal'),
('2027-02-08'::date, '설날 연휴', 'legal'),
('2027-02-09'::date, '대체공휴일(설날)', 'substitute'),
('2027-03-01'::date, '삼일절', 'legal'),
('2027-05-01'::date, '근로자의 날', 'legal'),
('2027-05-05'::date, '어린이날', 'legal'),
('2027-05-13'::date, '부처님오신날', 'legal'),
('2027-06-06'::date, '현충일', 'legal'),
('2027-08-15'::date, '광복절', 'legal'),
('2027-08-16'::date, '대체공휴일(광복절)', 'substitute'),
('2027-09-14'::date, '추석 연휴', 'legal'),
('2027-09-15'::date, '추석', 'legal'),
('2027-09-16'::date, '추석 연휴', 'legal'),
('2027-10-03'::date, '개천절', 'legal'),
('2027-10-04'::date, '대체공휴일(개천절)', 'substitute'),
('2027-10-09'::date, '한글날', 'legal'),
('2027-10-11'::date, '대체공휴일(한글날)', 'substitute'),
('2027-12-25'::date, '기독탄신일', 'legal'),
('2028-01-01'::date, '신정', 'legal'),
('2028-01-26'::date, '설날 연휴', 'legal'),
('2028-01-27'::date, '설날', 'legal'),
('2028-01-28'::date, '설날 연휴', 'legal'),
('2028-03-01'::date, '삼일절', 'legal'),
('2028-05-01'::date, '근로자의 날', 'legal'),
('2028-05-02'::date, '부처님오신날', 'legal'),
('2028-05-05'::date, '어린이날', 'legal'),
('2028-06-06'::date, '현충일', 'legal'),
('2028-08-15'::date, '광복절', 'legal'),
('2028-10-02'::date, '추석 연휴', 'legal'),
('2028-10-03'::date, '추석', 'legal'),
('2028-10-04'::date, '추석 연휴', 'legal'),
('2028-10-05'::date, '대체공휴일(추석)', 'substitute'),
('2028-10-09'::date, '한글날', 'legal'),
('2028-12-25'::date, '기독탄신일', 'legal'),
('2029-01-01'::date, '신정', 'legal'),
('2029-02-12'::date, '설날 연휴', 'legal'),
('2029-02-13'::date, '설날', 'legal'),
('2029-02-14'::date, '설날 연휴', 'legal'),
('2029-03-01'::date, '삼일절', 'legal'),
('2029-05-01'::date, '근로자의 날', 'legal'),
('2029-05-05'::date, '어린이날', 'legal'),
('2029-05-20'::date, '부처님오신날', 'legal'),
('2029-06-06'::date, '현충일', 'legal'),
('2029-08-15'::date, '광복절', 'legal'),
('2029-09-21'::date, '추석 연휴', 'legal'),
('2029-09-22'::date, '추석', 'legal'),
('2029-09-23'::date, '추석 연휴', 'legal'),
('2029-10-03'::date, '개천절', 'legal'),
('2029-10-09'::date, '한글날', 'legal'),
('2029-12-25'::date, '기독탄신일', 'legal'),
('2030-01-01'::date, '신정', 'legal'),
('2030-02-02'::date, '설날 연휴', 'legal'),
('2030-02-03'::date, '설날', 'legal'),
('2030-02-04'::date, '설날 연휴', 'legal'),
('2030-03-01'::date, '삼일절', 'legal'),
('2030-05-01'::date, '근로자의 날', 'legal'),
('2030-05-05'::date, '어린이날', 'legal'),
('2030-05-09'::date, '부처님오신날', 'legal'),
('2030-06-06'::date, '현충일', 'legal'),
('2030-08-15'::date, '광복절', 'legal'),
('2030-09-11'::date, '추석 연휴', 'legal'),
('2030-09-12'::date, '추석', 'legal'),
('2030-09-13'::date, '추석 연휴', 'legal'),
('2030-10-03'::date, '개천절', 'legal'),
('2030-10-09'::date, '한글날', 'legal'),
('2030-12-25'::date, '기독탄신일', 'legal')
on conflict (holiday_date) do update set
  name = excluded.name,
  holiday_kind = excluded.holiday_kind;

insert into public.kr_public_holiday_coverage (calendar_year, source_version)
values
(2024, 'data/kr-public-holidays.json'),
(2025, 'data/kr-public-holidays.json'),
(2026, 'data/kr-public-holidays.json'),
(2027, 'data/kr-public-holidays.json'),
(2028, 'data/kr-public-holidays.json'),
(2029, 'data/kr-public-holidays.json'),
(2030, 'data/kr-public-holidays.json')
on conflict (calendar_year) do update set
  source_version = excluded.source_version,
  loaded_at = now();
