-- Internal refund review workflow (not PG execution).
-- Production history: 20261026163452_spokedu_master_refund_request_workflow (already applied — do not re-run on prod).
-- Local filename matches production migration version for history alignment.

create table if not exists public.spokedu_master_refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.spokedu_master_payment_orders(order_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  original_amount integer not null check (original_amount > 0),
  requested_amount integer not null check (requested_amount > 0 and requested_amount <= original_amount),
  refunded_amount_snapshot integer check (refunded_amount_snapshot is null or refunded_amount_snapshot >= 0),
  refund_type text not null check (refund_type in ('full', 'partial')),
  reason text not null check (length(btrim(reason)) between 1 and 1000),
  status text not null default 'received' check (status in (
    'received', 'under_review', 'approved', 'rejected',
    'follow_up_pending', 'completed', 'cancelled'
  )),
  pg_evidence_status text not null default 'unverified'
    check (pg_evidence_status in ('unverified', 'verified', 'unavailable', 'conflict')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  review_note text check (review_note is null or length(review_note) <= 2000),
  idempotency_key text not null check (length(idempotency_key) between 16 and 200),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  follow_up_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spm_refund_request_requester_approver_separation
    check (approved_by is null or approved_by <> requested_by),
  constraint spm_refund_request_full_amount
    check (refund_type <> 'full' or requested_amount = original_amount),
  constraint spm_refund_request_snapshot_not_overpaid
    check (refunded_amount_snapshot is null or refunded_amount_snapshot <= original_amount),
  constraint spm_refund_request_idempotency_unique unique (idempotency_key)
);

create index if not exists idx_spm_refund_requests_status_created
  on public.spokedu_master_refund_requests (status, created_at desc, id desc);

create index if not exists idx_spm_refund_requests_order
  on public.spokedu_master_refund_requests (order_id, created_at desc);

create index if not exists idx_spm_refund_requests_user
  on public.spokedu_master_refund_requests (user_id, created_at desc);

create unique index if not exists spm_refund_requests_open_duplicate_unique
  on public.spokedu_master_refund_requests (order_id, refund_type, requested_amount)
  where status in ('received', 'under_review', 'approved', 'follow_up_pending');

drop trigger if exists spm_refund_requests_updated_at on public.spokedu_master_refund_requests;
create trigger spm_refund_requests_updated_at
  before update on public.spokedu_master_refund_requests
  for each row execute function public._spm_sub_set_updated_at();

create table if not exists public.spokedu_master_refund_request_events (
  id uuid primary key default gen_random_uuid(),
  refund_request_id uuid not null references public.spokedu_master_refund_requests(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'review_started', 'approved', 'rejected',
    'follow_up_started', 'completed', 'cancelled', 'note_added', 'pg_attempt_failed'
  )),
  from_status text,
  to_status text not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  reason text check (reason is null or length(reason) <= 2000),
  provider_status text,
  provider_error_code text,
  provider_checked_at timestamptz,
  provider_refunded_amount integer check (provider_refunded_amount is null or provider_refunded_amount >= 0),
  created_at timestamptz not null default now(),
  constraint spm_refund_event_status_changed
    check (
      from_status is null
      or from_status <> to_status
      or event_type in ('note_added', 'pg_attempt_failed')
    ),
  constraint spm_refund_event_from_status_valid
    check (from_status is null or from_status in (
      'received', 'under_review', 'approved', 'rejected',
      'follow_up_pending', 'completed', 'cancelled'
    )),
  constraint spm_refund_event_to_status_valid
    check (to_status in (
      'received', 'under_review', 'approved', 'rejected',
      'follow_up_pending', 'completed', 'cancelled'
    )),
  constraint spm_refund_event_provider_status_length
    check (provider_status is null or length(provider_status) <= 100),
  constraint spm_refund_event_provider_error_length
    check (provider_error_code is null or length(provider_error_code) <= 200)
);

create index if not exists idx_spm_refund_request_events_request_time
  on public.spokedu_master_refund_request_events (refund_request_id, created_at desc, id desc);

create or replace function public._spm_refund_events_append_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'refund request events are append-only';
end;
$$;

revoke all on function public._spm_refund_events_append_only() from public, anon, authenticated;

drop trigger if exists spm_refund_request_events_append_only
  on public.spokedu_master_refund_request_events;
