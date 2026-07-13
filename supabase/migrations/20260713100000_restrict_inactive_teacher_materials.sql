-- 종료 강사(is_active=false)의 공지·커리큘럼·SPOMOVE 관련 자료 열람 차단
-- 관리자(is_admin)는 기존과 동일하게 전체 열람 가능

CREATE OR REPLACE FUNCTION public.is_active_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT u.is_active
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_teacher() TO authenticated;

-- 공통 SELECT 조건: 관리자 또는 활동 중 강사
-- (SELECT is_admin()) OR (SELECT is_active_teacher())

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'notices' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "notices_select_active_teacher" ON public.notices';
    EXECUTE $policy$
      CREATE POLICY "notices_select_active_teacher" ON public.notices
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'curriculum' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.curriculum ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "curriculum_select_active_teacher" ON public.curriculum';
    EXECUTE $policy$
      CREATE POLICY "curriculum_select_active_teacher" ON public.curriculum
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "curriculum_admin_insert" ON public.curriculum';
    EXECUTE $policy$
      CREATE POLICY "curriculum_admin_insert" ON public.curriculum
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "curriculum_admin_update" ON public.curriculum';
    EXECUTE $policy$
      CREATE POLICY "curriculum_admin_update" ON public.curriculum
        FOR UPDATE TO authenticated
        USING ((SELECT is_admin()))
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "curriculum_admin_delete" ON public.curriculum';
    EXECUTE $policy$
      CREATE POLICY "curriculum_admin_delete" ON public.curriculum
        FOR DELETE TO authenticated
        USING ((SELECT is_admin()))
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'weekly_best' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "weekly_best_select_one" ON public.weekly_best';
    EXECUTE 'DROP POLICY IF EXISTS "weekly_best_select_authenticated" ON public.weekly_best';
    EXECUTE $policy$
      CREATE POLICY "weekly_best_select_one" ON public.weekly_best
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'personal_curriculum' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "personal_curriculum_select_one" ON public.personal_curriculum';
    EXECUTE 'DROP POLICY IF EXISTS "personal_curriculum_select_authenticated" ON public.personal_curriculum';
    EXECUTE $policy$
      CREATE POLICY "personal_curriculum_select_one" ON public.personal_curriculum
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'center_equipment' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_select_authenticated" ON public.center_equipment';
    EXECUTE $policy$
      CREATE POLICY "center_equipment_select_authenticated" ON public.center_equipment
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'center_equipment_guide' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_guide_select_authenticated" ON public.center_equipment_guide';
    EXECUTE $policy$
      CREATE POLICY "center_equipment_guide_select_authenticated" ON public.center_equipment_guide
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'curriculum_sub_tags' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "curriculum_sub_tags_read" ON public.curriculum_sub_tags';
    EXECUTE $policy$
      CREATE POLICY "curriculum_sub_tags_read" ON public.curriculum_sub_tags
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;
  END IF;
END
$$;
