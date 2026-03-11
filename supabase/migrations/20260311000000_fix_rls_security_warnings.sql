-- ============================================================
-- RLS Security & Performance Fixes
-- 1. Auth RLS Initialization Plan: wrap auth.uid() in (SELECT auth.uid())
--    to prevent per-row evaluation of session context functions
-- 2. Multiple Permissive Policies: consolidate to one SELECT policy per
--    table/role/action to avoid redundant policy evaluation
-- 3. Duplicate Indexes: remove indexes made redundant by composite indexes
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PART 1: Auth RLS Initialization Plan Fixes
-- ────────────────────────────────────────────────────────────

-- play_scenarios
DROP POLICY IF EXISTS "play_scenarios_select_one" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_select" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_admin_write" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_admin_update" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_admin_delete" ON play_scenarios;
DROP POLICY IF EXISTS "play_scenarios_admin_insert" ON play_scenarios;
DROP POLICY IF EXISTS "Admin full access to play scenarios" ON play_scenarios;
DROP POLICY IF EXISTS "All users can read play scenarios" ON play_scenarios;

CREATE POLICY "play_scenarios_select" ON play_scenarios
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "play_scenarios_admin_insert" ON play_scenarios
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ));

CREATE POLICY "play_scenarios_admin_update" ON play_scenarios
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ));

CREATE POLICY "play_scenarios_admin_delete" ON play_scenarios
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ));

-- rotation_schedule
DROP POLICY IF EXISTS "Admin full access to rotation schedule" ON rotation_schedule;
DROP POLICY IF EXISTS "All users can read published schedules" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_select_one" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_select" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_admin_insert" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_admin_update" ON rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_admin_delete" ON rotation_schedule;

CREATE POLICY "rotation_schedule_select" ON rotation_schedule
  FOR SELECT TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
    )
  );

CREATE POLICY "rotation_schedule_admin_insert" ON rotation_schedule
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ));

CREATE POLICY "rotation_schedule_admin_update" ON rotation_schedule
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ));

CREATE POLICY "rotation_schedule_admin_delete" ON rotation_schedule
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = (SELECT auth.uid()) AND u.role IN ('admin', 'master')
  ));

-- spokedu_pro_centers
DROP POLICY IF EXISTS "center_owner_all" ON spokedu_pro_centers;
CREATE POLICY "center_owner_all" ON spokedu_pro_centers
  FOR ALL USING ((SELECT auth.uid()) = owner_id);

-- spokedu_pro_center_members
DROP POLICY IF EXISTS "member_read_own_center" ON spokedu_pro_center_members;
CREATE POLICY "member_read_own_center" ON spokedu_pro_center_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR center_id IN (
      SELECT id FROM spokedu_pro_centers WHERE owner_id = (SELECT auth.uid())
    )
  );

-- spokedu_pro_subscriptions
DROP POLICY IF EXISTS "subscription_read_owner" ON spokedu_pro_subscriptions;
CREATE POLICY "subscription_read_owner" ON spokedu_pro_subscriptions
  FOR SELECT USING (
    center_id IN (
      SELECT id FROM spokedu_pro_centers WHERE owner_id = (SELECT auth.uid())
    )
  );

-- spokedu_pro_observations
DROP POLICY IF EXISTS "observations_center_members" ON spokedu_pro_observations;
CREATE POLICY "observations_center_members" ON spokedu_pro_observations
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = (SELECT auth.uid())
    )
  );

