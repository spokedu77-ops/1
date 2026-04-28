-- Guarded lockdown for rls_is_admin() flagged as RPC-callable by signed-in users.
--
-- Goal:
-- - Never break existing RLS policy evaluation.
-- - Always remove public/anon execute.
-- - Revoke authenticated execute ONLY if the function is not referenced by any RLS policy.
--
-- Note: If policies reference this function, the Supabase warning may persist because
-- authenticated must be able to EXECUTE it for RLS to work. Eliminating the warning
-- in that case typically requires redesign (e.g., move function out of exposed schema
-- and update policies), which is intentionally not done here to avoid behavior changes.

DO $$
DECLARE
  r record;
  used_in_policies boolean;
BEGIN
  used_in_policies := EXISTS (
    SELECT 1
    FROM pg_policies pol
    WHERE (pol.qual ILIKE '%rls_is_admin%'
        OR pol.with_check ILIKE '%rls_is_admin%')
  );

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_is_admin'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', r.schema_name, r.function_name, r.identity_args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.schema_name, r.function_name, r.identity_args);

    IF NOT used_in_policies THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated', r.schema_name, r.function_name, r.identity_args);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.schema_name, r.function_name, r.identity_args);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO supabase_admin', r.schema_name, r.function_name, r.identity_args);
    END IF;
  END LOOP;
END
$$;

