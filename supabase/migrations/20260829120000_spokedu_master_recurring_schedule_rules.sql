-- Additive recurring planning metadata. Sessions remain the canonical occurrence/history.
create table if not exists public.spokedu_master_class_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  class_id uuid not null references public.spokedu_master_classes(id) on delete restrict,
  cadence text not null default 'weekly' check (cadence in ('weekly','biweekly')),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  starts_on date not null,
  ends_on date,
  occurrence_limit integer check (occurrence_limit between 1 and 52),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on),
  check (ends_on is not null or occurrence_limit is not null)
);

create index if not exists spokedu_master_schedule_rules_owner_class_idx
  on public.spokedu_master_class_schedule_rules(owner_id, class_id) where active;

alter table public.spokedu_master_sessions
  add column if not exists schedule_rule_id uuid references public.spokedu_master_class_schedule_rules(id) on delete set null;
create index if not exists spokedu_master_sessions_schedule_rule_idx
  on public.spokedu_master_sessions(schedule_rule_id) where schedule_rule_id is not null;

create or replace function public.spokedu_master_materialize_schedule_rule(
  p_owner_id uuid,
  p_class_id uuid,
  p_rule_id uuid,
  p_occurrences jsonb
) returns table(session_id uuid, start_at timestamptz, created boolean)
language plpgsql security definer set search_path=public as $$
declare
  v_rule public.spokedu_master_class_schedule_rules%rowtype;
  v_class_name text;
  v_item jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
begin
  select * into v_rule from public.spokedu_master_class_schedule_rules
    where id=p_rule_id and owner_id=p_owner_id and class_id=p_class_id and active for update;
  if not found then raise exception 'schedule rule not found' using errcode='22023'; end if;
  select name into v_class_name from public.spokedu_master_classes
    where id=p_class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception 'class not found' using errcode='22023'; end if;
  if jsonb_typeof(p_occurrences) <> 'array' or jsonb_array_length(p_occurrences) not between 1 and 12 then
    raise exception 'invalid occurrences' using errcode='22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_occurrences) loop
    v_start := (v_item->>'startAt')::timestamptz;
    v_end := (v_item->>'endAt')::timestamptz;
    if v_end <= v_start then raise exception 'invalid occurrence time' using errcode='22023'; end if;
    select id into v_id from public.spokedu_master_sessions
      where owner_id=p_owner_id and class_id=p_class_id and deleted_at is null
        and status <> 'cancelled' and start_at < v_end and end_at > v_start
      order by start_at limit 1;
    if v_id is not null then
      session_id := v_id; start_at := v_start; created := false; return next;
    else
      insert into public.spokedu_master_sessions(owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at,schedule_rule_id)
      values(p_owner_id,p_class_id,v_class_name,v_start,v_end,'scheduled',null,null,p_rule_id)
      returning id into v_id;
      session_id := v_id; start_at := v_start; created := true; return next;
    end if;
    v_id := null;
  end loop;
end $$;

revoke all on table public.spokedu_master_class_schedule_rules from public,anon,authenticated;
grant all on table public.spokedu_master_class_schedule_rules to service_role;
revoke all on function public.spokedu_master_materialize_schedule_rule(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_materialize_schedule_rule(uuid,uuid,uuid,jsonb) to service_role;
