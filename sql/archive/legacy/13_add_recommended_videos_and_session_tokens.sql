-- ================================================================
-- recommended_videos 필드 추가 및 session_tokens 테이블 생성
-- ================================================================

-- 1. warmup_programs_composite에 recommended_videos 필드 추가
ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS recommended_videos UUID[] DEFAULT '{}';

-- 2. session_tokens 테이블 생성
CREATE TABLE IF NOT EXISTS session_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  week_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_session_tokens_token ON session_tokens(token);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires_at ON session_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_tokens_user_id ON session_tokens(user_id);

-- 4. 만료된 토큰 자동 삭제 함수 (선택적)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM session_tokens
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. RLS 정책 설정
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- Admin 전체 권한
CREATE POLICY "Admin full access to session tokens"
ON session_tokens
FOR ALL
USING (is_admin());

-- 사용자는 자신의 토큰만 조회 가능
CREATE POLICY "Users can read their own tokens"
ON session_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- 토큰 생성은 인증된 사용자만 가능
CREATE POLICY "Authenticated users can create tokens"
ON session_tokens
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ================================================================
-- 주석
-- ================================================================
-- recommended_videos: warmup_programs_composite 테이블에 추가된 필드
--   - UUID 배열로 추천 영상 ID들을 저장
--   - 예: ['uuid1', 'uuid2', 'uuid3']
--
-- session_tokens: 일회성 토큰 테이블
--   - iframe 접근 인증에 사용
--   - expires_at 이후 자동 만료
--   - used_at로 사용 여부 추적 가능
