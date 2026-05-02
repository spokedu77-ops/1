-- Supabase advisor: RLS에서 auth.role() 행마다 재평가 방지 → (SELECT auth.role()) 한 번 평가
-- 구버 정책이 이미 적용된 환경용 보정 (idempotent)
-- 대상: move_report_coach_links, move_report_educator_leads

DROP POLICY IF EXISTS "move_report_coach_links_service_role" ON public.move_report_coach_links;

CREATE POLICY "move_report_coach_links_service_role"
  ON public.move_report_coach_links
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "move_report_educator_leads_service_role" ON public.move_report_educator_leads;

CREATE POLICY "move_report_educator_leads_service_role"
  ON public.move_report_educator_leads
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
