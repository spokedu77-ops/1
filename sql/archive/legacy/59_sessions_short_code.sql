-- ==========================================
-- sessions.short_code (단축 리포트 URL)
-- - 6자리 대문자+숫자 (A-Z0-9)
-- - 관리자: /api/admin/session-short-code 로 발급/반환
-- - 퍼블릭: /r/[code] 로 /report/[id] 308 리다이렉트
-- ==========================================

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS short_code VARCHAR(8);

-- 단축코드 유니크 (NULL은 여러 건 허용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_short_code_unique
ON public.sessions (short_code);

