-- ================================================================
-- Fix: Auth RLS Initialization Plan (performance advisor)
-- 대상 정책:
--   - public.spokedu_master_subscriptions / spm_sub_select_own
--   - public.camera_activity_participants / camera_activity_participants_owner_insert
--   - public.camera_activity_sessions / camera_activity_sessions_owner_update
--   - public.camera_control_sessions / camera_control_sessions_owner_update
--
-- 원칙:
--   auth.uid() / auth.role() 를 (SELECT auth.uid()) / (SELECT auth.role())로 치환
--   (행마다 재평가 방지)
-- ================================================================

DO $$
DECLARE
  p RECORD;
  new_using TEXT;
  new_check TEXT;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE (schemaname, tablename, policyname) IN (
      ('public', 'spokedu_master_subscriptions', 'spm_sub_select_own'),
      ('public', 'camera_activity_participants', 'camera_activity_participants_owner_insert'),
      ('public', 'camera_activity_sessions', 'camera_activity_sessions_owner_update'),
      ('public', 'camera_control_sessions', 'camera_control_sessions_owner_update')
    )
  LOOP
    new_using := p.qual;
    new_check := p.with_check;

    IF new_using IS NOT NULL THEN
      new_using := regexp_replace(new_using, 'auth\.uid\(\)', '(SELECT auth.uid())', 'gi');
      new_using := regexp_replace(new_using, 'auth\.role\(\)', '(SELECT auth.role())', 'gi');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'gi');
      new_check := regexp_replace(new_check, 'auth\.role\(\)', '(SELECT auth.role())', 'gi');
    END IF;

    IF new_using IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
        p.policyname, p.schemaname, p.tablename, new_using, new_check
      );
    ELSIF new_using IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        p.policyname, p.schemaname, p.tablename, new_using
      );
    ELSIF new_check IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        p.policyname, p.schemaname, p.tablename, new_check
      );
    END IF;
  END LOOP;
END
$$;

-- ================================================================
-- Guard query (재발 방지 점검용)
-- 정책식에 auth.uid()/auth.role()가 직접 들어간 정책을 확인
-- ================================================================
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    coalesce(qual, '') ~* 'auth\.(uid|role)\(\)'
    OR coalesce(with_check, '') ~* 'auth\.(uid|role)\(\)'
  )
ORDER BY tablename, policyname;

SELECT 'fixed auth rls initialization plan for selected policies (74)' AS status;
