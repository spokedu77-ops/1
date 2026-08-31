-- Run after move_move_report_rls_helpers_private.

DO $$
BEGIN
  IF to_regprocedure('public.mr_can_read_program(uuid)') IS NOT NULL
     OR to_regprocedure('public.mr_is_platform_admin()') IS NOT NULL THEN
    RAISE EXCEPTION 'PRIVATE_RLS_FAIL: public RPC helper still exists';
  END IF;

  IF to_regprocedure('private.mr_can_read_program(uuid)') IS NULL
     OR to_regprocedure('private.mr_is_platform_admin()') IS NULL THEN
    RAISE EXCEPTION 'PRIVATE_RLS_FAIL: private RLS helper is missing';
  END IF;

  IF has_function_privilege('anon', 'private.mr_can_read_program(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.mr_is_platform_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PRIVATE_RLS_FAIL: anon can execute private helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'private.mr_can_read_program(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.mr_is_platform_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'PRIVATE_RLS_FAIL: authenticated RLS execution is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mr_programs'
      AND qual LIKE '%private.mr_can_read_program%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mr_children'
      AND qual LIKE '%private.mr_is_platform_admin%'
  ) THEN
    RAISE EXCEPTION 'PRIVATE_RLS_FAIL: policies did not retain private helper dependencies';
  END IF;

  RAISE NOTICE 'PRIVATE_RLS_OK';
END
$$;
