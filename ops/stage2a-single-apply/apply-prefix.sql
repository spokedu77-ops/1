\set ON_ERROR_STOP on

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20261026163542'
  ) THEN
    RAISE EXCEPTION 'STAGE2A_VERSION_ALREADY_APPLIED';
  END IF;

  IF to_regclass('public.sessions') IS NULL
    OR to_regclass('public.session_count_logs') IS NULL
  THEN
    RAISE EXCEPTION 'STAGE2A_REQUIRED_TABLE_MISSING';
  END IF;

  IF to_regprocedure('public.session_count_teacher_ids(uuid,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'STAGE2A_UNTRACKED_HELPER_ALREADY_EXISTS';
  END IF;

  IF to_regprocedure('public.sync_session_count_logs_for_session(uuid)') IS NULL
    OR to_regprocedure('public.clear_session_count_logs_for_session(uuid)') IS NULL
    OR to_regprocedure('public.trg_session_count_logs_sync()') IS NULL
  THEN
    RAISE EXCEPTION 'STAGE2A_REQUIRED_FUNCTION_MISSING';
  END IF;

  IF md5(pg_get_functiondef('public.clear_session_count_logs_for_session(uuid)'::regprocedure))
       <> 'bdf00fa20fa1b402c0467f85ca08bdb2'
    OR md5(pg_get_functiondef('public.sync_session_count_logs_for_session(uuid)'::regprocedure))
       <> 'f40c581d701913b8aea6725983d9d43f'
    OR md5(pg_get_functiondef('public.trg_session_count_logs_sync()'::regprocedure))
       <> '20e13ce02f7ca3972051087e3c8a7802'
  THEN
    RAISE EXCEPTION 'STAGE2A_REQUIRED_FUNCTION_DEFINITION_DRIFT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'session_count_logs'
      AND indexdef ILIKE '%UNIQUE INDEX%'
      AND indexdef ILIKE '%session_id%'
      AND indexdef ILIKE '%teacher_id%'
  ) THEN
    RAISE EXCEPTION 'STAGE2A_REQUIRED_UNIQUE_INDEX_MISSING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.sessions'::regclass
      AND tgname = 'trg_session_count_logs_sync'
      AND tgenabled = 'O'
      AND pg_get_triggerdef(oid, true) =
        'CREATE TRIGGER trg_session_count_logs_sync AFTER INSERT OR UPDATE OF status, created_by ON sessions FOR EACH ROW EXECUTE FUNCTION trg_session_count_logs_sync()'
  ) THEN
    RAISE EXCEPTION 'STAGE2A_EXPECTED_TRIGGER_DEFINITION_DRIFT';
  END IF;
END
$preflight$;

LOCK TABLE public.sessions IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.session_count_logs IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE supabase_migrations.schema_migrations IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE stage2a_invariants ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.sessions) AS sessions_count,
  (SELECT count(*) FROM public.session_count_logs) AS logs_count,
  (SELECT count(*) FROM public.session_count_logs WHERE reason = '트리거: sessions.status sync') AS auto_logs_count,
  (SELECT count(*) FROM public.session_count_logs WHERE reason IS DISTINCT FROM '트리거: sessions.status sync') AS non_auto_logs_count,
  (SELECT count(*) FROM supabase_migrations.schema_migrations) AS history_count;
