INSERT INTO supabase_migrations.schema_migrations(version,statements,name,created_by,idempotency_key)
VALUES ('20261026171825',ARRAY[$stage2c_statement$__STAGE2C_MIGRATION_SQL__$stage2c_statement$]::text[],
  'stage2c_teacher_schedule_conflict_guard','stage2c-single-apply-package',
  'sha256:579b0c6d8cd712391c07446c093eb77326685b15c67661dc138d079d87b137c4');

DO $postflight$
DECLARE before_values stage2c_invariants%ROWTYPE;
BEGIN
  SELECT * INTO STRICT before_values FROM stage2c_invariants;
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='20261026171825')<>1
    OR (SELECT count(*) FROM supabase_migrations.schema_migrations)<>before_values.history_count+1 THEN
    RAISE EXCEPTION 'STAGE2C_HISTORY_INVARIANT_FAILED';
  END IF;
  IF (SELECT count(*) FROM public.sessions)<>before_values.sessions_count
    OR (SELECT count(*) FROM public.session_count_logs)<>before_values.logs_count
    OR (SELECT count(*) FROM public.session_count_logs WHERE reason='트리거: sessions.status sync')<>before_values.auto_logs_count
    OR (SELECT count(*) FROM public.session_count_logs WHERE reason IS DISTINCT FROM '트리거: sessions.status sync')<>before_values.protected_logs_count
    OR md5(pg_get_functiondef('public.trg_session_count_logs_sync()'::regprocedure))<>before_values.count_trigger_function_md5 THEN
    RAISE EXCEPTION 'STAGE2C_DATA_OR_STAGE2A_INVARIANT_FAILED';
  END IF;
  IF (SELECT count(*) FROM private.session_teacher_schedule_slots)<>0 THEN RAISE EXCEPTION 'STAGE2C_UNEXPECTED_BACKFILL'; END IF;
  IF has_function_privilege('public','public.trg_session_teacher_schedule_conflict_guard()','execute')
    OR has_function_privilege('anon','public.admin_apply_session_schedule_changes(jsonb)','execute')
    OR has_function_privilege('authenticated','public.admin_apply_session_schedule_changes(jsonb)','execute')
    OR NOT has_function_privilege('service_role','public.admin_apply_session_schedule_changes(jsonb)','execute') THEN
    RAISE EXCEPTION 'STAGE2C_ACL_POSTCHECK_FAILED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.sessions'::regclass
    AND tgname='trg_session_teacher_schedule_conflict_guard' AND tgenabled='O') THEN
    RAISE EXCEPTION 'STAGE2C_TRIGGER_POSTCHECK_FAILED';
  END IF;
END $postflight$;
SELECT 'STAGE2C_SINGLE_APPLY_OK' result;
