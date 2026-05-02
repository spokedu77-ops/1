-- 교육자 베타 신청 리드 (전화 설문 리드 move_report_leads와 분리)
CREATE TABLE IF NOT EXISTS public.move_report_educator_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  role TEXT NOT NULL,
  organization TEXT,
  target_age_group TEXT NOT NULL,
  needed_feature TEXT NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'move_report_result_cta',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_move_report_educator_leads_created_at
  ON public.move_report_educator_leads (created_at DESC);

ALTER TABLE public.move_report_educator_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "move_report_educator_leads_service_role" ON public.move_report_educator_leads;
CREATE POLICY "move_report_educator_leads_service_role"
  ON public.move_report_educator_leads
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
