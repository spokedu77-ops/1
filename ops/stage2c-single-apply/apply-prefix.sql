\set ON_ERROR_STOP on
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261026171825') THEN
    RAISE EXCEPTION 'STAGE2C_VERSION_ALREADY_APPLIED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261026163542') THEN
    RAISE EXCEPTION 'STAGE2C_STAGE2A_REQUIRED';
  END IF;
  IF to_regclass('public.sessions') IS NULL OR to_regclass('public.users') IS NULL
    OR to_regclass('public.session_count_logs') IS NULL
    OR to_regprocedure('public.session_count_teacher_ids(uuid,text)') IS NULL
    OR to_regprocedure('public.trg_session_count_logs_sync()') IS NULL THEN
    RAISE EXCEPTION 'STAGE2C_PREREQUISITE_MISSING';
  END IF;
  IF to_regclass('private.session_teacher_schedule_slots') IS NOT NULL
    OR to_regprocedure('public.trg_session_teacher_schedule_conflict_guard()') IS NOT NULL
    OR to_regprocedure('public.admin_apply_session_schedule_changes(jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'STAGE2C_UNTRACKED_OBJECT_ALREADY_EXISTS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='btree_gist') THEN
    RAISE EXCEPTION 'STAGE2C_BTREE_GIST_UNAVAILABLE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.sessions'::regclass AND tgname='trg_session_count_logs_sync' AND tgenabled='O'
      AND pg_get_triggerdef(oid,true)='CREATE TRIGGER trg_session_count_logs_sync AFTER INSERT OR UPDATE OF status, created_by, memo ON sessions FOR EACH ROW EXECUTE FUNCTION trg_session_count_logs_sync()'
  ) THEN RAISE EXCEPTION 'STAGE2C_STAGE2A_TRIGGER_DRIFT'; END IF;
END $preflight$;

LOCK TABLE public.sessions IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.session_count_logs IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE stage2c_invariants ON COMMIT DROP AS SELECT
  (SELECT count(*) FROM public.sessions) sessions_count,
  (SELECT count(*) FROM public.session_count_logs) logs_count,
  (SELECT count(*) FROM public.session_count_logs WHERE reason='트리거: sessions.status sync') auto_logs_count,
  (SELECT count(*) FROM public.session_count_logs WHERE reason IS DISTINCT FROM '트리거: sessions.status sync') protected_logs_count,
  (SELECT count(*) FROM supabase_migrations.schema_migrations) history_count,
  md5(pg_get_functiondef('public.trg_session_count_logs_sync()'::regprocedure)) count_trigger_function_md5;