create trigger spm_refund_request_events_append_only
  before update or delete on public.spokedu_master_refund_request_events
  for each row execute function public._spm_refund_events_append_only();

alter table public.spokedu_master_refund_requests enable row level security;
alter table public.spokedu_master_refund_request_events enable row level security;

drop policy if exists spokedu_master_refund_requests_deny_all on public.spokedu_master_refund_requests;
create policy spokedu_master_refund_requests_deny_all
  on public.spokedu_master_refund_requests for all to anon, authenticated
  using (false) with check (false);

drop policy if exists spokedu_master_refund_request_events_deny_all on public.spokedu_master_refund_request_events;
create policy spokedu_master_refund_request_events_deny_all
  on public.spokedu_master_refund_request_events for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.spokedu_master_refund_requests from anon, authenticated;
revoke all on table public.spokedu_master_refund_request_events from anon, authenticated;

create or replace function public.spokedu_master_create_refund_request_v1(
  p_order_id text,
  p_user_id uuid,
  p_requested_amount integer,
  p_refund_type text,
  p_reason text,
  p_idempotency_key text,
  p_requested_by uuid,
  p_pg_evidence_status text default 'unverified',
  p_refunded_amount_snapshot integer default null
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_order public.spokedu_master_payment_orders%rowtype;
  v_id uuid;
begin
  if length(btrim(coalesce(p_reason, ''))) < 1 then
    raise exception using errcode = '22023', message = 'refund reason required';
  end if;
  if length(btrim(coalesce(p_idempotency_key, ''))) < 16 then
    raise exception using errcode = '22023', message = 'idempotency key required';
  end if;

  select * into v_order
  from public.spokedu_master_payment_orders
  where order_id = btrim(p_order_id);

  if not found then
    raise exception using errcode = 'P0002', message = 'order not found';
  end if;
  if v_order.user_id <> p_user_id then
    raise exception using errcode = '22023', message = 'order owner mismatch';
  end if;
  if p_requested_amount <= 0 or p_requested_amount > v_order.amount then
    raise exception using errcode = '22023', message = 'invalid requested amount';
  end if;
  if p_refund_type = 'full' and p_requested_amount <> v_order.amount then
    raise exception using errcode = '22023', message = 'full refund amount mismatch';
  end if;
  if p_refund_type not in ('full', 'partial') then
    raise exception using errcode = '22023', message = 'invalid refund type';
  end if;

  insert into public.spokedu_master_refund_requests (
    order_id, user_id, original_amount, requested_amount, refunded_amount_snapshot,
    refund_type, reason, status, pg_evidence_status, requested_by, idempotency_key
  ) values (
    v_order.order_id, p_user_id, v_order.amount, p_requested_amount, p_refunded_amount_snapshot,
    p_refund_type, btrim(p_reason), 'received', coalesce(p_pg_evidence_status, 'unverified'),
    p_requested_by, btrim(p_idempotency_key)
  )
  returning id into v_id;

  insert into public.spokedu_master_refund_request_events (
    refund_request_id, event_type, from_status, to_status, actor_id, reason
  ) values (
    v_id, 'created', null, 'received', p_requested_by, btrim(p_reason)
  );

  return v_id;
end;
$$;

create or replace function public.spokedu_master_transition_refund_request_v1(
  p_request_id uuid,
  p_actor_id uuid,
  p_action text,
  p_expected_status text,
  p_review_note text default null,
  p_provider_status text default null,
  p_provider_error_code text default null,
  p_provider_refunded_amount integer default null
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.spokedu_master_refund_requests%rowtype;
  v_from text;
  v_to text;
  v_event_type text;
  v_now timestamptz := now();
begin
  select * into v_row
  from public.spokedu_master_refund_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'refund request not found';
  end if;
  if v_row.status <> p_expected_status then
    raise exception using errcode = '40001', message = 'refund request status conflict';
  end if;

  v_from := v_row.status;

  if p_action = 'start_review' then
    if v_from not in ('received') then
      raise exception using errcode = '22023', message = 'invalid transition';
    end if;
    v_to := 'under_review';
    v_event_type := 'review_started';
    update public.spokedu_master_refund_requests
    set status = v_to, reviewed_by = p_actor_id, reviewed_at = v_now,
        review_note = coalesce(nullif(btrim(p_review_note), ''), review_note)
    where id = p_request_id;
  elsif p_action = 'approve' then
    if v_from not in ('received', 'under_review') then
      raise exception using errcode = '22023', message = 'invalid transition';
    end if;
    if v_row.requested_by = p_actor_id then
      raise exception using errcode = '22023', message = 'requester cannot approve';
    end if;
    v_to := 'approved';
    v_event_type := 'approved';
    update public.spokedu_master_refund_requests
    set status = v_to, approved_by = p_actor_id, approved_at = v_now,
        reviewed_by = coalesce(reviewed_by, p_actor_id),
        reviewed_at = coalesce(reviewed_at, v_now),
        review_note = coalesce(nullif(btrim(p_review_note), ''), review_note)
    where id = p_request_id;
  elsif p_action = 'reject' then
    if v_from not in ('received', 'under_review') then
      raise exception using errcode = '22023', message = 'invalid transition';
    end if;
    v_to := 'rejected';
    v_event_type := 'rejected';
    update public.spokedu_master_refund_requests
    set status = v_to, reviewed_by = p_actor_id, reviewed_at = v_now,
        review_note = coalesce(nullif(btrim(p_review_note), ''), review_note)
    where id = p_request_id;
  elsif p_action = 'cancel' then
    if v_from not in ('received', 'under_review') then
      raise exception using errcode = '22023', message = 'invalid transition';
    end if;
    v_to := 'cancelled';
    v_event_type := 'cancelled';
    update public.spokedu_master_refund_requests
    set status = v_to,
        review_note = coalesce(nullif(btrim(p_review_note), ''), review_note)
    where id = p_request_id;
  elsif p_action = 'add_note' then
    v_to := v_from;
    v_event_type := 'note_added';
    update public.spokedu_master_refund_requests
    set review_note = coalesce(nullif(btrim(p_review_note), ''), review_note),
        reviewed_by = coalesce(reviewed_by, p_actor_id),
        reviewed_at = coalesce(reviewed_at, v_now)
    where id = p_request_id;
  elsif p_action = 'mark_follow_up' then
    if v_from <> 'approved' then
      raise exception using errcode = '22023', message = 'invalid transition';
    end if;
    v_to := 'follow_up_pending';
    v_event_type := 'follow_up_started';
    update public.spokedu_master_refund_requests
    set status = v_to, follow_up_started_at = v_now
    where id = p_request_id;
  elsif p_action = 'complete' then
    if v_from <> 'follow_up_pending' then
      raise exception using errcode = '22023', message = 'invalid transition';
    end if;
    v_to := 'completed';
    v_event_type := 'completed';
    update public.spokedu_master_refund_requests
    set status = v_to, completed_at = v_now
    where id = p_request_id;
  elsif p_action = 'pg_attempt_failed' then
    v_to := v_from;
    v_event_type := 'pg_attempt_failed';
    update public.spokedu_master_refund_requests
    set pg_evidence_status = coalesce(pg_evidence_status, 'unverified')
    where id = p_request_id;
  else
    raise exception using errcode = '22023', message = 'unknown refund action';
  end if;

  insert into public.spokedu_master_refund_request_events (
    refund_request_id, event_type, from_status, to_status, actor_id, reason,
    provider_status, provider_error_code, provider_checked_at, provider_refunded_amount
  ) values (
    p_request_id, v_event_type, v_from, v_to, p_actor_id, nullif(btrim(p_review_note), ''),
    nullif(btrim(p_provider_status), ''), nullif(btrim(p_provider_error_code), ''),
    case when p_provider_status is not null or p_provider_error_code is not null then v_now else null end,
    p_provider_refunded_amount
  );

  return p_request_id;
end;
$$;

revoke all on function public.spokedu_master_create_refund_request_v1(text, uuid, integer, text, text, text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.spokedu_master_transition_refund_request_v1(uuid, uuid, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.spokedu_master_create_refund_request_v1(text, uuid, integer, text, text, text, uuid, text, integer) to service_role;
grant execute on function public.spokedu_master_transition_refund_request_v1(uuid, uuid, text, text, text, text, text, integer) to service_role;

comment on table public.spokedu_master_refund_requests is
  'Internal refund review workflow. approved does not mean the PG refund completed.';
comment on table public.spokedu_master_refund_request_events is
  'Append-only workflow events with explicit non-secret provider evidence columns.';
