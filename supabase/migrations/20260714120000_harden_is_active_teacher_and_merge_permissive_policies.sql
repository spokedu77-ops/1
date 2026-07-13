-- 1) is_active_teacher(): SECURITY DEFINER를 private로 이동, public에는 INVOKER 래퍼만 유지
-- 2) Multiple Permissive Policies: admin_all(FOR ALL)과 액션별 정책 중복 제거
--
-- 대상 테이블: center_equipment, center_equipment_guide, curriculum, notices

-- ========== is_active_teacher hardening ==========
DO $$
BEGIN
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS private';

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_active_teacher'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'ALTER FUNCTION public.is_active_teacher() SET SCHEMA private';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname = 'is_active_teacher'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION private.is_active_teacher()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT COALESCE(
          (
            SELECT u.is_active
            FROM public.users u
            WHERE u.id = (SELECT auth.uid())
          ),
          false
        );
      $body$;
    $fn$;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.is_active_teacher()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY INVOKER
    SET search_path = pg_catalog
    AS $body$ SELECT private.is_active_teacher(); $body$;
  $fn$;

  EXECUTE 'REVOKE ALL ON FUNCTION private.is_active_teacher() FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION private.is_active_teacher() FROM anon';

  EXECUTE 'REVOKE ALL ON FUNCTION public.is_active_teacher() FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.is_active_teacher() FROM anon';

  GRANT USAGE ON SCHEMA private TO authenticated;
  EXECUTE 'GRANT EXECUTE ON FUNCTION private.is_active_teacher() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_active_teacher() TO authenticated';
END
$$;

-- 공통 SELECT 조건: 관리자 또는 활동 중 강사
-- (SELECT is_admin()) OR (SELECT is_active_teacher())

-- ========== notices: SELECT 1개 + (필요 시) admin write 분리 ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'notices' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "notices_admin_all" ON public.notices';
    EXECUTE 'DROP POLICY IF EXISTS "notices_select_authenticated" ON public.notices';
    EXECUTE 'DROP POLICY IF EXISTS "notices_select_active_teacher" ON public.notices';

    EXECUTE $policy$
      CREATE POLICY "notices_select_active_teacher" ON public.notices
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "notices_admin_insert" ON public.notices';
    EXECUTE $policy$
      CREATE POLICY "notices_admin_insert" ON public.notices
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "notices_admin_update" ON public.notices';
    EXECUTE $policy$
      CREATE POLICY "notices_admin_update" ON public.notices
        FOR UPDATE TO authenticated
        USING ((SELECT is_admin()))
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "notices_admin_delete" ON public.notices';
    EXECUTE $policy$
      CREATE POLICY "notices_admin_delete" ON public.notices
        FOR DELETE TO authenticated
        USING ((SELECT is_admin()))
    $policy$;
  END IF;
END
$$;

-- ========== curriculum: SELECT/INSERT/UPDATE/DELETE 각 1개 ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'curriculum' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.curriculum ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "curriculum_admin_all" ON public.curriculum';
    EXECUTE 'DROP POLICY IF EXISTS "curriculum_select_authenticated" ON public.curriculum';
    EXECUTE 'DROP POLICY IF EXISTS "curriculum_select_active_teacher" ON public.curriculum';
    EXECUTE 'DROP POLICY IF EXISTS "curriculum_admin_insert" ON public.curriculum';
    EXECUTE 'DROP POLICY IF EXISTS "curriculum_admin_update" ON public.curriculum';
    EXECUTE 'DROP POLICY IF EXISTS "curriculum_admin_delete" ON public.curriculum';

    EXECUTE $policy$
      CREATE POLICY "curriculum_select_active_teacher" ON public.curriculum
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "curriculum_admin_insert" ON public.curriculum
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "curriculum_admin_update" ON public.curriculum
        FOR UPDATE TO authenticated
        USING ((SELECT is_admin()))
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "curriculum_admin_delete" ON public.curriculum
        FOR DELETE TO authenticated
        USING ((SELECT is_admin()))
    $policy$;
  END IF;
END
$$;

-- ========== center_equipment: SELECT 1개 + admin write 분리 ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'center_equipment' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.center_equipment ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_admin_all" ON public.center_equipment';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_select_authenticated" ON public.center_equipment';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_admin_insert" ON public.center_equipment';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_admin_update" ON public.center_equipment';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_admin_delete" ON public.center_equipment';

    EXECUTE $policy$
      CREATE POLICY "center_equipment_select_authenticated" ON public.center_equipment
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "center_equipment_admin_insert" ON public.center_equipment
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "center_equipment_admin_update" ON public.center_equipment
        FOR UPDATE TO authenticated
        USING ((SELECT is_admin()))
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "center_equipment_admin_delete" ON public.center_equipment
        FOR DELETE TO authenticated
        USING ((SELECT is_admin()))
    $policy$;
  END IF;
END
$$;

-- ========== center_equipment_guide: SELECT 1개 + admin write 분리 ==========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'center_equipment_guide' AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.center_equipment_guide ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_guide_admin_all" ON public.center_equipment_guide';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_guide_select_authenticated" ON public.center_equipment_guide';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_guide_admin_insert" ON public.center_equipment_guide';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_guide_admin_update" ON public.center_equipment_guide';
    EXECUTE 'DROP POLICY IF EXISTS "center_equipment_guide_admin_delete" ON public.center_equipment_guide';

    EXECUTE $policy$
      CREATE POLICY "center_equipment_guide_select_authenticated" ON public.center_equipment_guide
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "center_equipment_guide_admin_insert" ON public.center_equipment_guide
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "center_equipment_guide_admin_update" ON public.center_equipment_guide
        FOR UPDATE TO authenticated
        USING ((SELECT is_admin()))
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "center_equipment_guide_admin_delete" ON public.center_equipment_guide
        FOR DELETE TO authenticated
        USING ((SELECT is_admin()))
    $policy$;
  END IF;
END
$$;
