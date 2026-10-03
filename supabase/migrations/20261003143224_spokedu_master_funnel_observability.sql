-- Minimal MASTER funnel observability on the existing privacy-safe event sink.
-- Public landing visits remain aggregate-only; authenticated product events
-- receive a server-derived user id. No historical rows are backfilled.

alter table public.commercial_funnel_events
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists event_key text;

create unique index if not exists commercial_funnel_events_event_key_unique
  on public.commercial_funnel_events (event_key)
  where event_key is not null;

create index if not exists commercial_funnel_events_master_user_idx
  on public.commercial_funnel_events (route, name, user_id, created_at desc)
  where route = 'master';

comment on column public.commercial_funnel_events.user_id is
  'Server-derived authenticated user id for MASTER product events; null for public aggregate events.';
comment on column public.commercial_funnel_events.event_key is
  'Optional server-derived idempotency key. Never supplied by the public client.';
