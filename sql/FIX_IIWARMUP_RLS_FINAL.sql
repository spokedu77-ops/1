-- ========================================
-- I.I.Warm-up RLS 정책 최종 수정
-- (대소문자 문제 해결)
-- ========================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admin full access to warmup programs" ON iiwarmup_programs;
DROP POLICY IF EXISTS "Admin full access to sports videos" ON sports_videos;

-- 새 정책 생성 (is_admin() 함수 사용)
CREATE POLICY "Admin full access to warmup programs" 
ON iiwarmup_programs
FOR ALL
USING (is_admin());

CREATE POLICY "Admin full access to sports videos"
ON sports_videos
FOR ALL
USING (is_admin());

-- 확인
SELECT 
  'Policy Test' as test_name,
  is_admin() as is_admin_result,
  auth.uid() as user_id,
  CASE 
    WHEN is_admin() THEN '✅ 이제 모든 작업이 가능합니다!'
    ELSE '❌ 여전히 권한 없음'
  END as status;