-- spokedu_pro_ai_reports
DROP POLICY IF EXISTS "reports_center_members" ON spokedu_pro_ai_reports;
CREATE POLICY "reports_center_members" ON spokedu_pro_ai_reports
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = (SELECT auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- PART 2: Multiple Permissive Policies + Auth RLS fix
-- ────────────────────────────────────────────────────────────

-- center_equipment: FOR ALL(admin) + FOR SELECT(all) → separate into SELECT(all) + write(admin)
DROP POLICY IF EXISTS "center_equipment_admin_all" ON center_equipment;
DROP POLICY IF EXISTS "center_equipment_select_authenticated" ON center_equipment;
DROP POLICY IF EXISTS "center_equipment_select" ON center_equipment;
DROP POLICY IF EXISTS "center_equipment_admin_insert" ON center_equipment;
DROP POLICY IF EXISTS "center_equipment_admin_update" ON center_equipment;
DROP POLICY IF EXISTS "center_equipment_admin_delete" ON center_equipment;

CREATE POLICY "center_equipment_select" ON center_equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "center_equipment_admin_insert" ON center_equipment
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "center_equipment_admin_update" ON center_equipment
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "center_equipment_admin_delete" ON center_equipment
  FOR DELETE TO authenticated USING (is_admin());

-- center_equipment_guide: same pattern
DROP POLICY IF EXISTS "center_equipment_guide_admin_all" ON center_equipment_guide;
DROP POLICY IF EXISTS "center_equipment_guide_select_authenticated" ON center_equipment_guide;
DROP POLICY IF EXISTS "center_equipment_guide_select" ON center_equipment_guide;
DROP POLICY IF EXISTS "center_equipment_guide_admin_insert" ON center_equipment_guide;
DROP POLICY IF EXISTS "center_equipment_guide_admin_update" ON center_equipment_guide;
DROP POLICY IF EXISTS "center_equipment_guide_admin_delete" ON center_equipment_guide;

CREATE POLICY "center_equipment_guide_select" ON center_equipment_guide
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "center_equipment_guide_admin_insert" ON center_equipment_guide
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "center_equipment_guide_admin_update" ON center_equipment_guide
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "center_equipment_guide_admin_delete" ON center_equipment_guide
  FOR DELETE TO authenticated USING (is_admin());

-- spokedu_pro_programs: FOR SELECT(published) + FOR ALL(admin) → one SELECT + write policies
DROP POLICY IF EXISTS "programs_read_authenticated" ON spokedu_pro_programs;
DROP POLICY IF EXISTS "programs_all_admin" ON spokedu_pro_programs;
DROP POLICY IF EXISTS "programs_select" ON spokedu_pro_programs;
DROP POLICY IF EXISTS "programs_admin_insert" ON spokedu_pro_programs;
DROP POLICY IF EXISTS "programs_admin_update" ON spokedu_pro_programs;
DROP POLICY IF EXISTS "programs_admin_delete" ON spokedu_pro_programs;

CREATE POLICY "programs_select" ON spokedu_pro_programs
  FOR SELECT TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = (SELECT auth.uid())
      AND raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "programs_admin_insert" ON spokedu_pro_programs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid()) AND raw_app_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "programs_admin_update" ON spokedu_pro_programs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid()) AND raw_app_meta_data->>'role' = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid()) AND raw_app_meta_data->>'role' = 'admin'
  ));

CREATE POLICY "programs_admin_delete" ON spokedu_pro_programs
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid()) AND raw_app_meta_data->>'role' = 'admin'
  ));

-- spokedu_pro_students: drop ALL existing policies (handles unknown duplicates), then recreate
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'spokedu_pro_students' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.spokedu_pro_students', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "students_center_members" ON spokedu_pro_students
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = (SELECT auth.uid())
    )
  );

-- spokedu_pro_attendance: drop ALL existing policies (handles unknown duplicates), then recreate
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'spokedu_pro_attendance' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.spokedu_pro_attendance', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "attendance_center_members" ON spokedu_pro_attendance
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = (SELECT auth.uid())
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = (SELECT auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- PART 3: Duplicate Index Removal
-- ────────────────────────────────────────────────────────────

-- spokedu_pro_students: (center_id) is a left prefix of (center_id, name)
-- → drop the single-column index
DROP INDEX IF EXISTS idx_spokedu_pro_students_center;

-- spokedu_pro_attendance: (student_id) is a left prefix of the UNIQUE (student_id, date)
-- → drop the single-column index
DROP INDEX IF EXISTS idx_spokedu_pro_attendance_student;

SELECT 'RLS security warnings fixed.' AS status;
