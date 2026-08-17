-- ================================================================
-- scenarios: 다중 permissive 정책 통합 (Admin + 사용자 draft 접근)
-- 동일 역할/액션에 대한 두 permissive 정책을 하나로 합쳐 경고 제거 및 평가 1회로 축소
-- 기능/권한 동작 변경 없음
-- 실행: 19_scenarios_unified.sql 적용 후, Supabase SQL Editor에서 실행
-- ================================================================

DROP POLICY IF EXISTS "Admin full access to scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can manage their own drafts" ON scenarios;

CREATE POLICY "Admin or owner draft access to scenarios"
ON scenarios FOR ALL
USING (
  is_admin()
  OR (
    is_draft = true
    AND owner_id = auth.uid()
    AND (deleted_at IS NULL OR deleted_at > NOW())
  )
)
WITH CHECK (
  is_admin()
  OR (
    is_draft = true
    AND owner_id = auth.uid()
    AND (deleted_at IS NULL OR deleted_at > NOW())
  )
);

-- ================================================================
SELECT 'Scenarios RLS single policy (31) applied.' AS status;
