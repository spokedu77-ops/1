-- Lock down scenario helper functions created as SECURITY DEFINER to prevent PostgREST RPC execution.
-- App codebase does not call these functions via supabase.rpc(...).
--
-- Use dynamic SQL to:
-- - handle overloads
-- - avoid errors if some functions are missing in a given environment

DO $$
DECLARE
  fn text;
  r record;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'load_scenario',
    'load_draft_session',
    'delete_scenario',
    'finalize_draft',
    'validate_scenario_json',
    'get_scenario_stats',
    'list_scenarios',
    'cleanup_orphan_drafts',
    'check_migration_status'
  ]
  LOOP
    FOR r IN
      SELECT
        n.nspname AS schema_name,
        p.proname AS function_name,
        pg_get_function_identity_arguments(p.oid) AS identity_args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', r.schema_name, r.function_name, r.identity_args);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.schema_name, r.function_name, r.identity_args);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated', r.schema_name, r.function_name, r.identity_args);

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.schema_name, r.function_name, r.identity_args);
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO supabase_admin', r.schema_name, r.function_name, r.identity_args);
      END IF;
    END LOOP;
  END LOOP;
END
$$;

