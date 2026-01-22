-- ================================================================
-- 10분 복합 웜업 프로그램 스키마 생성
-- Play → Think → Flow 3단계 연속 실행
-- ================================================================

-- ================================================================
-- 1. play_scenarios 테이블 생성
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

-- 샘플 시나리오 데이터 삽입
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

-- ================================================================
-- 2. warmup_programs_composite 테이블 생성
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

-- 샘플 복합 프로그램 데이터 삽입
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
-- 3. RLS 정책 설정
-- ================================================================

-- play_scenarios RLS 활성화
ALTER TABLE play_scenarios ENABLE ROW LEVEL SECURITY;

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

-- ================================================================
-- 4. 인덱스 생성 (성능 최적화)
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_play_scenarios_theme ON play_scenarios(theme);
CREATE INDEX IF NOT EXISTS idx_composite_programs_week_id ON warmup_programs_composite(week_id);
CREATE INDEX IF NOT EXISTS idx_composite_programs_is_active ON warmup_programs_composite(is_active);

-- ================================================================
-- 완료
-- ================================================================

SELECT 'Warmup composite schema created successfully!' AS status;
