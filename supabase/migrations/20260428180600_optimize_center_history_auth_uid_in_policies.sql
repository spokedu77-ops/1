-- Optimize RLS policies by evaluating auth.uid() once per statement.
-- Semantics unchanged: only admin/master (users.role) can access center_history.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'center_history'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.center_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "center_history_select_admin" ON public.center_history;
    DROP POLICY IF EXISTS "center_history_insert_admin" ON public.center_history;
    DROP POLICY IF EXISTS "center_history_update_admin" ON public.center_history;
    DROP POLICY IF EXISTS "center_history_delete_admin" ON public.center_history;

    CREATE POLICY "center_history_select_admin"
      ON public.center_history
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = (SELECT auth.uid())
            AND u.role IN ('admin', 'master')
        )
      );

    CREATE POLICY "center_history_insert_admin"
      ON public.center_history
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = (SELECT auth.uid())
            AND u.role IN ('admin', 'master')
        )
      );

    CREATE POLICY "center_history_update_admin"
      ON public.center_history
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = (SELECT auth.uid())
            AND u.role IN ('admin', 'master')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = (SELECT auth.uid())
            AND u.role IN ('admin', 'master')
        )
      );

    CREATE POLICY "center_history_delete_admin"
      ON public.center_history
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = (SELECT auth.uid())
            AND u.role IN ('admin', 'master')
        )
      );
  END IF;
END
$$;

