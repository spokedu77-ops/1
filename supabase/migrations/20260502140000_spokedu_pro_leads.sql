-- SPOKEDU PRO 공개 랜딩 영업 리드 (구독/결제 테이블과 분리)
CREATE TABLE IF NOT EXISTS public.spokedu_pro_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  dojo_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  region text NOT NULL,
  interested_plan text NOT NULL,
  has_kids_class text NOT NULL,
  has_screen_equipment text NOT NULL,
  website_url text,
  message text,
  source text NOT NULL DEFAULT 'pro_landing',
  status text NOT NULL DEFAULT 'new',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.spokedu_pro_leads IS 'SPOKEDU PRO /pro 랜딩 베타·도입 문의 리드 (서버 API service_role insert 전용)';

CREATE INDEX IF NOT EXISTS spokedu_pro_leads_created_at_idx ON public.spokedu_pro_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS spokedu_pro_leads_status_idx ON public.spokedu_pro_leads (status);
CREATE INDEX IF NOT EXISTS spokedu_pro_leads_interested_plan_idx ON public.spokedu_pro_leads (interested_plan);

ALTER TABLE public.spokedu_pro_leads ENABLE ROW LEVEL SECURITY;

-- 정책 없음: anon/authenticated JWT 경로에서는 RLS로 insert/select 불가.
-- Supabase service_role 클라이언트는 RLS를 우회하여 API에서만 저장.
