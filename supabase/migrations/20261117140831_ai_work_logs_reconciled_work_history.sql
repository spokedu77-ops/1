-- Exact statement recovered from the already applied production migration.
-- Do not apply again to mwgvserdyflsqyhcqecp or repair migration history.
create table if not exists public.ai_work_logs (
  id uuid primary key default gen_random_uuid(),
  work_key text not null,
  project text not null,
  summary text not null,
  status text not null default 'reported',
  source_type text not null default 'manual',
  source_url text,
  details text,
  verification_note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  constraint ai_work_logs_work_key_length check (char_length(btrim(work_key)) between 1 and 160),
  constraint ai_work_logs_project_length check (char_length(btrim(project)) between 1 and 80),
  constraint ai_work_logs_summary_length check (char_length(btrim(summary)) between 1 and 300),
  constraint ai_work_logs_status_valid check (status in ('proposed','approved','in_progress','reported','verified','blocked')),
  constraint ai_work_logs_source_valid check (source_type in ('manual','chatgpt','codex','github','other')),
  constraint ai_work_logs_source_url_length check (source_url is null or char_length(source_url) <= 2048),
  constraint ai_work_logs_verified_requires_evidence check (status <> 'verified' or nullif(btrim(verification_note), '') is not null),
  constraint ai_work_logs_same_state_summary_unique unique (work_key, status, summary)
);
create index if not exists ai_work_logs_recent_idx on public.ai_work_logs (occurred_at desc, id desc);
create index if not exists ai_work_logs_project_status_idx on public.ai_work_logs (project, status, occurred_at desc);
create index if not exists ai_work_logs_work_key_recent_idx on public.ai_work_logs (work_key, occurred_at desc, id desc);
alter table public.ai_work_logs enable row level security;
revoke all on table public.ai_work_logs from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_work_logs to service_role;
comment on table public.ai_work_logs is 'Admin-only AI work log, multiple status events per work_key. Reported does not mean verified. Client roles have no access.';
