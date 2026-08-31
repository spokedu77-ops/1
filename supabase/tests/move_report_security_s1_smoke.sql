-- Run after harden_move_report_function_privileges_s1.
-- Catalog-only assertions: no application data is mutated.

DO $$
DECLARE
  v_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'mr_set_updated_at'
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
      AND p.prosecdef IS FALSE
      AND p.provolatile = 'v'
      AND pg_get_function_result(p.oid) = 'trigger'
  ) THEN
    RAISE EXCEPTION 'S1_FAIL: mr_set_updated_at metadata changed or search_path is not pinned';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'mr_frw_growth_phase_eligible'
      AND pg_get_function_identity_arguments(p.oid) = 'p_seconds smallint, p_status mr_frw_status'
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
      AND p.prosecdef IS FALSE
      AND p.provolatile = 'i'
      AND pg_get_function_result(p.oid) = 'boolean'
  ) THEN
    RAISE EXCEPTION 'S1_FAIL: mr_frw_growth_phase_eligible metadata changed or search_path is not pinned';
  END IF;

  FOREACH v_name IN ARRAY ARRAY[
    'public.mr_audit_session_child_record()',
    'public.mr_can_read_program(uuid)',
    'public.mr_is_platform_admin()',
    'public.mr_is_program_instructor(uuid)',
    'public.mr_is_program_viewer(uuid)'
  ]
  LOOP
    IF has_function_privilege('anon', v_name, 'EXECUTE') THEN
      RAISE EXCEPTION 'S1_FAIL: anon can execute %', v_name;
    END IF;
    IF NOT has_function_privilege('service_role', v_name, 'EXECUTE') THEN
      RAISE EXCEPTION 'S1_FAIL: service_role cannot execute %', v_name;
    END IF;
  END LOOP;

  IF has_function_privilege('authenticated', 'public.mr_audit_session_child_record()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.mr_is_program_instructor(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.mr_is_program_viewer(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'S1_FAIL: authenticated retains a trigger/internal-only helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.mr_can_read_program(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.mr_is_platform_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'S1_FAIL: authenticated RLS helper execution was removed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mr_programs'
      AND roles @> ARRAY['authenticated'::name]
      AND qual LIKE '%mr_can_read_program%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mr_children'
      AND roles @> ARRAY['authenticated'::name]
      AND qual LIKE '%mr_is_platform_admin%'
  ) THEN
    RAISE EXCEPTION 'S1_FAIL: expected MOVE REPORT RLS dependencies are missing';
  END IF;

  RAISE NOTICE 'S1_OK: search paths, least-privilege EXECUTE grants, and RLS dependencies verified';
END
$$;
