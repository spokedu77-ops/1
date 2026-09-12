-- session_count_logs follows sessions.status (finished|verified) as SSOT.
-- Leaving those statuses or deleting a session removes matching logs.
-- Manual logs (session_id IS NULL) are left untouched.

CREATE OR REPLACE FUNCTION public.clear_session_count_logs_for_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM public.session_count_logs
  WHERE session_id = p_session_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_session_count_logs_for_session(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_session_count_logs_for_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_session_count_logs_for_session(uuid) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.clear_session_count_logs_for_session(uuid) TO supabase_admin;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.trg_session_count_logs_sync()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_session_count_logs_sync ON public.sessions;
DROP TRIGGER IF EXISTS trg_session_count_logs_sync_delete ON public.sessions;

CREATE TRIGGER trg_session_count_logs_sync
AFTER INSERT OR UPDATE OF status ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_session_count_logs_sync();

CREATE TRIGGER trg_session_count_logs_sync_delete
AFTER DELETE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_session_count_logs_sync();

-- Orphan / stale logs: session missing, or session not in settlement statuses.
DELETE FROM public.session_count_logs l
WHERE l.session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = l.session_id
      AND s.status IN ('finished', 'verified')
  );
