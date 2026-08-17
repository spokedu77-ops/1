-- ================================================================
-- 완전한 웜업 시스템 설정 (통합 실행)
-- 이 파일을 Supabase SQL Editor에서 한 번에 실행하세요
-- ================================================================

-- ================================================================
-- 1. is_admin() 함수 생성 (없는 경우)
-- ================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 2. play_scenarios 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS play_scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT,
  duration INTEGER DEFAULT 120,
  scenario_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. warmup_programs_composite 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS warmup_programs_composite (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_duration INTEGER,
  phases JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. rotation_schedule 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS rotation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key TEXT UNIQUE NOT NULL, -- 형식: '2026-01-W4' (연도-월-주차)
  program_id TEXT REFERENCES warmup_programs_composite(id) ON DELETE CASCADE,
  expert_note TEXT, -- 해당 주차에 강사에게 전달할 전문가 코멘트
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. 인덱스 생성
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_play_scenarios_theme ON play_scenarios(theme);
CREATE INDEX IF NOT EXISTS idx_composite_programs_week_id ON warmup_programs_composite(week_id);
CREATE INDEX IF NOT EXISTS idx_composite_programs_is_active ON warmup_programs_composite(is_active);
CREATE INDEX IF NOT EXISTS idx_rotation_schedule_week_key ON rotation_schedule(week_key);
CREATE INDEX IF NOT EXISTS idx_rotation_schedule_published ON rotation_schedule(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_rotation_schedule_program_id ON rotation_schedule(program_id);

-- ================================================================
-- 6. RLS 정책 설정
-- ================================================================

-- play_scenarios RLS 활성화
ALTER TABLE play_scenarios ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Admin full access to play scenarios" ON play_scenarios;
DROP POLICY IF EXISTS "All users can read play scenarios" ON play_scenarios;

-- Admin 전체 권한
CREATE POLICY "Admin full access to play scenarios"
ON play_scenarios
FOR ALL
USING (is_admin());

-- 모든 사용자 읽기 권한
CREATE POLICY "All users can read play scenarios"
ON play_scenarios
FOR SELECT
USING (true);

-- warmup_programs_composite RLS 활성화
ALTER TABLE warmup_programs_composite ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Admin full access to composite programs" ON warmup_programs_composite;
DROP POLICY IF EXISTS "All users can read active composite programs" ON warmup_programs_composite;

-- Admin 전체 권한
CREATE POLICY "Admin full access to composite programs"
ON warmup_programs_composite
FOR ALL
USING (is_admin());

-- 모든 사용자 활성화된 프로그램 읽기
CREATE POLICY "All users can read active composite programs"
ON warmup_programs_composite
FOR SELECT
USING (is_active = true);

-- rotation_schedule RLS 활성화
ALTER TABLE rotation_schedule ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Admin full access to rotation schedule" ON rotation_schedule;
DROP POLICY IF EXISTS "All users can read published schedules" ON rotation_schedule;

-- Admin 전체 권한
CREATE POLICY "Admin full access to rotation schedule"
ON rotation_schedule
FOR ALL
USING (is_admin());

-- 모든 사용자 Published 스케줄 읽기 권한
CREATE POLICY "All users can read published schedules"
ON rotation_schedule
FOR SELECT
USING (is_published = true);

-- ================================================================
-- 7. 트리거 함수 생성
-- ================================================================

-- rotation_schedule updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_rotation_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS rotation_schedule_updated_at ON rotation_schedule;
CREATE TRIGGER rotation_schedule_updated_at
BEFORE UPDATE ON rotation_schedule
FOR EACH ROW
EXECUTE FUNCTION update_rotation_schedule_updated_at();

-- ================================================================
-- 8. 샘플 데이터 삽입 (선택사항)
-- ================================================================

-- 샘플 play_scenario 삽입
INSERT INTO play_scenarios (id, name, theme, duration, scenario_json)
VALUES (
  'week1_kitchen',
  '1월 1주차 주방 테마',
  'kitchen',
  120,
  '{
    "theme": "kitchen",
    "duration": 120,
    "actions": [
      {
        "id": "action_001",
        "type": "POINT",
        "startTime": 0.5,
        "duration": 4,
        "position": {"x": 30, "y": 40},
        "intensity": "MID"
      },
      {
        "id": "action_002",
        "type": "PUNCH",
        "startTime": 6,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "HIGH"
      },
      {
        "id": "action_003",
        "type": "DUCK",
        "startTime": 12,
        "duration": 4,
        "position": {"x": 50, "y": 20},
        "intensity": "MID"
      },
      {
        "id": "action_004",
        "type": "PUSH",
        "startTime": 18,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "MID"
      },
      {
        "id": "action_005",
        "type": "PULL",
        "startTime": 24,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "MID"
      },
      {
        "id": "action_006",
        "type": "POINT",
        "startTime": 30,
        "duration": 4,
        "position": {"x": 70, "y": 60},
        "intensity": "HIGH"
      },
      {
        "id": "action_007",
        "type": "PUNCH",
        "startTime": 36,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "MID"
      },
      {
        "id": "action_008",
        "type": "DUCK",
        "startTime": 42,
        "duration": 4,
        "position": {"x": 50, "y": 30},
        "intensity": "HIGH"
      },
      {
        "id": "action_009",
        "type": "PUSH",
        "startTime": 48,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "MID"
      },
      {
        "id": "action_010",
        "type": "PULL",
        "startTime": 54,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "MID"
      },
      {
        "id": "action_011",
        "type": "POINT",
        "startTime": 60,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "HIGH"
      },
      {
        "id": "action_012",
        "type": "PUNCH",
        "startTime": 66,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "HIGH"
      },
      {
        "id": "action_013",
        "type": "DUCK",
        "startTime": 72,
        "duration": 4,
        "position": {"x": 50, "y": 25},
        "intensity": "MID"
      },
      {
        "id": "action_014",
        "type": "PUSH",
        "startTime": 78,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "HIGH"
      },
      {
        "id": "action_015",
        "type": "PULL",
        "startTime": 84,
        "duration": 4,
        "position": {"x": 50, "y": 50},
        "intensity": "MID"
      }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  theme = EXCLUDED.theme,
  duration = EXCLUDED.duration,
  scenario_json = EXCLUDED.scenario_json,
  updated_at = NOW();

-- 샘플 warmup_programs_composite 삽입
INSERT INTO warmup_programs_composite (id, week_id, title, description, total_duration, phases)
VALUES (
  'program_2026_01_w1',
  '2026-01-W1',
  '신나는 주방 웜업',
  'Play, Think, Flow 3단계로 구성된 10분 웜업 프로그램',
  540,
  '[
    {
      "type": "play",
      "scenario_id": "week1_kitchen",
      "duration": 120
    },
    {
      "type": "think",
      "content_type": "placeholder",
      "duration": 120
    },
    {
      "type": "flow",
      "content_type": "placeholder",
      "duration": 300
    }
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  week_id = EXCLUDED.week_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_duration = EXCLUDED.total_duration,
  phases = EXCLUDED.phases,
  updated_at = NOW();

-- ================================================================
-- 완료 메시지
-- ================================================================

SELECT 
  '✅ 완전한 웜업 시스템이 성공적으로 설정되었습니다!' AS status,
  (SELECT COUNT(*) FROM play_scenarios) AS play_scenarios_count,
  (SELECT COUNT(*) FROM warmup_programs_composite) AS composite_programs_count,
  (SELECT COUNT(*) FROM rotation_schedule) AS rotation_schedules_count;
