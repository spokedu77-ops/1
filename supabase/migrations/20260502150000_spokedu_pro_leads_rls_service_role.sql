-- Advisor: RLS enabled but no policies → service_role 전용 정책 명시
-- anon/authenticated JWT는 여전히 접근 불가 (조건 불만족)

DROP POLICY IF EXISTS "spokedu_pro_leads_service_role_all" ON public.spokedu_pro_leads;

CREATE POLICY "spokedu_pro_leads_service_role_all"
  ON public.spokedu_pro_leads
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
