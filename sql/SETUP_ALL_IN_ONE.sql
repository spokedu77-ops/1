-- ==========================================
-- IIW Warmup - Supabase SQL Editor 전체 실행용
-- 이 파일을 통째로 복사해서 SQL Editor에 붙여넣고 실행하세요
-- ==========================================

-- ============== STEP 1: 테이블 생성 ==============

CREATE TABLE IF NOT EXISTS iiwarmup_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 4),
  content_type TEXT NOT NULL CHECK (content_type IN ('html_code', 'html_file', 'url')),
  content TEXT,
  file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sports_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  duration INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== STEP 2: 인덱스 생성 ==============

CREATE INDEX IF NOT EXISTS idx_iiwarmup_year_month_week ON iiwarmup_programs(year, month, week);
CREATE INDEX IF NOT EXISTS idx_iiwarmup_active ON iiwarmup_programs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sports_videos_active ON sports_videos(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sports_videos_tags ON sports_videos USING GIN(tags);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_year_month_week ON iiwarmup_programs(year, month, week) WHERE is_active = true;

-- ============== STEP 3: 트리거 함수 및 트리거 ==============

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_iiwarmup_programs_updated_at ON iiwarmup_programs;
CREATE TRIGGER update_iiwarmup_programs_updated_at
  BEFORE UPDATE ON iiwarmup_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sports_videos_updated_at ON sports_videos;
CREATE TRIGGER update_sports_videos_updated_at
  BEFORE UPDATE ON sports_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============== STEP 4: RLS 활성화 ==============

ALTER TABLE iiwarmup_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_videos ENABLE ROW LEVEL SECURITY;

-- ============== STEP 5: RLS 정책 ==============

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

DROP POLICY IF EXISTS "Users can view active warmup programs" ON iiwarmup_programs;
CREATE POLICY "Users can view active warmup programs"
ON iiwarmup_programs
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);

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

DROP POLICY IF EXISTS "Users can view active sports videos" ON sports_videos;
CREATE POLICY "Users can view active sports videos"
ON sports_videos
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);

-- ============== STEP 6: 샘플 데이터 (선택사항, 주석 해제하여 사용) ==============

/*
INSERT INTO iiwarmup_programs (year, month, week, title, description, content_type, content, is_active)
VALUES 
  (2026, 1, 1, '1월 1주차 - 신년 달리기 웜업', '새해를 맞이하는 활기찬 달리기 웜업', 'url', 'https://example.com/warmup-jan-w1', true),
  (2026, 1, 2, '1월 2주차 - 점프 웜업', '점프 동작으로 심박수 올리기', 'url', 'https://example.com/warmup-jan-w2', true),
  (2026, 1, 3, '1월 3주차 - 스트레칭 웜업', '유연성 향상 스트레칭', 'url', 'https://example.com/warmup-jan-w3', true),
  (2026, 1, 4, '1월 4주차 - 종합 웜업', '다양한 동작 조합', 'url', 'https://example.com/warmup-jan-w4', true);

INSERT INTO sports_videos (title, description, video_url, thumbnail_url, duration, tags, is_active)
VALUES 
  ('달리기 게임 - 꼬리잡기', '재미있는 달리기 놀이', 'https://example.com/video1.mp4', 'https://example.com/thumb1.jpg', 180, ARRAY['달리기', '유아', '게임'], true),
  ('공놀이 - 패스 연습', '기본 패스 동작 익히기', 'https://example.com/video2.mp4', 'https://example.com/thumb2.jpg', 240, ARRAY['공놀이', '초등', '기초'], true),
  ('줄넘기 - 개인줄', '줄넘기 기초 연습', 'https://example.com/video3.mp4', 'https://example.com/thumb3.jpg', 300, ARRAY['줄넘기', '유아', '초등'], true),
  ('협동 게임 - 공 옮기기', '팀워크 향상 게임', 'https://example.com/video4.mp4', 'https://example.com/thumb4.jpg', 360, ARRAY['협동', '게임', '초등'], true);
*/

-- ============== 완료! ==============
-- 성공 메시지가 나오면 정상적으로 완료된 것입니다.
-- 다음 단계: Storage 버킷 생성 (README_실행순서.md 참고)
