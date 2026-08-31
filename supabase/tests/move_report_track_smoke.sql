-- MOVE REPORT TRACK — smoke test (run after 20260829130000_move_report_track_core.sql)
-- Uses fixed UUIDs for idempotent cleanup. Requires one auth.users row (uses first available).

DO $$
DECLARE
  v_user_id uuid;
  v_inst uuid := 'a1000000-0000-4000-8000-000000000001';
  v_prog uuid := 'a1000000-0000-4000-8000-000000000002';
  v_child uuid := 'a1000000-0000-4000-8000-000000000003';
  v_sess uuid := 'a1000000-0000-4000-8000-000000000004';
  v_rec uuid := 'a1000000-0000-4000-8000-000000000005';
  v_audit_count int;
  v_version int;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'SMOKE_FAIL: no auth.users row — create a user first';
  END IF;

  -- cleanup prior smoke rows
  DELETE FROM public.mr_record_audit_log WHERE session_child_record_id = v_rec;
  DELETE FROM public.mr_movement_experiences WHERE session_child_record_id = v_rec;
  DELETE FROM public.mr_session_child_records WHERE id = v_rec;
  DELETE FROM public.mr_track_sessions WHERE id = v_sess;
  DELETE FROM public.mr_program_children WHERE program_id = v_prog AND child_id = v_child;
  DELETE FROM public.mr_program_instructors WHERE program_id = v_prog;
  DELETE FROM public.mr_children WHERE id = v_child;
  DELETE FROM public.mr_program_institutions WHERE program_id = v_prog;
  DELETE FROM public.mr_programs WHERE id = v_prog;
  DELETE FROM public.mr_institutions WHERE id = v_inst;

  INSERT INTO public.mr_institutions (id, name, institution_code)
  VALUES (v_inst, 'SMOKE Institution', 'SMOKE-INST-001');

  INSERT INTO public.mr_programs (id, program_name, program_track, total_sessions, status)
  VALUES (v_prog, 'SMOKE Program', 'inclusive', 8, 'active');

  INSERT INTO public.mr_program_institutions (program_id, institution_id, is_primary)
  VALUES (v_prog, v_inst, true);

  INSERT INTO public.mr_program_instructors (program_id, user_id)
  VALUES (v_prog, v_user_id);

  INSERT INTO public.mr_children (id, child_code, child_name)
  VALUES (v_child, 'SMOKE-SPM-001', 'SMOKE_PII_NAME');

  INSERT INTO public.mr_program_children (program_id, child_id, move_goal_category)
  VALUES (v_prog, v_child, 'g2_visual_then_move');

  INSERT INTO public.mr_track_sessions (id, program_id, session_number, session_date, instructor_id, created_by)
  VALUES (v_sess, v_prog, 1, CURRENT_DATE, v_user_id, v_user_id);

  INSERT INTO public.mr_session_child_records (
    id, session_id, child_id, attendance_status,
    observation_opportunity_band, participation_level, support_level,
    independent_initiation, self_reengagement,
    spomove_used, frw_seconds, frw_status,
    created_by, is_draft
  ) VALUES (
    v_rec, v_sess, v_child, 'present',
    'three_plus', 3, 1, 1, NULL,
    true, 4, 'observed_stable',
    v_user_id, true
  );

  INSERT INTO public.mr_movement_experiences (session_child_record_id, domain, subtag)
  VALUES (v_rec, 'locomotor', 'walk');

  -- FRW growth eligibility checks
  IF public.mr_frw_growth_phase_eligible(1::smallint, 'observed_stable'::public.mr_frw_status) THEN
    RAISE EXCEPTION 'SMOKE_FAIL: frw_seconds=1 must be excluded from growth Impact';
  END IF;
  IF NOT public.mr_frw_growth_phase_eligible(4::smallint, 'observed_stable'::public.mr_frw_status) THEN
    RAISE EXCEPTION 'SMOKE_FAIL: frw_seconds=4 observed_stable should be growth eligible';
  END IF;

  -- audit trigger
  UPDATE public.mr_session_child_records
  SET participation_level = 4, updated_by = v_user_id
  WHERE id = v_rec;

  SELECT record_version INTO v_version FROM public.mr_session_child_records WHERE id = v_rec;
  IF v_version <> 2 THEN
    RAISE EXCEPTION 'SMOKE_FAIL: record_version expected 2 got %', v_version;
  END IF;

  SELECT count(*) INTO v_audit_count FROM public.mr_record_audit_log WHERE session_child_record_id = v_rec;
  IF v_audit_count < 1 THEN
    RAISE EXCEPTION 'SMOKE_FAIL: audit log missing after update';
  END IF;

  -- PII view must not expose child_name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mr_children_impact_safe' AND column_name = 'child_name'
  ) THEN
    RAISE EXCEPTION 'SMOKE_FAIL: mr_children_impact_safe exposes child_name';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'mr_children_impact_safe'
      AND c.relkind = 'v'
      AND 'security_invoker=true' = ANY (COALESCE(c.reloptions, ARRAY[]::text[]))
  ) THEN
    RAISE EXCEPTION 'SMOKE_FAIL: mr_children_impact_safe must use security_invoker=true';
  END IF;

  IF has_function_privilege('anon', 'private.mr_children_impact_safe_rows()', 'EXECUTE') THEN
    RAISE EXCEPTION 'SMOKE_FAIL: anon can execute private.mr_children_impact_safe_rows()';
  END IF;

  IF NOT has_function_privilege('authenticated', 'private.mr_children_impact_safe_rows()', 'EXECUTE') THEN
    RAISE EXCEPTION 'SMOKE_FAIL: authenticated cannot execute private.mr_children_impact_safe_rows()';
  END IF;

  -- self_reengagement NULL preserved (CASE H semantics column nullable)
  UPDATE public.mr_session_child_records SET self_reengagement = false, updated_by = v_user_id WHERE id = v_rec;
  UPDATE public.mr_session_child_records SET self_reengagement = NULL, updated_by = v_user_id WHERE id = v_rec;

  RAISE NOTICE 'SMOKE_OK: relations, audit trigger, FRW growth rules, PII view, self_reengagement tri-state';
END $$;
