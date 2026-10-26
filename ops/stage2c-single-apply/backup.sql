\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;
SELECT now() backup_at, current_database(), current_user;
SELECT version,name,created_by,idempotency_key FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT p.oid::regprocedure object_name, pg_get_userbyid(p.proowner) owner, p.proacl, p.proconfig,
  md5(pg_get_functiondef(p.oid)) definition_md5, pg_get_functiondef(p.oid) definition
FROM pg_proc p WHERE p.oid IN ('public.session_count_teacher_ids(uuid,text)'::regprocedure,'public.trg_session_count_logs_sync()'::regprocedure);
SELECT tgname,tgenabled,pg_get_triggerdef(oid,true) FROM pg_trigger
WHERE tgrelid='public.sessions'::regclass AND NOT tgisinternal ORDER BY tgname;
SELECT count(*) sessions_count FROM public.sessions;
SELECT count(*) logs_count,
  count(*) FILTER(WHERE reason='트리거: sessions.status sync') automatic_count,
  count(*) FILTER(WHERE reason IS DISTINCT FROM '트리거: sessions.status sync') protected_count
FROM public.session_count_logs;
ROLLBACK;
