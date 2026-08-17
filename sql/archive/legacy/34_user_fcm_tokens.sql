-- ========================================
-- FCM 푸시 알림: 사용자별 디바이스 토큰 저장
-- 실행 순서: 34번 (PWA+FCM 사용 시)
-- ========================================

-- 테이블: user_fcm_tokens (한 사용자 여러 기기 가능)
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(token)
);

-- 인덱스: 사용자별 토큰 조회
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);

-- RLS
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 본인 토큰만 조회/등록/수정/삭제
CREATE POLICY "Users manage own fcm tokens"
  ON user_fcm_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 서버(Edge Function/Webhook)에서 참여자 토큰 조회용: service_role로 호출하거나
-- 푸시 발송 API가 서버에서 Supabase service role 사용 시 RLS 우회됨.
-- (일반 anon/authenticated는 본인 행만 접근)

COMMENT ON TABLE user_fcm_tokens IS 'FCM 푸시 알림용 디바이스 토큰 (PWA)';
