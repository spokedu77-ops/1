-- ============================================================
-- SPOKEDU PRO — 상업 배포 DB 마이그레이션
-- 생성일: 2026-03-08
-- 목적: MVP 이후 상업 배포에 필요한 테이블 추가
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. 센터 (멀티 테넌트)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_centers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_centers_owner ON spokedu_pro_centers(owner_id);

-- RLS
ALTER TABLE spokedu_pro_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center_owner_all" ON spokedu_pro_centers
  FOR ALL USING (auth.uid() = owner_id);

-- ────────────────────────────────────────────────────────────
-- 2. 센터 멤버 (owner / admin / coach)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_center_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id  UUID NOT NULL REFERENCES spokedu_pro_centers(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'coach')) DEFAULT 'coach',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (center_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_members_user ON spokedu_pro_center_members(user_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_members_center ON spokedu_pro_center_members(center_id);

ALTER TABLE spokedu_pro_center_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_read_own_center" ON spokedu_pro_center_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR center_id IN (
      SELECT id FROM spokedu_pro_centers WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. 구독 (결제 연동)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id              UUID NOT NULL REFERENCES spokedu_pro_centers(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL CHECK (plan IN ('free', 'basic', 'pro')) DEFAULT 'free',
  status                 TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')) DEFAULT 'active',
  stripe_subscription_id TEXT,
  stripe_customer_id     TEXT,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  trial_end              TIMESTAMPTZ,
  canceled_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (center_id)
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_subscriptions_center ON spokedu_pro_subscriptions(center_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_subscriptions_stripe ON spokedu_pro_subscriptions(stripe_subscription_id);

ALTER TABLE spokedu_pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_read_owner" ON spokedu_pro_subscriptions
  FOR SELECT USING (
    center_id IN (
      SELECT id FROM spokedu_pro_centers WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. 프로그램 뱅크 (목 데이터 → 실제 콘텐츠)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_programs (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  theme_key       TEXT NOT NULL CHECK (theme_key IN ('intro','co-op','speed-reaction','cognitive','challenge','tag-duel','variant-sports')),
  theme_label     TEXT NOT NULL,
  role            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('Play','Think','Grow')),
  gradient_class  TEXT NOT NULL DEFAULT 'from-blue-500 to-indigo-600',
  video_url       TEXT,
  description     TEXT,
  target_brain    TEXT,
  target_physic   TEXT,
  tool            TEXT,
  setup_guide     TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_programs_theme ON spokedu_pro_programs(theme_key);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_programs_category ON spokedu_pro_programs(category);

-- 프로그램은 퍼블릭 읽기 (인증 사용자 전체)
ALTER TABLE spokedu_pro_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs_read_authenticated" ON spokedu_pro_programs
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_published = true);

CREATE POLICY "programs_all_admin" ON spokedu_pro_programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_app_meta_data->>'role' = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. 학생 (원생) 관리
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id    UUID NOT NULL REFERENCES spokedu_pro_centers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  birth_date   DATE,
  class_group  TEXT,          -- 수업 반 (예: "유치부 인지반")
  enrolled_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'graduated')) DEFAULT 'active',
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_students_center ON spokedu_pro_students(center_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_students_status ON spokedu_pro_students(status);

ALTER TABLE spokedu_pro_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_center_members" ON spokedu_pro_students
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. 출결 기록
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES spokedu_pro_students(id) ON DELETE CASCADE,
  center_id   UUID NOT NULL REFERENCES spokedu_pro_centers(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  note        TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_attendance_student ON spokedu_pro_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_attendance_date ON spokedu_pro_attendance(date);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_attendance_center_date ON spokedu_pro_attendance(center_id, date);

ALTER TABLE spokedu_pro_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_center_members" ON spokedu_pro_attendance
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. 관찰 기록 (수업 일지)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_observations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES spokedu_pro_students(id) ON DELETE CASCADE,
  center_id   UUID NOT NULL REFERENCES spokedu_pro_centers(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  goal        TEXT CHECK (goal IN ('Think', 'Play', 'Grow')),
  note        TEXT NOT NULL,
  program_id  INT REFERENCES spokedu_pro_programs(id),
  teacher_id  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_obs_student ON spokedu_pro_observations(student_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_obs_center ON spokedu_pro_observations(center_id);

ALTER TABLE spokedu_pro_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "observations_center_members" ON spokedu_pro_observations
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = auth.uid()
    )
  );



-- ────────────────────────────────────────────────────────────
-- 10. AI 리포트 이력
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spokedu_pro_ai_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES spokedu_pro_students(id) ON DELETE CASCADE,
  center_id   UUID NOT NULL REFERENCES spokedu_pro_centers(id) ON DELETE CASCADE,
  goal        TEXT,
  content     TEXT NOT NULL,   -- 생성된 리포트 전문 (마크다운)
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_reports_student ON spokedu_pro_ai_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_reports_center ON spokedu_pro_ai_reports(center_id);

ALTER TABLE spokedu_pro_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_center_members" ON spokedu_pro_ai_reports
  FOR ALL USING (
    center_id IN (
      SELECT center_id FROM spokedu_pro_center_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM spokedu_pro_centers WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- updated_at 자동 갱신 트리거 함수
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION spokedu_pro_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'spokedu_pro_centers',
    'spokedu_pro_subscriptions',
    'spokedu_pro_programs',
    'spokedu_pro_students',
    'spokedu_pro_observations'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
       CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION spokedu_pro_set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END;
$$;
