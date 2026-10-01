CREATE OR REPLACE FUNCTION private.guard_admin_authorization_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    IF NEW.role IS NOT DISTINCT FROM OLD.role
      AND NEW.is_admin IS NOT DISTINCT FROM OLD.is_admin THEN
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
      RETURN NEW;
    END IF;
  END IF;

  IF session_user IN ('postgres', 'supabase_admin') OR (SELECT auth.role()) = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND (pg_catalog.lower(u.role) IN ('admin', 'master') OR u.is_admin IS TRUE)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'ADMIN_AUTHORIZATION_COLUMNS_IMMUTABLE'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_admin_authorization_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_users_admin_authorization_columns ON public.users;
CREATE TRIGGER guard_users_admin_authorization_columns
BEFORE UPDATE OF role, is_admin ON public.users
FOR EACH ROW EXECUTE FUNCTION private.guard_admin_authorization_columns();

DROP TRIGGER IF EXISTS guard_profiles_admin_authorization_columns ON public.profiles;
CREATE TRIGGER guard_profiles_admin_authorization_columns
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.guard_admin_authorization_columns();

CREATE OR REPLACE FUNCTION private.rls_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND (
        u.is_admin IS TRUE
        OR pg_catalog.lower(u.role) IN ('admin', 'master')
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND pg_catalog.lower(p.role) IN ('admin', 'master')
  );
$$;

REVOKE ALL ON FUNCTION private.rls_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.rls_is_admin() TO authenticated;
