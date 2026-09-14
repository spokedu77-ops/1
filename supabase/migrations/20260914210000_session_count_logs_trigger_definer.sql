-- Client session.status updates must be able to clear count logs.
-- clear_session_count_logs_for_session EXECUTE is revoked from authenticated,
-- so the sessions trigger itself has to run as definer.

CREATE OR REPLACE FUNCTION public.trg_session_count_logs_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.clear_session_count_logs_for_session(OLD.id);
    RETURN OLD;
  END IF;

  IF NEW.status IN ('finished', 'verified') THEN
    PERFORM public.sync_session_count_logs_for_session(NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.clear_session_count_logs_for_session(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_session_count_logs_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_session_count_logs_sync() FROM anon;
REVOKE ALL ON FUNCTION public.trg_session_count_logs_sync() FROM authenticated;
