-- =============================================================
-- 56_create_postpone_notices.sql
-- 목적: 수업 연기 알림 전용 테이블 생성
--       기존 users.vacation 텍스트 파싱 방식을 구조화된 테이블로 대체
-- =============================================================

CREATE TABLE IF NOT EXISTS public.postpone_notices (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notice_date date        NOT NULL,
  memo        text,
  created_at  timestamptz DEFAULT now()
);

-- 조회 인덱스
CREATE INDEX IF NOT EXISTS postpone_notices_notice_date_idx
  ON public.postpone_notices (notice_date);

CREATE INDEX IF NOT EXISTS postpone_notices_teacher_id_idx
  ON public.postpone_notices (teacher_id);

-- RLS 활성화
ALTER TABLE public.postpone_notices ENABLE ROW LEVEL SECURITY;

-- 관리자만 CRUD 가능 (service role은 bypass)
CREATE POLICY "admin_all" ON public.postpone_notices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================
-- 검증
-- =============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'postpone_notices'
ORDER BY ordinal_position;
-- 결과가 5행이면 정상 생성됨
