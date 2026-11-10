-- Authorized incident repair: preserve the exact Kim Se-hyeon original and
-- detach only the confirmed stale plan from Cho Seung-je's Nov 10 session.
-- No rewriting of historical content, teacher names, dates or session schedules.
begin;
do $$
declare
  s public.sessions%rowtype; lp public.lesson_plans%rowtype;
  evidence jsonb; span integer[]; ghost_memo text;
begin
  select * into strict s from public.sessions where id = '99464371-9d6a-442f-98ac-6624171bbbc3' for update;
  if s.created_by <> '11812c0f-915b-4034-965d-a4eed6314d48'
    or s.start_at <> '2026-11-10T10:00:00Z'::timestamptz or s.status <> 'opened' then
    raise exception 'REPAIR_SESSION_CHANGED';
  end if;
  select * into lp from public.lesson_plans where session_id = s.id for update;
  if not found then
    if exists (select 1 from private.lesson_plan_schedule_history
      where session_id = s.id and reason = 'legacy_postpone_assignment_mismatch'
        and lesson_plan_snapshot->>'id' = '46d12f87-85a2-4de9-8357-972197b7a8a1') then return; end if;
    raise exception 'REPAIR_PLAN_MISSING_WITHOUT_ARCHIVE';
  end if;
  if lp.id <> '46d12f87-85a2-4de9-8357-972197b7a8a1'
    or lp.updated_at is distinct from '2026-10-15T14:33:21.612Z'::timestamptz
    or public.lesson_plan_header_day(lp.content) is distinct from date '2026-10-16'
    or position('강사명 : 김세현' in lp.content) = 0 then
    raise exception 'REPAIR_PLAN_CHANGED';
  end if;
  select memo into strict ghost_memo from public.sessions
    where id = '613d24ab-1038-4dd3-a8ba-0587dd4679db' and group_id = s.group_id;
  span := private.classops_metadata_span(ghost_memo, 'POSTPONE_SNAPSHOT:');
  select item into strict evidence
    from jsonb_array_elements(substring(ghost_memo from span[1] for span[2]-span[1]+1)::jsonb) item
    where item->>'id' = s.id::text;
  if (evidence->>'oldCreatedBy')::uuid <> 'dd379048-e6b7-43dc-a38c-5e58a8e8b739'
    or (evidence->>'shiftedCreatedBy')::uuid <> s.created_by
    or (evidence->>'shiftedStartAt')::timestamptz <> s.start_at then
    raise exception 'REPAIR_EVIDENCE_CHANGED';
  end if;
  insert into private.lesson_plan_schedule_history
    (session_id, teacher_id, session_start_at, session_end_at, session_snapshot, lesson_plan_snapshot, reason)
  values (s.id, (evidence->>'oldCreatedBy')::uuid,
    (evidence->>'oldStartAt')::timestamptz, (evidence->>'oldEndAt')::timestamptz,
    to_jsonb(s) || jsonb_build_object('created_by', evidence->'oldCreatedBy',
      'start_at', evidence->'oldStartAt', 'end_at', evidence->'oldEndAt',
      'repair_evidence', evidence, 'observed_session', to_jsonb(s)),
    to_jsonb(lp), 'legacy_postpone_assignment_mismatch');
  delete from public.lesson_plans where id = lp.id and session_id = s.id;
end; $$;
commit;
select s.id, s.start_at, u.name as teacher,
  (select count(*) from public.lesson_plans lp where lp.session_id=s.id) as current_plan_count,
  (select count(*) from private.lesson_plan_schedule_history h where h.session_id=s.id
    and h.reason='legacy_postpone_assignment_mismatch'
    and h.lesson_plan_snapshot->>'id'='46d12f87-85a2-4de9-8357-972197b7a8a1') as preserved_original_count
from public.sessions s join public.users u on u.id=s.created_by
where s.id='99464371-9d6a-442f-98ac-6624171bbbc3';
