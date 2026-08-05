-- Structured Lead Operations: consultations 운영 컬럼 + dispatch mirror 연결

alter table public.consultations
  add column if not exists lead_route text,
  add column if not exists lead_context jsonb,
  add column if not exists curriculum_mode text,
  add column if not exists private_start_direction text,
  add column if not exists private_preferred_format text,
  add column if not exists source_lead_id uuid,
  add column if not exists conversion_evidence_slug text;

comment on column public.consultations.lead_route is
  'private | curriculum | dispatch | other — admin 필터 SSOT';
comment on column public.consultations.lead_context is
  'LeadEnvelope immutable snapshot (제출 시점). 필터 SSOT는 전용 컬럼.';
comment on column public.consultations.source_lead_id is
  'dispatch_leads.id 등 경로별 canonical lead 참조';

create index if not exists consultations_lead_route_created_idx
  on public.consultations (lead_route, created_at desc);

create index if not exists consultations_curriculum_mode_idx
  on public.consultations (curriculum_mode)
  where curriculum_mode is not null;

create index if not exists consultations_private_direction_idx
  on public.consultations (private_start_direction)
  where private_start_direction is not null;

create index if not exists consultations_source_lead_id_idx
  on public.consultations (source_lead_id)
  where source_lead_id is not null;

-- 기존 데이터 1회 backfill (런타임 파싱 금지 — 마이그레이션만)
update public.consultations
set lead_route = 'private'
where lead_route is null
  and consult_type = 'tutoring';

update public.consultations
set lead_route = 'curriculum'
where lead_route is null
  and content like '%[커리큘럼%문의]%';

update public.consultations
set lead_route = 'dispatch'
where lead_route is null
  and content like '%[기관 맞춤 제안서 요청]%';

update public.consultations
set lead_route = 'other'
where lead_route is null;

-- 문자열에서 모드/방향 힌트 복원 (있을 때만)
update public.consultations
set curriculum_mode = 'package'
where lead_route = 'curriculum'
  and curriculum_mode is null
  and (content like '%lead_mode: package%' or content like '%[커리큘럼 도입 모드] package%');

update public.consultations
set curriculum_mode = 'training'
where lead_route = 'curriculum'
  and curriculum_mode is null
  and (content like '%lead_mode: training%' or content like '%[커리큘럼 도입 모드] training%');

update public.consultations
set curriculum_mode = 'master'
where lead_route = 'curriculum'
  and curriculum_mode is null
  and (content like '%lead_mode: master%' or content like '%[커리큘럼 도입 모드] master%');

update public.consultations
set curriculum_mode = 'license'
where lead_route = 'curriculum'
  and curriculum_mode is null
  and (content like '%lead_mode: license%' or content like '%[커리큘럼 도입 모드] license%');

update public.consultations
set private_start_direction = 'confidence'
where lead_route = 'private'
  and private_start_direction is null
  and content like '%[start_direction] confidence%';

update public.consultations
set private_start_direction = 'fundamental'
where lead_route = 'private'
  and private_start_direction is null
  and content like '%[start_direction] fundamental%';

update public.consultations
set private_start_direction = 'sport-prep'
where lead_route = 'private'
  and private_start_direction is null
  and content like '%[start_direction] sport-prep%';

update public.consultations
set private_start_direction = 'peer-group'
where lead_route = 'private'
  and private_start_direction is null
  and content like '%[start_direction] peer-group%';

update public.consultations
set private_preferred_format = 'one-to-one'
where lead_route = 'private'
  and private_preferred_format is null
  and content like '%[preferred_format] one-to-one%';

update public.consultations
set private_preferred_format = 'small-group'
where lead_route = 'private'
  and private_preferred_format is null
  and content like '%[preferred_format] small-group%';

update public.consultations
set private_preferred_format = 'undecided'
where lead_route = 'private'
  and private_preferred_format is null
  and content like '%[preferred_format] undecided%';

-- Dispatch mirror 상태 (본체는 dispatch_leads, consultations는 요약)
alter table public.dispatch_leads
  add column if not exists mirror_status text not null default 'pending',
  add column if not exists mirror_consult_id uuid,
  add column if not exists mirror_error text;

comment on column public.dispatch_leads.mirror_status is
  'pending | synced | failed — consultations 미러 상태';

create index if not exists dispatch_leads_mirror_status_idx
  on public.dispatch_leads (mirror_status)
  where mirror_status <> 'synced';

-- 퍼널 이벤트 (PII 금지)
create table if not exists public.commercial_funnel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  route text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists commercial_funnel_events_created_idx
  on public.commercial_funnel_events (created_at desc);

create index if not exists commercial_funnel_events_name_route_idx
  on public.commercial_funnel_events (name, route, created_at desc);

alter table public.commercial_funnel_events enable row level security;

drop policy if exists commercial_funnel_events_service_role_all on public.commercial_funnel_events;
-- service_role bypasses RLS; deny anon/authenticated direct access by having no public policies
