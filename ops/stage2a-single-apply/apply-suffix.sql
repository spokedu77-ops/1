INSERT INTO supabase_migrations.schema_migrations (
  version,
  statements,
  name,
  created_by,
  idempotency_key
)
VALUES (
  '20261026163542',
  ARRAY[$stage2a_statement$__STAGE2A_MIGRATION_SQL__$stage2a_statement$]::text[],
  'stage2a_sync_assistant_teacher_counts',
  'stage2a-single-apply-package',
  'sha256:6c78464825c2ba038a960cdda663428011ede592a552eb983e904fe9c6fd5f1d'
);

DO $postflight$
DECLARE
  before_values stage2a_invariants%ROWTYPE;
BEGIN
  SELECT * INTO STRICT before_values FROM stage2a_invariants;

  IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20261026163542') <> 1
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations) <> before_values.history_count + 1
  THEN
    RAISE EXCEPTION 'STAGE2A_HISTORY_INVARIANT_FAILED';
  END IF;

  IF (SELECT count(*) FROM public.sessions) <> before_values.sessions_count
    OR (SELECT count(*) FROM public.session_count_logs) <> before_values.logs_count
    OR (SELECT count(*) FROM public.session_count_logs WHERE reason = '트리거: sessions.status sync') <> before_values.auto_logs_count
    OR (SELECT count(*) FROM public.session_count_logs WHERE reason IS DISTINCT FROM '트리거: sessions.status sync') <> before_values.non_auto_logs_count
  THEN
    RAISE EXCEPTION 'STAGE2A_DATA_INVARIANT_FAILED';
  END IF;

  IF to_regprocedure('public.session_count_teacher_ids(uuid,text)') IS NULL
    OR has_function_privilege('public', 'public.session_count_teacher_ids(uuid,text)', 'execute')
    OR has_function_privilege('anon', 'public.session_count_teacher_ids(uuid,text)', 'execute')
    OR has_function_privilege('authenticated', 'public.session_count_teacher_ids(uuid,text)', 'execute')
    OR has_function_privilege('public', 'public.trg_session_count_logs_sync()', 'execute')
    OR has_function_privilege('anon', 'public.trg_session_count_logs_sync()', 'execute')
    OR has_function_privilege('authenticated', 'public.trg_session_count_logs_sync()', 'execute')
  THEN
    RAISE EXCEPTION 'STAGE2A_FUNCTION_OR_ACL_POSTCHECK_FAILED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.sessions'::regclass
      AND tgname = 'trg_session_count_logs_sync'
      AND tgenabled = 'O'
      AND pg_get_triggerdef(oid, true) =
        'CREATE TRIGGER trg_session_count_logs_sync AFTER INSERT OR UPDATE OF status, created_by, memo ON sessions FOR EACH ROW EXECUTE FUNCTION trg_session_count_logs_sync()'
  ) THEN
    RAISE EXCEPTION 'STAGE2A_TRIGGER_POSTCHECK_FAILED';
  END IF;
END
$postflight$;

SELECT 'STAGE2A_SINGLE_APPLY_OK' AS result;
