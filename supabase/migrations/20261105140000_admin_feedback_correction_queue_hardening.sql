-- Queue hardening: idempotent complete, lease check, bounded fail retries.
-- Apply after 20261105120000_admin_feedback_correction_queue.sql

create or replace function public.admin_feedback_correction_complete_job(
  p_job_id uuid,
  p_worker_id text,
  p_correction_draft jsonb
)
returns public.admin_feedback_correction_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_feedback_correction_jobs%rowtype;
  v_now timestamptz := now();
  v_worker text := left(coalesce(nullif(trim(p_worker_id), ''), 'worker'), 64);
begin
  select * into v_row
  from public.admin_feedback_correction_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;

  if v_row.status = 'completed' then
    return v_row;
  end if;

  if v_row.status <> 'processing' then
    raise exception 'JOB_NOT_PROCESSING';
  end if;

  if v_row.worker_id is distinct from v_worker then
    raise exception 'JOB_WORKER_MISMATCH';
  end if;

  if v_row.lease_until is not null and v_row.lease_until < v_now then
    raise exception 'JOB_LEASE_EXPIRED';
  end if;

  update public.admin_feedback_correction_jobs
  set status = 'completed',
      correction_draft = p_correction_draft,
      lease_until = null,
      completed_at = v_now,
      updated_at = v_now,
      error_code = null,
      error_detail = null
  where id = p_job_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_feedback_correction_fail_job(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_detail text default null,
  p_max_attempts integer default 3
)
returns public.admin_feedback_correction_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.admin_feedback_correction_jobs%rowtype;
  v_now timestamptz := now();
  v_code text := left(coalesce(nullif(trim(p_error_code), ''), 'worker_error'), 64);
  v_worker text := left(coalesce(nullif(trim(p_worker_id), ''), 'worker'), 64);
  v_max integer := greatest(1, least(coalesce(p_max_attempts, 3), 10));
begin
  select * into v_row
  from public.admin_feedback_correction_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;

  if v_row.status = 'failed' and v_row.error_code = 'max_attempts_exceeded' then
    return v_row;
  end if;

  if v_row.status = 'completed' then
    raise exception 'JOB_ALREADY_COMPLETED';
  end if;

  if v_row.status <> 'processing' then
    raise exception 'JOB_NOT_PROCESSING';
  end if;

  if v_row.worker_id is distinct from v_worker then
    raise exception 'JOB_WORKER_MISMATCH';
  end if;

  if v_row.attempt_count >= v_max then
    update public.admin_feedback_correction_jobs
    set status = 'failed',
        lease_until = null,
        completed_at = v_now,
        updated_at = v_now,
        error_code = 'max_attempts_exceeded',
        error_detail = left(coalesce(p_error_detail, ''), 2000)
    where id = p_job_id
    returning * into v_row;
    return v_row;
  end if;

  update public.admin_feedback_correction_jobs
  set status = 'pending',
      worker_id = null,
      lease_until = null,
      updated_at = v_now,
      error_code = v_code,
      error_detail = left(coalesce(p_error_detail, ''), 2000)
  where id = p_job_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_feedback_correction_complete_job(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_feedback_correction_fail_job(uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.admin_feedback_correction_complete_job(uuid, text, jsonb) to service_role;
grant execute on function public.admin_feedback_correction_fail_job(uuid, text, text, text, integer) to service_role;
