-- Prevent PostgREST RPC execution of SECURITY DEFINER function.
-- This should not affect the trigger that calls the function internally.

REVOKE EXECUTE ON FUNCTION public.sync_session_count_logs_for_session(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_session_count_logs_for_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_session_count_logs_for_session(uuid) FROM authenticated;

DO $$
BEGIN
  -- Ensure admin/owner roles can still execute explicitly if needed.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.sync_session_count_logs_for_session(uuid) TO supabase_admin;
  END IF;
END
$$;

