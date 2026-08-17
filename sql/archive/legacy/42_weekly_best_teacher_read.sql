-- 선생님(인증 사용자)이 주간베스트 목록/상세 조회 가능하도록 SELECT 정책 추가
-- INSERT/UPDATE/DELETE는 기존대로 admin만 가능

DROP POLICY IF EXISTS "weekly_best_select_authenticated" ON weekly_best;
CREATE POLICY "weekly_best_select_authenticated" ON weekly_best
  FOR SELECT TO authenticated
  USING (true);
