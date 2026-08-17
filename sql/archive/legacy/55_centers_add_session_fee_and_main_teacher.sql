-- =============================================================
-- 55_centers_add_session_fee_and_main_teacher.sql
-- 목적: 센터 관리에 회당 수업료(session_fee)와
--       메인 강사 연동(main_teacher_id) 컬럼을 추가합니다.
-- =============================================================

-- ① 회당 수업료 컬럼 추가 (nullable, 0 이상 정수)
ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS session_fee integer NULL CHECK (session_fee >= 0);

-- ② 메인 강사 UUID 컬럼 추가 (nullable, users 테이블 FK)
ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS main_teacher_id uuid NULL;

-- ③ FK 제약 추가 (강사 삭제 시 NULL 처리)
ALTER TABLE public.centers
  DROP CONSTRAINT IF EXISTS centers_main_teacher_id_fkey;

ALTER TABLE public.centers
  ADD CONSTRAINT centers_main_teacher_id_fkey
    FOREIGN KEY (main_teacher_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL;

-- ④ 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS centers_main_teacher_id_idx
  ON public.centers (main_teacher_id);

-- =============================================================
-- 검증
-- =============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'centers'
  AND column_name IN ('session_fee', 'main_teacher_id')
ORDER BY column_name;
-- 결과가 2행이면 정상 추가됨
