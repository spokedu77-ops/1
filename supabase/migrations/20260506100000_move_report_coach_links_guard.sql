-- Coach 링크 남용 방지: 활성 플래그 + 생성 출처 IP
ALTER TABLE public.move_report_coach_links
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_from_ip TEXT;

COMMENT ON COLUMN public.move_report_coach_links.is_active IS 'false면 제출·대시보드 집계에서 제외';
COMMENT ON COLUMN public.move_report_coach_links.created_from_ip IS '생성 요청 시 클라이언트 IP(프록시 헤더 기준), 일일 생성 제한용';
