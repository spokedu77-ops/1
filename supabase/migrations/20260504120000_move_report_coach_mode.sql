-- Coach Link Mode: 교육자 전용 링크 + 응답 집계용 coach_slug
CREATE TABLE IF NOT EXISTS public.move_report_coach_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  org_name TEXT NOT NULL,
  role TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  contact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_move_report_coach_links_created_at
  ON public.move_report_coach_links (created_at DESC);

ALTER TABLE public.move_report_coach_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "move_report_coach_links_service_role" ON public.move_report_coach_links;
CREATE POLICY "move_report_coach_links_service_role"
  ON public.move_report_coach_links
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

ALTER TABLE public.move_report_submissions
  ADD COLUMN IF NOT EXISTS coach_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_move_report_submissions_coach_slug
  ON public.move_report_submissions (coach_slug)
  WHERE coach_slug IS NOT NULL;

COMMENT ON COLUMN public.move_report_submissions.coach_slug IS 'move_report_coach_links.slug — 집계용, 개별 리포트와 무관';
