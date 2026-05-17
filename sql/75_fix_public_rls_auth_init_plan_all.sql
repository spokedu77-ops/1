-- ================================================================
-- Fix: Auth RLS Initialization Plan (public 스키마 전체)
--
-- 목적:
--   public 스키마의 RLS 정책식(USING / WITH CHECK)에서
--   - auth.uid()
--   - auth.role()
--   - current_setting(...)
-- 를 statement-level 평가 패턴으로 통일:
--   (SELECT auth.uid())
--   (SELECT auth.role())
--   (SELECT current_setting(...))
--
-- 주의:
--   - 이미 (SELECT ...) 형태인 식은 보호 토큰으로 보존 후 복원하여 중복 래핑 방지.
--   - 정책명/테이블명은 그대로, 정책식만 ALTER POLICY로 수정.
-- ================================================================

DO $$
DECLARE
  p RECORD;
  new_using TEXT;
  new_check TEXT;
  changed_count INTEGER := 0;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~* 'auth\.uid\(\)|auth\.role\(\)|current_setting\('
        OR coalesce(with_check, '') ~* 'auth\.uid\(\)|auth\.role\(\)|current_setting\('
      )
  LOOP
    new_using := p.qual;
    new_check := p.with_check;

    -- ---------- USING ----------
    IF new_using IS NOT NULL THEN
      -- 이미 subselect인 형태 보호
      new_using := regexp_replace(
        new_using,
        '\(\s*select\s+auth\.uid\(\)\s*\)',
        '__AUTH_UID_SUBSELECT__',
        'gi'
      );
      new_using := regexp_replace(
        new_using,
        '\(\s*select\s+auth\.role\(\)\s*\)',
        '__AUTH_ROLE_SUBSELECT__',
        'gi'
      );
      new_using := regexp_replace(
        new_using,
        '\(\s*select\s+current_setting\(([^)]*)\)\s*\)',
        '__CURRENT_SETTING_SUBSELECT__(\1)',
        'gi'
      );

      -- direct 호출 치환
      new_using := regexp_replace(new_using, 'auth\.uid\(\)', '(SELECT auth.uid())', 'gi');
      new_using := regexp_replace(new_using, 'auth\.role\(\)', '(SELECT auth.role())', 'gi');
      new_using := regexp_replace(
        new_using,
        'current_setting\(([^)]*)\)',
        '(SELECT current_setting(\1))',
        'gi'
      );

      -- 보호 토큰 복원
      new_using := replace(new_using, '__AUTH_UID_SUBSELECT__', '(SELECT auth.uid())');
      new_using := replace(new_using, '__AUTH_ROLE_SUBSELECT__', '(SELECT auth.role())');
      new_using := regexp_replace(
        new_using,
        '__CURRENT_SETTING_SUBSELECT__\(([^)]*)\)',
        '(SELECT current_setting(\1))',
        'gi'
      );
    END IF;

    -- ---------- WITH CHECK ----------
    IF new_check IS NOT NULL THEN
      -- 이미 subselect인 형태 보호
      new_check := regexp_replace(
        new_check,
        '\(\s*select\s+auth\.uid\(\)\s*\)',
        '__AUTH_UID_SUBSELECT__',
        'gi'
      );
      new_check := regexp_replace(
        new_check,
        '\(\s*select\s+auth\.role\(\)\s*\)',
        '__AUTH_ROLE_SUBSELECT__',
        'gi'
      );
      new_check := regexp_replace(
        new_check,
        '\(\s*select\s+current_setting\(([^)]*)\)\s*\)',
        '__CURRENT_SETTING_SUBSELECT__(\1)',
        'gi'
      );

      -- direct 호출 치환
      new_check := regexp_replace(new_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'gi');
      new_check := regexp_replace(new_check, 'auth\.role\(\)', '(SELECT auth.role())', 'gi');
      new_check := regexp_replace(
        new_check,
        'current_setting\(([^)]*)\)',
        '(SELECT current_setting(\1))',
        'gi'
      );

      -- 보호 토큰 복원
      new_check := replace(new_check, '__AUTH_UID_SUBSELECT__', '(SELECT auth.uid())');
      new_check := replace(new_check, '__AUTH_ROLE_SUBSELECT__', '(SELECT auth.role())');
      new_check := regexp_replace(
        new_check,
        '__CURRENT_SETTING_SUBSELECT__\(([^)]*)\)',
        '(SELECT current_setting(\1))',
        'gi'
      );
    END IF;

    -- 변경분이 있을 때만 ALTER
    IF coalesce(new_using, '') <> coalesce(p.qual, '')
       OR coalesce(new_check, '') <> coalesce(p.with_check, '')
    THEN
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

      changed_count := changed_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'RLS policy expressions updated: %', changed_count;
END
$$;

-- ================================================================
-- 재발/잔여 점검 쿼리:
-- direct auth.*()/current_setting() 호출이 남아있는 정책 확인
-- (이미 subselect로 감싼 형태는 제외)
-- ================================================================
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (
      coalesce(qual, '') ~* 'auth\.uid\(\)|auth\.role\(\)|current_setting\('
      AND coalesce(qual, '') !~* '\(\s*select\s+auth\.uid\(\)\s*\)|\(\s*select\s+auth\.role\(\)\s*\)|\(\s*select\s+current_setting\('
    )
    OR
    (
      coalesce(with_check, '') ~* 'auth\.uid\(\)|auth\.role\(\)|current_setting\('
      AND coalesce(with_check, '') !~* '\(\s*select\s+auth\.uid\(\)\s*\)|\(\s*select\s+auth\.role\(\)\s*\)|\(\s*select\s+current_setting\('
    )
  )
ORDER BY tablename, policyname;

SELECT 'fixed auth rls initialization plan for public policies (75)' AS status;
