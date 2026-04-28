-- Prevent PostgREST RPC execution of trigger helper function.
-- This should not affect triggers that call the function internally.

REVOKE EXECUTE ON FUNCTION public.spokedu_pro_set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.spokedu_pro_set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.spokedu_pro_set_updated_at() FROM authenticated;

DO $$
BEGIN
  -- Ensure admin/owner roles can still execute explicitly if needed.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.spokedu_pro_set_updated_at() TO supabase_admin;
  END IF;
END
$$;

