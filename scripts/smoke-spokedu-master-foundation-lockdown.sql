-- Destructive-looking Foundation smoke that is always rolled back.
-- Run with an administrative connection against the intended target.
begin;

do $$
declare
  v_owner uuid;
  v_other_owner uuid := gen_random_uuid();
  v_class_a uuid;
  v_class_b uuid;
  v_student uuid;
  v_session uuid;
  v_class_change_session uuid;
  v_next_empty uuid;
  v_next_copy uuid;
  v_activity_a uuid;
  v_activity_b uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_class_name text;
  v_student_name text;
  v_count integer;
  v_blocked boolean;
begin
  select owner_id into v_owner
  from public.spokedu_master_classes
  where deleted_at is null
  order by created_at
  limit 1;
  if v_owner is null then
    raise exception 'Smoke requires at least one active owner fixture.';
  end if;

  insert into public.spokedu_master_classes(owner_id, name)
  values (v_owner, 'foundation-a-' || v_suffix) returning id into v_class_a;
  insert into public.spokedu_master_classes(owner_id, name)
  values (v_owner, 'foundation-b-' || v_suffix) returning id into v_class_b;

  -- A. Student and multiple memberships are one operation.
  v_student := public.spokedu_master_save_student(
    v_owner, null, 'foundation-' || v_suffix, 'foundation-student-' || v_suffix,
    '{}'::jsonb, null, array[v_class_a, v_class_b]
  );
  select count(*) into v_count from public.spokedu_master_class_students
  where owner_id=v_owner and student_id=v_student and class_id in (v_class_a, v_class_b);
  if v_count <> 2 then raise exception 'A: transactional multiple membership failed'; end if;

  -- B. Invalid membership rejects the whole Student create.
  v_blocked := false;
  begin
    perform public.spokedu_master_save_student(
      v_owner, null, 'invalid-' || v_suffix, 'must-rollback-' || v_suffix,
      '{}'::jsonb, null, array[v_class_a, gen_random_uuid()]
    );
  exception when sqlstate '22023' then v_blocked := true;
  end;
  if not v_blocked or exists (
    select 1 from public.spokedu_master_students where owner_id=v_owner and legacy_id='invalid-' || v_suffix
  ) then raise exception 'B: invalid membership did not roll back Student create'; end if;

  -- D. Attendance, activity progress, memo, and completion form one Session history.
  v_session := public.spokedu_master_save_session(
    v_owner, null, v_class_a, now() + interval '1 day', now() + interval '2 hours 1 day',
    'scheduled', 'verification', '[]'::jsonb, '[]'::jsonb
  );
  insert into public.spokedu_master_session_programs(
    owner_id,session_id,source_type,program_id,spomove_preset_id,
    program_title_snapshot,sort_order,is_completed
  ) values (v_owner,v_session,'spomove',null,'foundation-preset-a','Foundation activity A',0,false)
  returning id into v_activity_a;
  insert into public.spokedu_master_session_programs(
    owner_id,session_id,source_type,program_id,spomove_preset_id,
    program_title_snapshot,sort_order,is_completed
  ) values (v_owner,v_session,'spomove',null,'foundation-preset-b','Foundation activity B',1,false)
  returning id into v_activity_b;
  perform public.spokedu_master_update_session_program_completion(v_owner, v_session, v_activity_a, true);
  perform public.spokedu_master_complete_session(
    v_owner, v_session, v_class_a, now() + interval '1 day', now() + interval '2 hours 1 day',
    'verification complete',
    jsonb_build_array(jsonb_build_object('studentId', v_student::text, 'status', 'present'))
  );
  if not exists (
    select 1 from public.spokedu_master_sessions
    where id=v_session and status='completed' and memo='verification complete' and completed_at is not null
  ) or not exists (
    select 1 from public.spokedu_master_session_programs where id=v_activity_a and is_completed
  ) then raise exception 'D: Session run lifecycle failed'; end if;

  -- E. A completed Session cannot be implicitly reopened.
  v_blocked := false;
  begin
    perform public.spokedu_master_save_session(
      v_owner, v_session, v_class_a, now() + interval '1 day', now() + interval '2 hours 1 day',
      'scheduled', 'illegal reopen', '[]'::jsonb, '[]'::jsonb
    );
  exception when sqlstate '22023' then v_blocked := true;
  end;
  if not v_blocked then raise exception 'E: illegal Session reopen was not blocked'; end if;

  -- F. Changing a scheduled Session Class clears stale attendance.
  v_class_change_session := public.spokedu_master_save_session(
    v_owner, null, v_class_a, now() + interval '2 days', now() + interval '2 hours 2 days',
    'scheduled', null, '[]'::jsonb, '[]'::jsonb
  );
  perform public.spokedu_master_replace_session_attendance(
    v_owner, v_class_change_session,
    jsonb_build_array(jsonb_build_object('studentId', v_student::text, 'status', 'present'))
  );
  perform public.spokedu_master_save_session(
    v_owner, v_class_change_session, v_class_b,
    now() + interval '2 days', now() + interval '2 hours 2 days',
    'scheduled', null, '[]'::jsonb, '[]'::jsonb
  );
  if exists (
    select 1 from public.spokedu_master_session_attendance where session_id=v_class_change_session
  ) then raise exception 'F: Class change left stale attendance'; end if;

  -- C/G. Soft delete removes current memberships but retains historical display data.
  perform public.spokedu_master_soft_delete_student(v_owner, v_student);
  update public.spokedu_master_classes set name='renamed-' || v_suffix where id=v_class_a;
  if exists (
    select 1 from public.spokedu_master_class_students where student_id=v_student
  ) then raise exception 'C: soft delete left current membership'; end if;
  select student_name_snapshot into v_student_name
  from public.spokedu_master_session_attendance
  where session_id=v_session and student_id=v_student;
  select class_name_snapshot into v_class_name
  from public.spokedu_master_sessions where id=v_session;
  if v_student_name <> 'foundation-student-' || v_suffix
     or v_class_name <> 'foundation-a-' || v_suffix then
    raise exception 'C/G: historical snapshot was not preserved';
  end if;

  -- H. Next Session without copied activities is clean and scheduled.
  v_next_empty := public.spokedu_master_create_next_session(
    v_owner, v_session, now() + interval '8 days', now() + interval '2 hours 8 days', false
  );
  if not exists (
    select 1 from public.spokedu_master_sessions
    where id=v_next_empty and status='scheduled' and memo is null and completed_at is null
  ) or exists (
    select 1 from public.spokedu_master_session_programs where session_id=v_next_empty
  ) or exists (
    select 1 from public.spokedu_master_session_attendance where session_id=v_next_empty
  ) then raise exception 'H: empty next Session was not clean'; end if;

  -- I. Copy keeps source identity/order and resets progress without history children.
  v_next_copy := public.spokedu_master_create_next_session(
    v_owner, v_session, now() + interval '15 days', now() + interval '2 hours 15 days', true
  );
  if exists (
    select 1
    from public.spokedu_master_session_programs source
    left join public.spokedu_master_session_programs copied
      on copied.session_id=v_next_copy and copied.sort_order=source.sort_order
    where source.session_id=v_session and (
      copied.id is null or copied.source_type is distinct from source.source_type
      or copied.program_id is distinct from source.program_id
      or copied.spomove_preset_id is distinct from source.spomove_preset_id
      or copied.is_completed
    )
  ) or (select count(*) from public.spokedu_master_session_programs where session_id=v_next_copy) <> 2
    or exists (select 1 from public.spokedu_master_session_attendance where session_id=v_next_copy)
    or exists (select 1 from public.spokedu_master_sessions where id=v_next_copy and memo is not null)
  then raise exception 'I: copied next Session violated reset/order rules'; end if;

  -- J. A caller cannot combine one owner with another owner's Class.
  v_blocked := false;
  begin
    perform public.spokedu_master_save_session(
      v_other_owner, null, v_class_a, now() + interval '20 days', now() + interval '2 hours 20 days',
      'scheduled', null, '[]'::jsonb, '[]'::jsonb
    );
  exception when sqlstate '22023' then v_blocked := true;
  end;
  if not v_blocked then raise exception 'J: cross-owner mutation was not blocked'; end if;

  raise notice 'Foundation mutation smoke A-J passed for owner %; transaction will roll back.', v_owner;
end $$;

rollback;
