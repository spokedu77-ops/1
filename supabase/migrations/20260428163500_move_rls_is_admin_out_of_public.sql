-- Remove PostgREST RPC exposure for rls_is_admin() without breaking RLS.
--
-- Rationale:
-- - Supabase flags SECURITY DEFINER functions in exposed API schemas (typically "public")
--   that are executable by signed-in users via /rest/v1/rpc/*.
-- - rls_is_admin() is commonly used inside RLS policy expressions; revoking EXECUTE from
--   authenticated can break policy evaluation and cause outages.
-- - Moving the function out of the exposed schema removes the RPC endpoint while keeping
--   existing policy/function OID references working.
--
-- This migration:
-- - Creates a non-exposed schema "private" (if missing)
-- - Moves public.rls_is_admin() (all overloads) into private schema

DO $$
DECLARE
  r record;
BEGIN
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS private';

  FOR r IN
    SELECT
      p.oid,
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rls_is_admin'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET SCHEMA private', r.schema_name, r.function_name, r.identity_args);
  END LOOP;
END
$$;

