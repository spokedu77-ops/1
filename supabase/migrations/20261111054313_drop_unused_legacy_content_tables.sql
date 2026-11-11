-- Three legacy content tables with no identified current consumer.
-- Do not alter think_asset_packs, play_scenarios, current MASTER content,
-- storage objects, or trigger function definitions.
-- Local reviewed data and recovery SQL are archived outside Git.
DO $cleanup$
DECLARE
  target_names text[] := ARRAY['action_catalog', 'iiwarmup_programs', 'play_asset_packs'];
  expected_hashes jsonb := '{"action_catalog":"b00c9e1f1dfc10aeacbc0dbdc3c7e538","play_asset_packs":"c1da45807b7ee0e5524313275e601f1c","iiwarmup_programs":"9000656d84cbe976807a9be4df9d4621"}'::jsonb;
  target_name text;
  target_oid oid;
  target_oids oid[] := ARRAY[]::oid[];
  target_kind "char";
  actual_hash text;
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
      RAISE EXCEPTION 'SQL function consumer found for public.%: stop cleanup', target_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f' AND confrelid = ANY(target_oids)
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
