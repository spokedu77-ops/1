-- ========================================
-- IIW Warmup RLS 정책
-- 실행 순서: 2번 (01번 완료 후)
-- ========================================

-- 1. RLS 활성화
ALTER TABLE iiwarmup_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_videos ENABLE ROW LEVEL SECURITY;

-- 2. iiwarmup_programs 정책

-- Admin: 모든 권한
DROP POLICY IF EXISTS "Admin full access to warmup programs" ON iiwarmup_programs;
CREATE POLICY "Admin full access to warmup programs" 
ON iiwarmup_programs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'ADMIN'
  )
);

-- 구독자: 읽기만 (향후 구독 테이블 연동 시 수정)
-- 현재는 모든 로그인 사용자가 활성화된 프로그램 조회 가능
DROP POLICY IF EXISTS "Users can view active warmup programs" ON iiwarmup_programs;
CREATE POLICY "Users can view active warmup programs"
ON iiwarmup_programs
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);

-- 3. sports_videos 정책

-- Admin: 모든 권한
DROP POLICY IF EXISTS "Admin full access to sports videos" ON sports_videos;
CREATE POLICY "Admin full access to sports videos"
ON sports_videos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'ADMIN'
  )
);

-- 구독자: 읽기만
DROP POLICY IF EXISTS "Users can view active sports videos" ON sports_videos;
CREATE POLICY "Users can view active sports videos"
ON sports_videos
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);
