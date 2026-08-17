-- 강사 등급별 기본 수업료(관리자 덮어쓰기 가능). NULL = 등급표 기준으로 화면에서 해석
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fee_private integer,
  ADD COLUMN IF NOT EXISTS fee_group integer,
  ADD COLUMN IF NOT EXISTS fee_center_main integer,
  ADD COLUMN IF NOT EXISTS fee_center_assist integer,
  ADD COLUMN IF NOT EXISTS fee_auto_from_tier boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.fee_private IS '기본 개인 수업료(원). NULL이면 현재 등급 표 적용';
COMMENT ON COLUMN public.users.fee_group IS '기본 그룹 수업료(원). NULL이면 현재 등급 표 적용';
COMMENT ON COLUMN public.users.fee_center_main IS '기본 센터 메인 수업료(원). NULL이면 현재 등급 표 적용';
COMMENT ON COLUMN public.users.fee_center_assist IS '기본 센터 보조 수업료(원). NULL이면 현재 등급 표 적용';
COMMENT ON COLUMN public.users.fee_auto_from_tier IS '등급표 일괄 적용 시 true 권장; 수동 수정 후 false로 둘 수 있음';
