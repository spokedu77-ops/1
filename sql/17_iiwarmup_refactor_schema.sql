-- ================================================================
-- I.I.Warm-up 리팩토링 스키마 마이그레이션
-- Phase 0: Foundation "최소 안전장치"
-- 실행 전 백업 권장
-- ================================================================

-- ================================================================
-- 1. rotation_schedule 테이블 확장
-- ================================================================

-- Step 1: program_snapshot Nullable로 추가
ALTER TABLE rotation_schedule 
ADD COLUMN IF NOT EXISTS program_snapshot JSONB;

-- Step 2: 기존 데이터 백필
UPDATE rotation_schedule
SET program_snapshot = '{}'::jsonb
WHERE program_snapshot IS NULL;

-- Step 3: NOT NULL 적용
ALTER TABLE rotation_schedule
ALTER COLUMN program_snapshot SET NOT NULL;

-- week_key UNIQUE 제약 추가 (필수)
-- 기존 UNIQUE 제약이 있으면 에러 발생 (의도된 동작)
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

-- Lock 기능 추가 (선택사항)
ALTER TABLE rotation_schedule
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- ================================================================
-- 2. warmup_programs_composite 테이블 확장
-- ================================================================

-- 버전 관리 필드
ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS parent_version_id TEXT REFERENCES warmup_programs_composite(id);

ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- week_id를 NULL 허용으로 변경 (템플릿은 week_id = NULL)
ALTER TABLE warmup_programs_composite
ALTER COLUMN week_id DROP NOT NULL;

-- scenario_ids 배열 컬럼 추가 (성능 개선)
ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS scenario_ids TEXT[];

-- GIN 인덱스 추가 (배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_warmup_programs_scenario_ids 
ON warmup_programs_composite USING GIN(scenario_ids);

-- owner_id, org_id 필드 추가 (다음 분기 RLS용, 필드만 추가)
ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

ALTER TABLE warmup_programs_composite
ADD COLUMN IF NOT EXISTS org_id UUID;

-- ================================================================
-- 3. play_scenarios 테이블 확장
-- ================================================================

-- type 컬럼 추가 (DB 컬럼만 사용, JSON 내부 type 제거)
ALTER TABLE play_scenarios
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'scenario';

-- type 값:
-- 'asset_pack': Asset Hub에서 관리하는 에셋 팩
-- 'think_scenario': Think Phase 시나리오
-- 'play_scenario': Play Phase 시나리오 (기존)

-- Soft Delete 필드
ALTER TABLE play_scenarios
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE play_scenarios
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- owner_id, org_id 필드 추가 (다음 분기 RLS용, 필드만 추가)
ALTER TABLE play_scenarios
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

ALTER TABLE play_scenarios
ADD COLUMN IF NOT EXISTS org_id UUID;

-- type 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_play_scenarios_type ON play_scenarios(type);
CREATE INDEX IF NOT EXISTS idx_play_scenarios_is_active ON play_scenarios(is_active) WHERE is_active = true;

-- ================================================================
-- 4. updated_at 트리거 함수 (warmup_programs_composite용)
-- ================================================================

CREATE OR REPLACE FUNCTION update_warmup_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS warmup_programs_updated_at ON warmup_programs_composite;
CREATE TRIGGER warmup_programs_updated_at
BEFORE UPDATE ON warmup_programs_composite
FOR EACH ROW
EXECUTE FUNCTION update_warmup_programs_updated_at();

-- ================================================================
-- 5. 기존 데이터 마이그레이션 (선택사항)
-- ================================================================

-- 기존 play_scenarios의 type 설정 (기존 데이터는 'play_scenario'로)
UPDATE play_scenarios
SET type = 'play_scenario'
WHERE type IS NULL OR type = 'scenario';

-- 기존 warmup_programs_composite의 scenario_ids 추출 (phases에서)
UPDATE warmup_programs_composite
SET scenario_ids = (
  SELECT ARRAY_AGG(DISTINCT phase->>'scenario_id')
  FROM jsonb_array_elements(phases) AS phase
  WHERE phase->>'scenario_id' IS NOT NULL
)
WHERE scenario_ids IS NULL;

-- ================================================================
-- 완료 메시지
-- ================================================================

SELECT 
  '✅ I.I.Warm-up 리팩토링 스키마 마이그레이션이 완료되었습니다!' AS status,
  (SELECT COUNT(*) FROM rotation_schedule) AS rotation_schedules_count,
  (SELECT COUNT(*) FROM warmup_programs_composite) AS templates_count,
  (SELECT COUNT(*) FROM play_scenarios WHERE type = 'asset_pack') AS asset_packs_count;
