-- Phase 2B-2 approval-pending draft. This file is intentionally outside supabase/migrations.
-- Do not convert it into a migration or apply it until refund policy and approver roles are approved.
-- This schema records internal review workflow; it never proves that Toss completed a refund.

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
    'follow_up_started', 'completed', 'cancelled', 'note_added'
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
    check (from_status is null or from_status <> to_status),
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

comment on table public.spokedu_master_refund_requests is
  'Draft internal refund review workflow. approved does not mean the PG refund completed.';
comment on column public.spokedu_master_refund_requests.refunded_amount_snapshot is
  'Nullable snapshot only; null means PG-confirmed refunded total is unavailable.';
comment on table public.spokedu_master_refund_request_events is
  'Append-only workflow events with explicit non-secret provider evidence columns.';
