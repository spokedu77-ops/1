-- 강사관리 "종료 예정" 탭용 플래그
-- users 테이블에 ending_soon 컬럼 추가 (관리자가 종료 예정으로 지정한 강사만 해당 탭에 표시)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS ending_soon BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.users.ending_soon IS 'true: 종료 예정 탭에 표시 (is_active=true인 경우에만 의미 있음)';
