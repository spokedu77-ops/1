-- ========================================
-- IIW Warmup 시스템 DB 스키마
-- 실행 순서: 1번
-- ========================================

-- 1. 웜업 프로그램 테이블 (주차별)
CREATE TABLE IF NOT EXISTS iiwarmup_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 기본 정보
  title TEXT NOT NULL,
  description TEXT,
  
  -- 시간 정보 (년/월/주차)
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 4),
  
  -- 컨텐츠 (3가지 방식 중 1개 사용)
  content_type TEXT NOT NULL CHECK (content_type IN ('html_code', 'html_file', 'url')),
  content TEXT,           -- HTML 코드 또는 URL
  file_url TEXT,          -- Supabase Storage에 업로드된 HTML 파일
  
  -- 구독/공개 설정
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  
  -- 메타데이터
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 놀이체육 영상 테이블
CREATE TABLE IF NOT EXISTS sports_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 기본 정보
  title TEXT NOT NULL,
  description TEXT,
  
  -- 영상 관련
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  duration INTEGER,  -- 초 단위
  
  -- 태그 (분류용)
  tags TEXT[] DEFAULT '{}',
  
  -- 공개 설정
  is_active BOOLEAN DEFAULT true,
  
  -- 메타데이터
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_iiwarmup_year_month_week 
  ON iiwarmup_programs(year, month, week);

CREATE INDEX IF NOT EXISTS idx_iiwarmup_active 
  ON iiwarmup_programs(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sports_videos_active 
  ON sports_videos(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sports_videos_tags 
  ON sports_videos USING GIN(tags);

-- 4. 유니크 제약 (같은 년/월/주에 웜업 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_year_month_week 
  ON iiwarmup_programs(year, month, week) 
  WHERE is_active = true;

-- 5. 업데이트 트리거 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_iiwarmup_programs_updated_at
  BEFORE UPDATE ON iiwarmup_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sports_videos_updated_at
  BEFORE UPDATE ON sports_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
