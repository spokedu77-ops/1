\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

DO $preflight$
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'STAGE2A_WRONG_DATABASE: %', current_database();
  END IF;

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

SELECT 'STAGE2A_PREFLIGHT_OK' AS result;
ROLLBACK;
