-- 개인 수업 커리큘럼 (종목·하위탭 기준, 월/주차 아님)
CREATE TABLE IF NOT EXISTS personal_curriculum (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  sub_tab TEXT NOT NULL,
  title TEXT,
  url TEXT,
  type TEXT,
  thumbnail TEXT,
  expert_tip TEXT,
  check_list TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  steps TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_curriculum_category_sub ON personal_curriculum (category, sub_tab);

COMMENT ON TABLE personal_curriculum IS '개인 수업 커리큘럼 (신체기능향상/달리기/줄넘기/인라인/자전거/축구/농구/배드민턴/수행평가/유아체육 등 종목·하위탭 기준)';

-- RLS 활성화 (Supabase Security 경고 해소)
ALTER TABLE personal_curriculum ENABLE ROW LEVEL SECURITY;

-- Admin: 전체 CRUD (is_admin() 함수 사용, 프로젝트 기존 패턴)
DROP POLICY IF EXISTS "personal_curriculum_admin_all" ON personal_curriculum;
CREATE POLICY "personal_curriculum_admin_all" ON personal_curriculum
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 인증 사용자(선생님 포함): 조회만 가능
DROP POLICY IF EXISTS "personal_curriculum_select_authenticated" ON personal_curriculum;
CREATE POLICY "personal_curriculum_select_authenticated" ON personal_curriculum
  FOR SELECT TO authenticated
  USING (true);
