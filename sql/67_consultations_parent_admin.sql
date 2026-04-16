-- 상담 신청 테이블 통합 스키마 (학부모 /consult, private 랜딩, 관리자 목록 공통)
-- Supabase SQL Editor에서 한 번 실행하세요. 기존 sql/66 이후 실행하면 name → parent_name 으로 이전됩니다.

CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name text NOT NULL,
  phone text,
  content text NOT NULL,
  child_age text,
  consult_type text NOT NULL DEFAULT 'tutoring',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultations_status_check CHECK (status = ANY (ARRAY['pending'::text, 'done'::text])),
  CONSTRAINT consultations_type_check CHECK (consult_type = ANY (ARRAY['tutoring'::text, 'center'::text]))
);

ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS child_age text;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS consult_type text;
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS status text;

-- sql/66 레거시: name 컬럼 → parent_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'consultations' AND column_name = 'name'
  ) THEN
    UPDATE public.consultations
    SET parent_name = COALESCE(NULLIF(trim(name), ''), '(미입력)')
    WHERE parent_name IS NULL OR trim(parent_name) = '';
    ALTER TABLE public.consultations DROP COLUMN name;
  END IF;
END $$;

UPDATE public.consultations SET consult_type = 'tutoring' WHERE consult_type IS NULL;
UPDATE public.consultations SET status = 'pending' WHERE status IS NULL;
UPDATE public.consultations SET parent_name = COALESCE(NULLIF(trim(parent_name), ''), '(미입력)')
WHERE parent_name IS NULL OR trim(parent_name) = '';

ALTER TABLE public.consultations ALTER COLUMN parent_name SET NOT NULL;
ALTER TABLE public.consultations ALTER COLUMN consult_type SET NOT NULL;
ALTER TABLE public.consultations ALTER COLUMN consult_type SET DEFAULT 'tutoring';
ALTER TABLE public.consultations ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.consultations ALTER COLUMN status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultations_status_check'
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_status_check CHECK (status = ANY (ARRAY['pending'::text, 'done'::text]));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultations_type_check'
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_type_check CHECK (consult_type = ANY (ARRAY['tutoring'::text, 'center'::text]));
  END IF;
END $$;

COMMENT ON TABLE public.consultations IS '스포키듀 상담 신청 (private 랜딩·/consult·관리자)';

CREATE INDEX IF NOT EXISTS consultations_created_at_idx ON public.consultations (created_at DESC);
CREATE INDEX IF NOT EXISTS consultations_status_idx ON public.consultations (status);
CREATE INDEX IF NOT EXISTS consultations_type_idx ON public.consultations (consult_type);
