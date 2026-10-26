\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name,
  EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261026163542') AS stage2a_applied,
  NOT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261026171825') AS stage2c_unapplied,
  to_regprocedure('public.session_count_teacher_ids(uuid,text)') IS NOT NULL AS helper_present,
  to_regprocedure('public.trg_session_count_logs_sync()') IS NOT NULL AS count_trigger_present,
  to_regclass('private.session_teacher_schedule_slots') IS NULL AS slot_table_absent;
SELECT pg_get_triggerdef(oid,true) AS stage2a_trigger_definition FROM pg_trigger
WHERE tgrelid='public.sessions'::regclass AND tgname='trg_session_count_logs_sync';
ROLLBACK;
