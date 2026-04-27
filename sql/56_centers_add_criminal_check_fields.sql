-- =============================================================
-- 56_centers_add_criminal_check_fields.sql
-- 목적: 센터에 범죄경력조회 시설 계정/첨부를 저장합니다.
--  - criminal_check_facility_id: 시설 아이디
--  - criminal_check_facility_password: 시설 비밀번호
--  - criminal_check_files: 한글/워드 등 첨부 파일 목록 (jsonb)
-- =============================================================

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS criminal_check_facility_id text NULL;

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS criminal_check_facility_password text NULL;

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS criminal_check_files jsonb NOT NULL DEFAULT '[]';

-- =============================================================
-- 검증
-- =============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'centers'
  AND column_name IN (
    'criminal_check_facility_id',
    'criminal_check_facility_password',
    'criminal_check_files'
  )
ORDER BY column_name;
