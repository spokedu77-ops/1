-- Optimize RLS policies by evaluating auth.uid() once per statement.
-- Semantics unchanged.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'curriculum_sub_tags'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.curriculum_sub_tags ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "curriculum_sub_tags_admin_insert" ON public.curriculum_sub_tags;
    CREATE POLICY "curriculum_sub_tags_admin_insert"
      ON public.curriculum_sub_tags
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
      );

    DROP POLICY IF EXISTS "curriculum_sub_tags_admin_update" ON public.curriculum_sub_tags;
    CREATE POLICY "curriculum_sub_tags_admin_update"
      ON public.curriculum_sub_tags
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
      );

    DROP POLICY IF EXISTS "curriculum_sub_tags_admin_delete" ON public.curriculum_sub_tags;
    CREATE POLICY "curriculum_sub_tags_admin_delete"
      ON public.curriculum_sub_tags
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
      );
  END IF;
END
$$;

