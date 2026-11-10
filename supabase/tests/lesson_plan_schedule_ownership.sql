-- Rollback-only integration checks against the real functions/triggers/RLS.
-- Synthetic sessions are isolated by a random group and a far-future schedule.
begin;
do $$
declare
  a uuid; b uuid; g uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); s3 uuid := gen_random_uuid();
  base public.sessions%rowtype; row_to_insert public.sessions%rowtype;
  first_at timestamptz := (date_trunc('week', timestamp '2097-01-01') + interval '1 day 10 hours') at time zone 'UTC';
  old_plan uuid; second_plan uuid; new_plan uuid; ghost uuid; result jsonb;
  old_content text; second_content text; message text; history_count integer;
begin
  select id into strict a from public.users where name = '조승제';
  select id into strict b from public.users where name = '김세현';
  select * into strict base from public.sessions where created_by = a and status = 'opened' order by start_at limit 1;
  for i in 1..3 loop
    row_to_insert := jsonb_populate_record(base, jsonb_build_object(
      'id', case i when 1 then s1 when 2 then s2 else s3 end,
      'title', 'lesson plan integration fixture ' || g::text, 'group_id', g,
      'short_code', null, 'status', 'opened', 'created_by', case i when 2 then b else a end,
      'teacher_id', null, 'memo', 'EXTRA_TEACHERS:[]', 'mileage_option', '',
      'students_text', null, 'feedback_fields', '{}'::jsonb, 'completion_status', '{}'::jsonb,
      'photo_url', '[]'::jsonb, 'file_url', '[]'::jsonb,
      'start_at', first_at + case i when 1 then interval '0 days' when 2 then interval '3 days' else interval '7 days' end,
      'end_at', first_at + case i when 1 then interval '1 hour' when 2 then interval '3 days 1 hour' else interval '7 days 1 hour' end,
      'price', 31000, 'round_index', i, 'round_total', 3, 'sequence_number', i, 'round_display', i::text || '/3'
    ));
    insert into public.sessions select (row_to_insert).*;
  end loop;
  old_content := to_char(first_at at time zone 'Asia/Seoul', 'YYYY.MM.DD') || '.(화요일) 19:00 ~ 20:00 - 1회차' || E'\n강사명 : 조승제\n원본 A';
  second_content := to_char((first_at + interval '3 days') at time zone 'Asia/Seoul', 'YYYY.MM.DD') || '.(금요일) 19:00 ~ 20:00 - 2회차' || E'\n강사명 : 김세현\n원본 B';
  result := public.teacher_write_lesson_plan(s1, a, null, old_content, 'save');
  old_plan := (result->>'lessonPlanId')::uuid;
  result := public.teacher_write_lesson_plan(s2, b, null, second_content, 'save');
  second_plan := (result->>'lessonPlanId')::uuid;

  -- Exercise the actual Tue/Fri cascade, not just a standalone UPDATE.
  result := public.admin_apply_class_postpone(s1, 'postpone', first_at, gen_random_uuid());
  ghost := (result->>'sessionId')::uuid;
  if not exists (select 1 from public.sessions where id = s1 and created_by = b and start_at = first_at + interval '3 days') then raise exception 'cascade did not follow destination teacher'; end if;
  if exists (select 1 from public.lesson_plans where session_id in (s1,s2,s3)) then raise exception 'old plans followed a different teacher/day'; end if;
  if (select count(*) from private.lesson_plan_schedule_history where session_id in (s1,s2)) <> 2 then raise exception 'original plans were not preserved'; end if;
  if not exists (select 1 from private.lesson_plan_schedule_history where lesson_plan_snapshot->>'id' = old_plan::text and lesson_plan_snapshot->>'content' = old_content and teacher_id = a) then raise exception 'author or original content changed'; end if;

  begin
    perform public.teacher_write_lesson_plan(s1, a, old_plan, old_content, 'save');
    raise exception 'stale author unexpectedly saved';
  exception when insufficient_privilege then null; end;
  begin
    perform public.teacher_write_lesson_plan(s1, b, old_plan, second_content, 'save');
    raise exception 'detached plan unexpectedly saved';
  exception when serialization_failure then null; end;

  -- New assigned teacher can create a fresh plan with the correct day, no mismatch.
  result := public.teacher_write_lesson_plan(s1, b, null, second_content || ' new', 'save');
  new_plan := (result->>'lessonPlanId')::uuid;
  if new_plan is null then raise exception 'fresh teacher could not save'; end if;
  begin
    perform public.teacher_write_lesson_plan(s1, b, new_plan, old_content, 'save');
    raise exception 'wrong date unexpectedly saved';
  exception when check_violation then get stacked diagnostics message = message_text;
    if message <> 'LESSON_PLAN_DATE_MISMATCH' then raise; end if;
  end;
  if exists (select 1 from public.teacher_read_lesson_plan_history(s1,b) where content = old_content) then raise exception 'other author archive leaked'; end if;

  -- Undo archives the new teacher's work, then restores the exact original IDs.
  perform public.admin_apply_class_postpone(ghost, 'undo', first_at, gen_random_uuid());
  if not exists (select 1 from public.lesson_plans where id = old_plan and session_id = s1 and content = old_content) then raise exception 'undo did not restore original A'; end if;
  if not exists (select 1 from public.lesson_plans where id = second_plan and session_id = s2 and content = second_content) then raise exception 'undo did not restore original B'; end if;
  if not exists (select 1 from private.lesson_plan_schedule_history where lesson_plan_snapshot->>'id' = new_plan::text and teacher_id = b) then raise exception 'undo lost replacement teacher plan'; end if;

  -- Time/fee-only edits keep the current plan. A date move by the same teacher
  -- preserves the original and starts blank; exact return restores it.
  select count(*) into history_count from private.lesson_plan_schedule_history where session_id = s1;
  update public.sessions set price = price + 1, end_at = end_at + interval '5 minutes' where id = s1;
  if not exists (select 1 from public.lesson_plans where id = old_plan) then raise exception 'fee/time edit detached plan'; end if;
  update public.sessions set end_at = end_at - interval '5 minutes' where id = s1;
  update public.sessions set start_at = start_at + interval '14 days', end_at = end_at + interval '14 days' where id = s1;
  if exists (select 1 from public.lesson_plans where session_id = s1) then raise exception 'same author plan retained stale date'; end if;
  update public.sessions set start_at = start_at - interval '14 days', end_at = end_at - interval '14 days' where id = s1;
  if not exists (select 1 from public.lesson_plans where id = old_plan) then raise exception 'same author return lost plan'; end if;

  -- A same-day reassignment must detach too: date-only validation cannot catch it.
  update public.sessions set created_by = b where id = s1;
  if exists (select 1 from public.lesson_plans where session_id = s1) then raise exception 'same-day teacher swap exposed original'; end if;
  update public.sessions set created_by = a where id = s1;
  if not exists (select 1 from public.lesson_plans where id = old_plan) then raise exception 'same-day teacher return lost original'; end if;

  -- A later guard rejecting an edit must roll back archive side effects as well.
  select count(*) into history_count from private.lesson_plan_schedule_history where session_id = s1;
  begin
    update public.sessions set start_at = start_at + interval '14 days', end_at = end_at + interval '14 days',
      feedback_fields = '{"today":"must remain blocked on future sessions"}'::jsonb where id = s1;
    raise exception 'future feedback guard was bypassed';
  exception when check_violation then get stacked diagnostics message = message_text;
    if message <> 'SESSION_FUTURE_FEEDBACK_FORBIDDEN' then raise; end if;
  end;
  if not exists (select 1 from public.lesson_plans where id = old_plan)
    or (select count(*) from private.lesson_plan_schedule_history where session_id = s1) <> history_count then
    raise exception 'rejected schedule edit leaked archive changes';
  end if;

  if has_function_privilege('anon','public.teacher_write_lesson_plan(uuid,uuid,uuid,text,text)','execute')
    or has_function_privilege('authenticated','public.teacher_write_lesson_plan(uuid,uuid,uuid,text,text)','execute')
    or has_function_privilege('authenticated','public.teacher_read_lesson_plan_history(uuid,uuid)','execute')
    or has_table_privilege('authenticated','private.lesson_plan_schedule_history','select') then
    raise exception 'privileged RPC/archive exposed';
  end if;
end; $$;
rollback;
select 'PASS: Tue/Fri cascade, fresh save, stale author/plan rejection, date guard, archive isolation, undo, same-author move, same-day teacher swap, rejected edit rollback, fees, RPC privileges; all fixtures rolled back' as result;
