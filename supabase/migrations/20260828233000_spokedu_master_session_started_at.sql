alter table public.spokedu_master_sessions
  add column if not exists started_at timestamptz null;

comment on column public.spokedu_master_sessions.started_at is
  'First time the teacher explicitly started the session; not a lifecycle status.';
