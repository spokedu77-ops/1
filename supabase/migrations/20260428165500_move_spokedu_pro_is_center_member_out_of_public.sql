-- Remove PostgREST RPC exposure for spokedu_pro_is_center_member(...) without breaking RLS.
--
-- This function name strongly suggests it is used for authorization checks (often in RLS).
-- Revoking EXECUTE from authenticated can break policy evaluation. Instead, move the function
-- out of exposed schema to remove /rest/v1/rpc/spokedu_pro_is_center_member.

DO $$
DECLARE
  r record;
BEGIN
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS private';

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
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET SCHEMA private', r.schema_name, r.function_name, r.identity_args);
  END LOOP;
END
$$;

