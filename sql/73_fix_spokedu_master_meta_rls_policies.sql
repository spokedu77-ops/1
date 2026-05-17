-- ================================================================
-- Fix: RLS Enabled No Policy (security advisor)
-- 대상:
--   - public.spokedu_master_program_meta
--   - public.spokedu_master_drill_meta
--
-- 의도:
--   - 기존 운영 의도(서버 service_role 경유 접근) 유지
--   - anon/authenticated 직접 접근은 계속 불가
-- ================================================================

ALTER TABLE public.spokedu_master_program_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spokedu_master_drill_meta ENABLE ROW LEVEL SECURITY;

-- 중복 실행 대비
DROP POLICY IF EXISTS spm_program_meta_service_role_all ON public.spokedu_master_program_meta;
DROP POLICY IF EXISTS spm_drill_meta_service_role_all ON public.spokedu_master_drill_meta;

-- service_role만 전체 권한 허용
CREATE POLICY spm_program_meta_service_role_all
  ON public.spokedu_master_program_meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY spm_drill_meta_service_role_all
  ON public.spokedu_master_drill_meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

SELECT 'fixed rls enabled no policy for spokedu_master_meta tables (73)' AS status;
