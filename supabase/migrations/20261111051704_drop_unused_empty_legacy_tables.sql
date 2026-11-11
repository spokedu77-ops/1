-- Remove six empty legacy tables with no identified code/DB consumers.
-- Scope excludes MASTER, push tokens, and all nonempty legacy tables.
-- Restore definitions: local ignored .tmp/database-cleanup-2026-11-11-empty-legacy/.
-- Never use CASCADE or delete rows to make this migration pass.
DO $cleanup$
DECLARE
  target_names text[] := ARRAY[
    'announcements', 'assignments', 'enrollments',
    'mbt_leads', 'move_report_ip_limits', 'teacher_profiles'
  ];
  target_name text;
  target_oid oid;
  target_oids oid[] := ARRAY[]::oid[];
  target_kind "char";
  has_rows boolean;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);

  FOREACH target_name IN ARRAY target_names LOOP
    target_oid := to_regclass(format('public.%I', target_name));
    IF target_oid IS NULL THEN
      CONTINUE;
    END IF;
    SELECT relkind INTO target_kind FROM pg_class WHERE oid = target_oid;
    IF target_kind <> 'r' THEN
      RAISE EXCEPTION 'Unexpected object kind for public.%: stop cleanup', target_name;
    END IF;
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', target_name);
    target_oids := array_append(target_oids, target_oid);
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', target_name) INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION 'public.% is no longer empty: stop cleanup', target_name;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication p
      WHERE p.puballtables
         OR EXISTS (
           SELECT 1 FROM pg_publication_rel pr
           WHERE pr.prpubid = p.oid AND pr.prrelid = target_oid
         )
    ) THEN
      RAISE EXCEPTION 'Publication dependency found for public.%: stop cleanup', target_name;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.prokind IN ('f', 'p')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND p.prosrc ~* (
          E'\\m(from|join|update|into|table)\\s+(public[.])?"?'
          || target_name || E'"?\\M'
        )
    ) THEN
      RAISE EXCEPTION 'SQL function reference found for public.%: stop cleanup', target_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = ANY(target_oids)
      AND NOT (conrelid = ANY(target_oids))
  ) THEN
    RAISE EXCEPTION 'External foreign key found: stop cleanup';
  END IF;

  FOREACH target_name IN ARRAY target_names LOOP
    IF to_regclass(format('public.%I', target_name)) IS NOT NULL THEN
      EXECUTE format('DROP TABLE public.%I RESTRICT', target_name);
    END IF;
  END LOOP;
END
$cleanup$;
