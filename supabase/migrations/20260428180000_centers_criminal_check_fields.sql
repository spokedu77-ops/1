-- 센터: 범죄경력조회 시설 계정·첨부 (앱 updateCenter와 동기화)

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS criminal_check_facility_id text NULL;

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS criminal_check_facility_password text NULL;

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS criminal_check_files jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.centers.criminal_check_facility_id IS '범죄경력조회 시설 아이디';
COMMENT ON COLUMN public.centers.criminal_check_facility_password IS '범죄경력조회 시설 비밀번호';
COMMENT ON COLUMN public.centers.criminal_check_files IS '범죄경력조회 첨부 메타 (name, path json 배열)';
