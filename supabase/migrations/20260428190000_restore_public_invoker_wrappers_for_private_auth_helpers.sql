-- Restore compatibility for RLS policies that reference public auth helper functions.
-- Create SECURITY INVOKER wrappers in public that delegate to private equivalents.
-- This unblocks admin/teacher flows without re-exposing SECURITY DEFINER RPCs in public.

DO $$
BEGIN
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS private';

  -- public.is_admin() -> private.is_admin()
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'is_admin'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_admin()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY INVOKER
      SET search_path = pg_catalog
      AS $body$ SELECT private.is_admin(); $body$;
    $fn$;
  END IF;

  -- public.rls_is_admin() -> private.rls_is_admin()
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'rls_is_admin'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_is_admin'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.rls_is_admin()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY INVOKER
      SET search_path = pg_catalog
      AS $body$ SELECT private.rls_is_admin(); $body$;
    $fn$;
  END IF;

  -- public.is_admin_or_master() -> private.is_admin_or_master()
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'is_admin_or_master'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_or_master'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_admin_or_master()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY INVOKER
      SET search_path = pg_catalog
      AS $body$ SELECT private.is_admin_or_master(); $body$;
    $fn$;
  END IF;

  -- public.current_org_id() -> private.current_org_id()
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'current_org_id'
      AND pg_get_function_identity_arguments(p.oid) = ''
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'current_org_id'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.current_org_id()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY INVOKER
      SET search_path = pg_catalog
      AS $body$ SELECT private.current_org_id(); $body$;
    $fn$;
  END IF;
END
$$;

