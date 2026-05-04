-- SPOKEDU PRO 리드: 관리자 메모·상담 단계 타임스탬프·updated_at

ALTER TABLE public.spokedu_pro_leads
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 기존 행: updated_at이 방금 추가되면 NOT NULL DEFAULT로 이미 채워짐

DROP TRIGGER IF EXISTS trg_spokedu_pro_leads_updated_at ON public.spokedu_pro_leads;

CREATE TRIGGER trg_spokedu_pro_leads_updated_at
  BEFORE UPDATE ON public.spokedu_pro_leads
  FOR EACH ROW
  EXECUTE FUNCTION spokedu_pro_set_updated_at();
