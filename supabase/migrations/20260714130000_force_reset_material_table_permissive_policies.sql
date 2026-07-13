-- Multiple Permissive Policies 잔존 보정
-- 레거시 정책명(admin_all 등)이 테이블별로 달라 DROP이 누락될 수 있어,
-- 대상 테이블의 기존 정책을 전부 제거한 뒤 액션당 1개씩만 재생성한다.

DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'notices',
    'curriculum',
    'center_equipment',
    'center_equipment_guide'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;
    END IF;
  END LOOP;
END
$$;

-- notices
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'notices' AND c.relkind = 'r'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "notices_select_active_teacher" ON public.notices
        FOR SELECT TO authenticated
        USING ((SELECT is_admin()) OR (SELECT is_active_teacher()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "notices_admin_insert" ON public.notices
        FOR INSERT TO authenticated
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "notices_admin_update" ON public.notices
        FOR UPDATE TO authenticated
        USING ((SELECT is_admin()))
        WITH CHECK ((SELECT is_admin()))
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "notices_admin_delete" ON public.notices
        FOR DELETE TO authenticated
        USING ((SELECT is_admin()))
    $policy$;
  END IF;
END
$$;

-- curriculum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'curriculum' AND c.relkind = 'r'
  ) THEN
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

-- center_equipment
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'center_equipment' AND c.relkind = 'r'
  ) THEN
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

-- center_equipment_guide
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'center_equipment_guide' AND c.relkind = 'r'
  ) THEN
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
