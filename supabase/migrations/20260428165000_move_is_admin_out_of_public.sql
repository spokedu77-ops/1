-- Remove PostgREST RPC exposure for is_admin() without breaking RLS.
--
-- is_admin() is commonly referenced inside RLS policy expressions. Revoking EXECUTE from
-- authenticated can break policy evaluation. Instead, move the function out of the exposed
-- "public" schema so /rest/v1/rpc/is_admin is not available.
--
-- This migration:
-- - Creates a non-exposed schema "private" (if missing)
-- - Moves public.is_admin() (all overloads) into private schema

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
      AND p.proname = 'is_admin'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET SCHEMA private', r.schema_name, r.function_name, r.identity_args);
  END LOOP;
END
$$;

