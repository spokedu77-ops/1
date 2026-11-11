-- Retired memo/todo/bundle storage; no identified current consumers.
-- Only the four named tables and the identity sequence owned by todos.
-- Full data/DDL/ACL backup and recovery SQL are stored outside Git.
-- Stop on changed data or unexpected dependencies; never use CASCADE.
DO $cleanup$
DECLARE
  target_names text[] := ARRAY['class_bundle_info', 'dashboard_memos', 'memos', 'todos'];
  expected_hashes jsonb := '{"memos":"d5560c6ba54afa9b5c81111e8eb0a463","todos":"473ae96abe8e5c70de8df66995df4e65","dashboard_memos":"74bb21513f71a52a37e3841958014ff6","class_bundle_info":"38d60308f62702d7e6f56e6fa7f4d228"}'::jsonb;
  target_name text;
  target_oid oid;
  target_oids oid[] := ARRAY[]::oid[];
  target_kind "char";
  actual_hash text;
  sequence_value text;
  sequence_called boolean;
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
    EXECUTE format(
      'SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), ''[]'')::text) FROM public.%I t',
      target_name
    ) INTO actual_hash;
    IF actual_hash IS DISTINCT FROM expected_hashes->>target_name THEN
      RAISE EXCEPTION 'public.% differs from reviewed backup: stop cleanup', target_name;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication p
      WHERE p.puballtables OR EXISTS (
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
    WHERE contype = 'f' AND confrelid = ANY(target_oids)
      AND NOT (conrelid = ANY(target_oids))
  ) THEN
    RAISE EXCEPTION 'External foreign key found: stop cleanup';
  END IF;

  IF to_regclass('public.todos') IS NOT NULL THEN
    IF to_regclass('public.todos_id_seq') IS NULL OR
       to_regclass(pg_get_serial_sequence('public.todos', 'id'))
         IS DISTINCT FROM to_regclass('public.todos_id_seq') THEN
      RAISE EXCEPTION 'Unexpected todos identity sequence: stop cleanup';
    END IF;
    SELECT last_value::text, is_called INTO sequence_value, sequence_called
      FROM public.todos_id_seq;
    IF sequence_value IS DISTINCT FROM '31'
       OR sequence_called IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Todos sequence differs from backup: stop cleanup';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.prokind IN ('f', 'p')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND p.prosrc ~ E'\\mtodos_id_seq\\M'
    ) THEN
      RAISE EXCEPTION 'Todos sequence function consumer found: stop cleanup';
    END IF;
  END IF;

  FOREACH target_name IN ARRAY target_names LOOP
    IF to_regclass(format('public.%I', target_name)) IS NOT NULL THEN
      EXECUTE format('DROP TABLE public.%I RESTRICT', target_name);
    END IF;
  END LOOP;
END
$cleanup$;
