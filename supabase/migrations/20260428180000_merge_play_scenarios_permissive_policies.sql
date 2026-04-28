-- Merge multiple permissive RLS policies into single policies (performance).
-- Semantics are preserved because permissive policies are OR-combined by Postgres.
--
-- Target: public.play_scenarios
-- - INSERT: {play_scenarios_admin_insert, play_scenarios_insert_one}
-- - DELETE: {play_scenarios_admin_delete, play_scenarios_delete_one}

DO $$
DECLARE
  w1 text;
  w2 text;
  u1 text;
  u2 text;
BEGIN
  -- INSERT: merge WITH CHECK
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'play_scenarios'
      AND policyname = 'play_scenarios_admin_insert'
      AND cmd        = 'INSERT'
  )
  AND EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'play_scenarios'
      AND policyname = 'play_scenarios_insert_one'
      AND cmd        = 'INSERT'
  ) THEN
    SELECT COALESCE(with_check, 'false') INTO w1
    FROM pg_policies
    WHERE schemaname='public' AND tablename='play_scenarios'
      AND policyname='play_scenarios_admin_insert' AND cmd='INSERT';

    SELECT COALESCE(with_check, 'false') INTO w2
    FROM pg_policies
    WHERE schemaname='public' AND tablename='play_scenarios'
      AND policyname='play_scenarios_insert_one' AND cmd='INSERT';

    EXECUTE 'DROP POLICY IF EXISTS play_scenarios_insert_merged ON public.play_scenarios';
    EXECUTE format(
      'CREATE POLICY play_scenarios_insert_merged ON public.play_scenarios FOR INSERT TO authenticated WITH CHECK ((%s) OR (%s))',
      w1, w2
    );

    EXECUTE 'DROP POLICY IF EXISTS play_scenarios_admin_insert ON public.play_scenarios';
    EXECUTE 'DROP POLICY IF EXISTS play_scenarios_insert_one ON public.play_scenarios';
  END IF;

  -- DELETE: merge USING
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'play_scenarios'
      AND policyname = 'play_scenarios_admin_delete'
      AND cmd        = 'DELETE'
  )
  AND EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'play_scenarios'
      AND policyname = 'play_scenarios_delete_one'
      AND cmd        = 'DELETE'
  ) THEN
    SELECT COALESCE(qual, 'false') INTO u1
    FROM pg_policies
    WHERE schemaname='public' AND tablename='play_scenarios'
      AND policyname='play_scenarios_admin_delete' AND cmd='DELETE';

    SELECT COALESCE(qual, 'false') INTO u2
    FROM pg_policies
    WHERE schemaname='public' AND tablename='play_scenarios'
      AND policyname='play_scenarios_delete_one' AND cmd='DELETE';

    EXECUTE 'DROP POLICY IF EXISTS play_scenarios_delete_merged ON public.play_scenarios';
    EXECUTE format(
      'CREATE POLICY play_scenarios_delete_merged ON public.play_scenarios FOR DELETE TO authenticated USING ((%s) OR (%s))',
      u1, u2
    );

    EXECUTE 'DROP POLICY IF EXISTS play_scenarios_admin_delete ON public.play_scenarios';
    EXECUTE 'DROP POLICY IF EXISTS play_scenarios_delete_one ON public.play_scenarios';
  END IF;
END
$$;

