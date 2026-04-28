-- This RPC is not used by the app (bootstrap is handled via server API with service_role).
-- Prevent signed-in users from executing SECURITY DEFINER via PostgREST RPC.
--
-- Use dynamic SQL to handle overloads and avoid errors if missing.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'spokedu_pro_bootstrap_center'
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
END
$$;

