-- Admin feedback AI correction queue (Pull worker via Next.js — no service_role on n8n).
-- Does not write to public.sessions until a human uses existing save APIs.

create table if not exists public.admin_feedback_correction_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  idempotency_key text not null,
  input_snapshot jsonb not null,
  correction_draft jsonb,
  worker_id text,
  lease_until timestamptz,
  attempt_count integer not null default 0,
  error_code text,
  error_detail text,
  requested_by uuid references auth.users (id),
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint admin_feedback_correction_jobs_idempotency_key_unique unique (idempotency_key)
);

create index if not exists idx_admin_feedback_correction_jobs_session_created
  on public.admin_feedback_correction_jobs (session_id, created_at desc);

create index if not exists idx_admin_feedback_correction_jobs_status_lease
  on public.admin_feedback_correction_jobs (status, lease_until)
  where status in ('pending', 'processing');

create unique index if not exists idx_admin_feedback_correction_jobs_one_active_per_session
  on public.admin_feedback_correction_jobs (session_id)
  where status in ('pending', 'processing');

alter table public.admin_feedback_correction_jobs enable row level security;

drop policy if exists admin_feedback_correction_jobs_deny_all on public.admin_feedback_correction_jobs;
create policy admin_feedback_correction_jobs_deny_all
  on public.admin_feedback_correction_jobs
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.admin_feedback_correction_jobs from anon, authenticated;
grant select, insert, update on public.admin_feedback_correction_jobs to service_role;

create or replace function public.admin_feedback_correction_requeue_stale(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.admin_feedback_correction_jobs
  set status = 'pending',
      worker_id = null,
      lease_until = null,
      updated_at = p_now
  where status = 'processing'
    and lease_until is not null
    and lease_until < p_now;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.admin_feedback_correction_claim_jobs(
  p_worker_id text,
  p_limit integer default 5,
  p_lease_seconds integer default 900
)
returns setof public.admin_feedback_correction_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 20));
  v_lease interval := make_interval(secs => greatest(60, least(coalesce(p_lease_seconds, 900), 3600)));
begin
  perform public.admin_feedback_correction_requeue_stale(v_now);

  return query
  with picked as (
    select j.id
    from public.admin_feedback_correction_jobs j
    where j.status = 'pending'
    order by j.created_at asc
    for update skip locked
    limit v_limit
  )
  update public.admin_feedback_correction_jobs j
  set status = 'processing',
      worker_id = left(coalesce(nullif(trim(p_worker_id), ''), 'worker'), 64),
      lease_until = v_now + v_lease,
      attempt_count = j.attempt_count + 1,
      started_at = coalesce(j.started_at, v_now),
      updated_at = v_now,
      error_code = null,
      error_detail = null
  from picked
  where j.id = picked.id
  returning j.*;
end;
$$;

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
begin
  select * into v_row
  from public.admin_feedback_correction_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;

  if v_row.status <> 'processing' then
    raise exception 'JOB_NOT_PROCESSING';
  end if;

  if v_row.worker_id is distinct from left(coalesce(nullif(trim(p_worker_id), ''), 'worker'), 64) then
    raise exception 'JOB_WORKER_MISMATCH';
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
  p_error_detail text default null
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
begin
  select * into v_row
  from public.admin_feedback_correction_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;

  if v_row.status <> 'processing' then
    raise exception 'JOB_NOT_PROCESSING';
  end if;

  if v_row.worker_id is distinct from left(coalesce(nullif(trim(p_worker_id), ''), 'worker'), 64) then
    raise exception 'JOB_WORKER_MISMATCH';
  end if;

  update public.admin_feedback_correction_jobs
  set status = 'failed',
      lease_until = null,
      completed_at = v_now,
      updated_at = v_now,
      error_code = v_code,
      error_detail = left(coalesce(p_error_detail, ''), 2000)
  where id = p_job_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_feedback_correction_requeue_stale(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_feedback_correction_claim_jobs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_feedback_correction_complete_job(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_feedback_correction_fail_job(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.admin_feedback_correction_requeue_stale(timestamptz) to service_role;
grant execute on function public.admin_feedback_correction_claim_jobs(text, integer, integer) to service_role;
grant execute on function public.admin_feedback_correction_complete_job(uuid, text, jsonb) to service_role;
grant execute on function public.admin_feedback_correction_fail_job(uuid, text, text, text) to service_role;
