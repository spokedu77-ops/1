CREATE OR REPLACE FUNCTION private.guard_admin_authorization_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean := false;
  v_request_role text := (SELECT auth.role());
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

  IF v_request_role = 'service_role'
    OR (v_request_role IS NULL AND session_user IN ('postgres', 'supabase_admin')) THEN
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
