-- SPOKEDU PRO 리드: 체험 계정 안내용 이메일 (기존 행은 null)

ALTER TABLE public.spokedu_pro_leads
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.spokedu_pro_leads.email IS '체험·안내용 이메일 (신규 신청 API에서 필수 검증)';
