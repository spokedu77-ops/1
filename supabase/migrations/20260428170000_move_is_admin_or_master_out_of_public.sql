-- Remove PostgREST RPC exposure for is_admin_or_master() without breaking RLS.
-- Move from exposed schema "public" to non-exposed schema "private".

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
      AND p.proname = 'is_admin_or_master'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET SCHEMA private', r.schema_name, r.function_name, r.identity_args);
  END LOOP;
END
$$;

