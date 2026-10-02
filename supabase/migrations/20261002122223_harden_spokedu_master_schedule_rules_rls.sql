-- Defense in depth for the server-only recurring schedule rule store.
-- Application access remains service_role via capability-checked Next.js APIs.

alter table public.spokedu_master_class_schedule_rules
  enable row level security;

revoke all on table public.spokedu_master_class_schedule_rules from public, anon, authenticated;
grant all on table public.spokedu_master_class_schedule_rules to service_role;

alter function public.spokedu_master_materialize_schedule_rule(uuid, uuid, uuid, jsonb)
  set search_path = pg_catalog, public;

alter function public.spokedu_master_materialize_schedule_rule_with_activities(uuid, uuid, uuid, jsonb, text, jsonb)
  set search_path = pg_catalog, public;

revoke all on function public.spokedu_master_materialize_schedule_rule(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.spokedu_master_materialize_schedule_rule_with_activities(uuid, uuid, uuid, jsonb, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.spokedu_master_materialize_schedule_rule(uuid, uuid, uuid, jsonb)
  to service_role;
grant execute on function public.spokedu_master_materialize_schedule_rule_with_activities(uuid, uuid, uuid, jsonb, text, jsonb)
  to service_role;
