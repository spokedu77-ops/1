-- Guarded lockdown for SECURITY DEFINER function flagged as RPC-callable by signed-in users.
--
-- Goal:
-- - Never break existing RLS/policy behavior.
-- - Always remove anonymous/public execute.
-- - Revoke authenticated execute ONLY if the function is not referenced by any RLS policy.
--
-- If the warning persists after applying this migration, it usually means the function
-- is referenced by RLS policies and cannot be revoked without redesign (e.g. INVOKER / schema move).

DO $$
DECLARE
  r record;
  used_in_policies boolean;
BEGIN
  used_in_policies := EXISTS (
    SELECT 1
    FROM pg_policies pol
    WHERE (pol.qual ILIKE '%spokedu_pro_is_center_member%'
        OR pol.with_check ILIKE '%spokedu_pro_is_center_member%')
  );

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'spokedu_pro_is_center_member'
  LOOP
    -- Always block public/anon RPC execution surface.
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', r.schema_name, r.function_name, r.identity_args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.schema_name, r.function_name, r.identity_args);

    -- Authenticated execute is only revoked if it is not used by any RLS policy.
    IF NOT used_in_policies THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated', r.schema_name, r.function_name, r.identity_args);
    END IF;

    -- Keep trusted roles executable.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.schema_name, r.function_name, r.identity_args);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO supabase_admin', r.schema_name, r.function_name, r.identity_args);
    END IF;
  END LOOP;
END
$$;

