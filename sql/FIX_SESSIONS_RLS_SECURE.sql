-- ================================================================
-- Sessions 테이블 RLS 정책 수정 (보안 강화)
-- 문제: sessions_insert_all 정책의 WITH CHECK (true)로 인한 보안 경고
-- 해결: SELECT는 열어두고, INSERT/UPDATE/DELETE만 제한적 접근
-- ================================================================

SELECT '🔧 Sessions 테이블 RLS 정책 수정 시작 (보안 강화)...' as status;

-- RLS 활성화 확인
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- sessions 테이블 정책 수정
-- ================================================================
-- 모든 기존 정책 삭제
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'sessions'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON sessions';
  END LOOP;
END $$;

-- SELECT: 모든 인증된 사용자 조회 가능 (보안 경고 없음 - SELECT는 허용됨)
CREATE POLICY "sessions_select_all" ON sessions
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: admin만 세션 생성 가능 (일반 사용자는 생성 불가)
CREATE POLICY "sessions_insert_admin_only" ON sessions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: 생성자 또는 admin만 수정 가능
CREATE POLICY "sessions_update_admin_or_creator" ON sessions
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    is_admin()
    OR created_by = auth.uid()
  );

-- DELETE: admin만 삭제 가능
CREATE POLICY "sessions_delete_admin" ON sessions
  FOR DELETE TO authenticated
  USING (is_admin());

SELECT '✅ sessions 테이블 정책 수정 완료' as status;

-- ================================================================
-- 최종 확인
-- ================================================================
SELECT 
  'Sessions 테이블 정책 확인' as info,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%true%' THEN '✅ SELECT는 허용됨 (보안 경고 없음)'
    WHEN cmd = 'INSERT' AND with_check LIKE '%true%' THEN '⚠️ 보안 경고 가능'
    WHEN cmd != 'SELECT' AND (qual LIKE '%true%' OR with_check LIKE '%true%') THEN '⚠️ 보안 경고 가능'
    ELSE '✅ 안전'
  END as security_status
FROM pg_policies
WHERE tablename = 'sessions'
ORDER BY cmd;

SELECT '🎉 Sessions 테이블 RLS 정책 수정 완료 (보안 강화)!' as final_status;
SELECT '✅ SELECT는 모든 사용자 접근 가능 (보안 경고 없음)' as result;
SELECT '✅ INSERT는 admin만 가능 (일반 사용자 생성 불가, 보안 강화)' as result;
SELECT '✅ UPDATE/DELETE는 생성자 또는 admin만 가능' as result;
SELECT '🔄 이제 페이지를 새로고침하세요!' as action;
