-- Phase 2 additions: extra columns + proper student/attendance tables
-- Run after 20260308000000_spokedu_pro_commercial.sql

-- 1. spokedu_pro_centers: address, phone 컬럼 추가
ALTER TABLE public.spokedu_pro_centers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. spokedu_pro_subscriptions: soft-cancel 지원
ALTER TABLE public.spokedu_pro_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. 원생 테이블 (proper, multi-tenant)
CREATE TABLE IF NOT EXISTS public.spokedu_pro_students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id     UUID NOT NULL REFERENCES public.spokedu_pro_centers(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  birthdate     DATE,
  phone         TEXT,
  parent_phone  TEXT,
  physical_scores JSONB DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spokedu_pro_students_center_id_idx
  ON public.spokedu_pro_students(center_id);

CREATE INDEX IF NOT EXISTS spokedu_pro_students_center_status_idx
  ON public.spokedu_pro_students(center_id, status);

-- 4. 출석 테이블 (proper, upsert-friendly)
CREATE TABLE IF NOT EXISTS public.spokedu_pro_attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id  UUID NOT NULL REFERENCES public.spokedu_pro_centers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.spokedu_pro_students(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS spokedu_pro_attendance_center_date_idx
  ON public.spokedu_pro_attendance(center_id, date);

-- 5. RLS
ALTER TABLE public.spokedu_pro_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spokedu_pro_attendance ENABLE ROW LEVEL SECURITY;

-- helper: is the user a member of the center?
CREATE OR REPLACE FUNCTION public.spokedu_pro_is_center_member(p_center_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spokedu_pro_center_members
    WHERE center_id = p_center_id AND user_id = auth.uid()
  );
$$;

-- students: center members can read/write
DROP POLICY IF EXISTS "students_center_member" ON public.spokedu_pro_students;
CREATE POLICY "students_center_member" ON public.spokedu_pro_students
  FOR ALL USING (public.spokedu_pro_is_center_member(center_id));

-- attendance: center members can read/write
DROP POLICY IF EXISTS "attendance_center_member" ON public.spokedu_pro_attendance;
CREATE POLICY "attendance_center_member" ON public.spokedu_pro_attendance
  FOR ALL USING (public.spokedu_pro_is_center_member(center_id));
