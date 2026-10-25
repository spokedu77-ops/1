-- 수업연동 로그 삭제(취소) 시 adjustment reverse 가 막히지 않도록 단일 취소 RPC 로 위임.
-- (구 UI 가 /api/admin/mileage/adjustment reverse 만 호출하는 경우 대비)

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
    if v_saved.operation = 'manual-adjustment' and v_saved.payload_hash = v_payload_hash then
      return v_saved.result || jsonb_build_object('replayed', true);
    end if;
    if v_saved.operation in ('mileage-cancel-single', 'mileage-cancel-session') then
      return v_saved.result || jsonb_build_object('replayed', true, 'delegatedFrom', 'manual-adjustment');
    end if;
    raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
  end if;

  if p_reverse_log_id is not null then
    select * into v_log from public.mileage_logs where id = p_reverse_log_id for update;
    if not found or v_log.teacher_id is distinct from p_teacher_id
      or v_log.amount is distinct from p_expected_log_amount
      or v_log.reason is distinct from p_expected_log_reason then
      raise exception using errcode = '40001', message = 'MILEAGE_LOG_STALE';
    end if;
    if v_log.reason like '[수업연동]%' or v_log.reason like '[수업연동/보조]%' then
      return public.admin_cancel_mileage_log(
        p_teacher_id,
        p_reverse_log_id,
        p_expected_log_amount,
        p_expected_log_reason,
        p_request_key
      );
    end if;
  end if;

  select points into v_points from public.users where id = p_teacher_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'MILEAGE_TEACHER_NOT_FOUND'; end if;

  select * into v_saved from private.phase2_mileage_request_results where request_key = p_request_key;
  if found then
    if v_saved.operation = 'manual-adjustment' and v_saved.payload_hash = v_payload_hash then
      return v_saved.result || jsonb_build_object('replayed', true);
    end if;
    raise exception using errcode = '23505', message = 'MILEAGE_IDEMPOTENCY_CONFLICT';
  end if;

  if p_reverse_log_id is not null then
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
