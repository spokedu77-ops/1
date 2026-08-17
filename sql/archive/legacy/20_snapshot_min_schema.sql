-- ================================================================
-- I.I.Warm-up Snapshot 시스템 마이그레이션
-- 프로덕션 레벨 Snapshot 시스템 구축
-- ================================================================

-- ================================================================
-- 1. rotation_schedule 확장 (3단계 안전 마이그레이션)
-- ================================================================

-- Step 1: Nullable 컬럼 추가
ALTER TABLE rotation_schedule 
ADD COLUMN IF NOT EXISTS program_snapshot JSONB,
ADD COLUMN IF NOT EXISTS asset_pack_id TEXT,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- is_published는 이미 있을 수 있으므로 스킵
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rotation_schedule' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE rotation_schedule ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Step 2: 기존 데이터 백필
UPDATE rotation_schedule
SET program_snapshot = '{}'::jsonb
WHERE program_snapshot IS NULL;

-- Step 3: NOT NULL 적용
ALTER TABLE rotation_schedule
ALTER COLUMN program_snapshot SET NOT NULL;

-- week_key UNIQUE 제약 확인 및 추가 (upsert 안정성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rotation_schedule_week_key_unique'
  ) THEN
    ALTER TABLE rotation_schedule
    ADD CONSTRAINT rotation_schedule_week_key_unique UNIQUE (week_key);
  END IF;
END $$;

-- 코멘트
COMMENT ON COLUMN rotation_schedule.program_snapshot IS 
  'Snapshot at assignment time - immutable once published';
COMMENT ON COLUMN rotation_schedule.asset_pack_id IS 
  'Asset Pack ID (e.g., kitchen_v1) used for this week';
COMMENT ON COLUMN rotation_schedule.is_locked IS 
  'Locked weeks cannot be modified';

-- ================================================================
-- 2. warmup_programs_composite 확장
-- ================================================================

-- week_id는 이미 있을 수 있으므로 확인 후 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warmup_programs_composite' AND column_name = 'week_id'
  ) THEN
    ALTER TABLE warmup_programs_composite ADD COLUMN week_id TEXT;
  END IF;
END $$;

-- week_id를 NULL 허용으로 변경 (템플릿은 NULL, 주차별 저장본은 '2026-01-W1')
ALTER TABLE warmup_programs_composite
ALTER COLUMN week_id DROP NOT NULL;

-- 추가 컬럼들
ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_version_id TEXT REFERENCES warmup_programs_composite(id),
ADD COLUMN IF NOT EXISTS scenario_ids TEXT[];

-- updated_at는 이미 있을 수 있음
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warmup_programs_composite' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE warmup_programs_composite ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- GIN 인덱스 (배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_warmup_programs_scenario_ids 
ON warmup_programs_composite USING GIN(scenario_ids);

-- week_id 인덱스 (템플릿 조회용)
CREATE INDEX IF NOT EXISTS idx_warmup_programs_week_id_null 
ON warmup_programs_composite(week_id) WHERE week_id IS NULL;

-- 코멘트
COMMENT ON COLUMN warmup_programs_composite.week_id IS 
  'NULL = Template, week_key = Week-specific saved version';
COMMENT ON COLUMN warmup_programs_composite.scenario_ids IS 
  'Array of scenario IDs for fast usage lookup';
COMMENT ON COLUMN warmup_programs_composite.version IS 
  'Template version number';

-- ================================================================
-- 3. play_scenarios 확장
-- ================================================================

-- type 컬럼 추가
ALTER TABLE play_scenarios
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'play_scenario',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- type CHECK 제약
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'play_scenarios_type_check'
  ) THEN
    ALTER TABLE play_scenarios
    ADD CONSTRAINT play_scenarios_type_check 
    CHECK (type IN ('asset_pack', 'play_scenario', 'think_scenario', 'flow_scenario'));
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_play_scenarios_type ON play_scenarios(type);
CREATE INDEX IF NOT EXISTS idx_play_scenarios_active ON play_scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_play_scenarios_deleted ON play_scenarios(deleted_at) WHERE deleted_at IS NULL;

-- 코멘트
COMMENT ON COLUMN play_scenarios.type IS 
  'asset_pack | play_scenario | think_scenario | flow_scenario';
COMMENT ON COLUMN play_scenarios.is_active IS 
  'Soft delete flag';
COMMENT ON COLUMN play_scenarios.deleted_at IS 
  'Soft delete timestamp';

-- ================================================================
-- 4. action_catalog 확인/생성
-- ================================================================

CREATE TABLE IF NOT EXISTS action_catalog (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20개 액션 시드 데이터 (physics.ts와 일치)
INSERT INTO action_catalog (key, label, sort_order, is_active) VALUES
  ('POINT', '콕 찌르기', 1, true),
  ('TURN', '몸 돌리기', 2, true),
  ('THROW', '던지기', 3, true),
  ('PUNCH', '펀치 펑!', 4, true),
  ('WALK', '제자리 걷기', 5, true),
  ('JUMP', '점프', 6, true),
  ('PULL', '줄 당기기', 7, true),
  ('KNOCK', '노크', 8, true),
  ('CLAP', '박수', 9, true),
  ('CHOP', '장작 패기', 10, true),
  ('RIDE', '타기', 11, true),
  ('SAY_HI', '안녕 흔들기', 12, true),
  ('WIPE', '닦기', 13, true),
  ('SPREAD', '문 열기', 14, true),
  ('CUT', '자르기', 15, true),
  ('STAMP', '쾅 찍기', 16, true),
  ('CRUSH', '으깨기', 17, true),
  ('HAMMER', '박기', 18, true),
  ('SQUASH', '납작하게 누르기', 19, true),
  ('SWING', '휘두르기', 20, true)
ON CONFLICT (key) DO NOTHING;

-- 코멘트
COMMENT ON TABLE action_catalog IS 
  'Action labels (editable). Keys are immutable and defined in physics.ts';
COMMENT ON COLUMN action_catalog.key IS 
  'Action key from physics.ts - DO NOT MODIFY';
COMMENT ON COLUMN action_catalog.label IS 
  'Display label - editable';

-- ================================================================
-- 5. 확인 쿼리 (실행 후 검증용)
-- ================================================================

-- Week 스케줄 확인
-- SELECT week_key, asset_pack_id, is_published, program_snapshot 
-- FROM rotation_schedule 
-- WHERE week_key = '2026-01-W1';

-- Asset Pack 확인
-- SELECT id, type, scenario_json 
-- FROM play_scenarios 
-- WHERE id = 'kitchen_v1' AND type = 'asset_pack';

-- ================================================================
-- 완료
-- ================================================================

SELECT 'Snapshot schema migration completed successfully!' AS status;
