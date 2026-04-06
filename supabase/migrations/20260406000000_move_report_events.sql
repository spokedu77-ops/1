-- MOVE report funnel events
create table if not exists public.move_report_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  session_id text not null,
  share_key text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_move_report_events_created_at on public.move_report_events (created_at desc);
create index if not exists idx_move_report_events_event_name on public.move_report_events (event_name);
create index if not exists idx_move_report_events_share_key on public.move_report_events (share_key);
create index if not exists idx_move_report_events_session_id on public.move_report_events (session_id);

alter table public.move_report_events enable row level security;

drop policy if exists "move_report_events_insert_anon" on public.move_report_events;
create policy "move_report_events_insert_anon"
on public.move_report_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "move_report_events_select_auth" on public.move_report_events;
create policy "move_report_events_select_auth"
on public.move_report_events
for select
to authenticated
using (true);

