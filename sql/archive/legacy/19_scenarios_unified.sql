-- ================================================================
-- Scenarios 통합 테이블 생성
-- play/think/flow/asset_pack을 하나의 테이블로 통합
-- Draft 관리 체계 구축
-- ================================================================

-- ================================================================
-- 1. scenarios 통합 테이블 생성
-- ================================================================

CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('play', 'think', 'flow', 'asset_pack')),
  scenario_json JSONB NOT NULL,
  
  -- Draft 관리
  draft_session_id UUID,
  is_draft BOOLEAN DEFAULT true,
  
  -- 메타데이터
  theme_id TEXT,
  slug TEXT,
  
  -- 공통 필드
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  owner_id UUID REFERENCES auth.users(id),
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. 인덱스 생성
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_scenarios_type ON scenarios(type);
CREATE INDEX IF NOT EXISTS idx_scenarios_draft_session ON scenarios(draft_session_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_draft ON scenarios(is_draft);
CREATE INDEX IF NOT EXISTS idx_scenarios_theme ON scenarios(theme_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_active ON scenarios(is_active) WHERE is_active = true;

-- 같은 세션의 같은 타입은 1개만 (Draft일 때만)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scenarios_draft_session_type 
  ON scenarios(draft_session_id, type) 
  WHERE is_draft = true AND draft_session_id IS NOT NULL;

-- ================================================================
-- 3. RLS 정책 설정
-- ================================================================

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Admin full access to scenarios" ON scenarios;
DROP POLICY IF EXISTS "All users can read active scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can read their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can manage their own drafts" ON scenarios;

-- Admin 전체 권한
CREATE POLICY "Admin full access to scenarios"
ON scenarios FOR ALL
USING (is_admin());

-- 모든 사용자 읽기 권한 (활성화되고 삭제되지 않은 것만)
CREATE POLICY "All users can read active scenarios"
ON scenarios FOR SELECT
USING (is_active = true AND deleted_at IS NULL);

-- 사용자는 자신이 만든 Draft를 수정/삭제 가능
CREATE POLICY "Users can manage their own drafts"
ON scenarios FOR ALL
USING (
  is_draft = true 
  AND owner_id = auth.uid()
  AND (deleted_at IS NULL OR deleted_at > NOW())
);

-- ================================================================
-- 4. 기존 play_scenarios 마이그레이션 (선택사항)
-- ================================================================

-- 주의: 기존 데이터가 있다면 마이그레이션 실행
-- 실행 전 백업 권장

DO $$
BEGIN
  -- play_scenarios 테이블이 존재하고 데이터가 있는 경우에만 마이그레이션
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'play_scenarios'
  ) AND EXISTS (SELECT 1 FROM play_scenarios LIMIT 1) THEN
    
    -- 기존 play_scenarios 데이터를 scenarios로 마이그레이션
    INSERT INTO scenarios (
      id,
      type,
      scenario_json,
      is_draft,
      theme_id,
      is_active,
      created_at,
      updated_at
    )
    SELECT 
      -- id가 TEXT인 경우 UUID로 변환 시도, 실패하면 새 UUID 생성
      CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN id::UUID
        ELSE gen_random_uuid()
      END,
      -- type 컬럼이 있으면 사용, 없으면 'play' 또는 'asset_pack' 판단
      COALESCE(
        CASE 
          WHEN type = 'asset_pack' THEN 'asset_pack'
          WHEN type = 'play_scenario' THEN 'play'
          ELSE 'play'
        END,
        'play'
      ),
      scenario_json,
      false,  -- 기존 데이터는 Final
      theme,
      COALESCE(is_active, true),
      COALESCE(created_at, NOW()),
      COALESCE(updated_at, NOW())
    FROM play_scenarios
    WHERE NOT EXISTS (
      -- 중복 방지: 이미 마이그레이션된 데이터는 제외
      SELECT 1 FROM scenarios s 
      WHERE s.scenario_json = play_scenarios.scenario_json
      AND s.type = COALESCE(
        CASE 
          WHEN play_scenarios.type = 'asset_pack' THEN 'asset_pack'
          WHEN play_scenarios.type = 'play_scenario' THEN 'play'
          ELSE 'play'
        END,
        'play'
      )
    );
    
    RAISE NOTICE 'play_scenarios 마이그레이션 완료';
  ELSE
    RAISE NOTICE 'play_scenarios 테이블이 없거나 데이터가 없습니다. 마이그레이션을 건너뜁니다.';
  END IF;
END $$;

-- ================================================================
-- 5. 코멘트 추가
-- ================================================================

COMMENT ON TABLE scenarios IS 
  'Unified table for all scenario types (play/think/flow/asset_pack)';
  
COMMENT ON COLUMN scenarios.draft_session_id IS 
  'Groups draft scenarios that belong to the same template candidate';
  
COMMENT ON COLUMN scenarios.is_draft IS 
  'true = draft/WIP, false = finalized and used in template';
  
COMMENT ON COLUMN scenarios.type IS 
  'Scenario type: play, think, flow, or asset_pack';

-- ================================================================
-- 6. 업데이트 트리거 (updated_at 자동 갱신)
-- ================================================================

CREATE OR REPLACE FUNCTION update_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scenarios_updated_at ON scenarios;

CREATE TRIGGER trigger_update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_scenarios_updated_at();

-- ================================================================
-- 7. Helper 함수 생성
-- ================================================================

-- 시나리오 저장 함수 (Draft 또는 Final)
CREATE OR REPLACE FUNCTION save_scenario(
  p_type TEXT,
  p_scenario_json JSONB,
  p_draft_session_id UUID DEFAULT NULL,
  p_is_draft BOOLEAN DEFAULT true,
  p_theme_id TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_scenario_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- 기존 Draft가 있으면 업데이트, 없으면 새로 생성
  IF p_scenario_id IS NOT NULL THEN
    UPDATE scenarios
    SET 
      scenario_json = p_scenario_json,
      theme_id = p_theme_id,
      slug = p_slug,
      updated_at = NOW()
    WHERE id = p_scenario_id
    RETURNING id INTO v_id;
    
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Scenario with id % not found', p_scenario_id;
    END IF;
  ELSIF p_draft_session_id IS NOT NULL AND p_is_draft = true THEN
    -- 같은 세션의 같은 타입 Draft가 있으면 업데이트
    UPDATE scenarios
    SET 
      scenario_json = p_scenario_json,
      theme_id = p_theme_id,
      slug = p_slug,
      updated_at = NOW()
    WHERE draft_session_id = p_draft_session_id
      AND type = p_type
      AND is_draft = true
    RETURNING id INTO v_id;
    
    -- 없으면 새로 생성
    IF v_id IS NULL THEN
      INSERT INTO scenarios (
        type,
        scenario_json,
        draft_session_id,
        is_draft,
        theme_id,
        slug,
        owner_id
      )
      VALUES (
        p_type,
        p_scenario_json,
        p_draft_session_id,
        p_is_draft,
        p_theme_id,
        p_slug,
        auth.uid()
      )
      RETURNING id INTO v_id;
    END IF;
  ELSE
    -- 새 시나리오 생성
    INSERT INTO scenarios (
      type,
      scenario_json,
      draft_session_id,
      is_draft,
      theme_id,
      slug,
      owner_id
    )
    VALUES (
      p_type,
      p_scenario_json,
      p_draft_session_id,
      p_is_draft,
      p_theme_id,
      p_slug,
      auth.uid()
    )
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 시나리오 로드 함수
CREATE OR REPLACE FUNCTION load_scenario(
  p_scenario_id UUID
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  scenario_json JSONB,
  draft_session_id UUID,
  is_draft BOOLEAN,
  theme_id TEXT,
  slug TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.type,
    s.scenario_json,
    s.draft_session_id,
    s.is_draft,
    s.theme_id,
    s.slug,
    s.is_active,
    s.created_at,
    s.updated_at
  FROM scenarios s
  WHERE s.id = p_scenario_id
    AND s.deleted_at IS NULL
    AND (s.is_active = true OR s.owner_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Draft 세션의 모든 시나리오 로드
CREATE OR REPLACE FUNCTION load_draft_session(
  p_draft_session_id UUID
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  scenario_json JSONB,
  is_draft BOOLEAN,
  theme_id TEXT,
  slug TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.type,
    s.scenario_json,
    s.is_draft,
    s.theme_id,
    s.slug,
    s.created_at,
    s.updated_at
  FROM scenarios s
  WHERE s.draft_session_id = p_draft_session_id
    AND s.deleted_at IS NULL
    AND (s.owner_id = auth.uid() OR is_admin())
  ORDER BY s.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 시나리오 삭제 (Soft Delete)
CREATE OR REPLACE FUNCTION delete_scenario(
  p_scenario_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM scenarios
  WHERE id = p_scenario_id;
  
  IF v_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 소유자이거나 Admin인 경우만 삭제 가능
  IF v_owner_id = auth.uid() OR is_admin() THEN
    UPDATE scenarios
    SET deleted_at = NOW()
    WHERE id = p_scenario_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Draft를 Final로 전환
CREATE OR REPLACE FUNCTION finalize_draft(
  p_scenario_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM scenarios
  WHERE id = p_scenario_id
    AND is_draft = true;
  
  IF v_owner_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 소유자이거나 Admin인 경우만 Finalize 가능
  IF v_owner_id = auth.uid() OR is_admin() THEN
    UPDATE scenarios
    SET is_draft = false
    WHERE id = p_scenario_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. 검증 함수
-- ================================================================

-- 시나리오 JSON 유효성 검증
CREATE OR REPLACE FUNCTION validate_scenario_json(
  p_type TEXT,
  p_scenario_json JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 기본 검증: JSONB가 null이 아니어야 함
  IF p_scenario_json IS NULL THEN
    RETURN false;
  END IF;
  
  -- 타입별 검증
  CASE p_type
    WHEN 'play' THEN
      -- play 시나리오는 theme, duration, actions 필드 필요
      RETURN (
        p_scenario_json ? 'theme' AND
        p_scenario_json ? 'duration' AND
        p_scenario_json ? 'actions'
      );
    WHEN 'think' THEN
      -- think 시나리오는 최소한 content 필드 필요
      RETURN (p_scenario_json ? 'content' OR p_scenario_json ? 'content_type');
    WHEN 'flow' THEN
      -- flow 시나리오는 최소한 content 필드 필요
      RETURN (p_scenario_json ? 'content' OR p_scenario_json ? 'content_type');
    WHEN 'asset_pack' THEN
      -- asset_pack은 assets 배열 필요
      RETURN (
        p_scenario_json ? 'assets' AND
        jsonb_typeof(p_scenario_json->'assets') = 'array'
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 시나리오 저장 시 자동 검증 트리거
CREATE OR REPLACE FUNCTION validate_scenario_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_scenario_json(NEW.type, NEW.scenario_json) THEN
    RAISE EXCEPTION 'Invalid scenario_json for type %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_scenario ON scenarios;

CREATE TRIGGER trigger_validate_scenario
  BEFORE INSERT OR UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION validate_scenario_before_insert();

-- ================================================================
-- 9. 통계 및 조회 함수
-- ================================================================

-- 시나리오 통계 조회
CREATE OR REPLACE FUNCTION get_scenario_stats()
RETURNS TABLE (
  type TEXT,
  total_count BIGINT,
  draft_count BIGINT,
  final_count BIGINT,
  active_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.type,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE s.is_draft = true)::BIGINT as draft_count,
    COUNT(*) FILTER (WHERE s.is_draft = false)::BIGINT as final_count,
    COUNT(*) FILTER (WHERE s.is_active = true AND s.deleted_at IS NULL)::BIGINT as active_count
  FROM scenarios s
  WHERE s.deleted_at IS NULL
  GROUP BY s.type
  ORDER BY s.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 타입별 시나리오 목록 조회
CREATE OR REPLACE FUNCTION list_scenarios(
  p_type TEXT DEFAULT NULL,
  p_is_draft BOOLEAN DEFAULT NULL,
  p_theme_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  theme_id TEXT,
  slug TEXT,
  is_draft BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.type,
    s.theme_id,
    s.slug,
    s.is_draft,
    s.is_active,
    s.created_at,
    s.updated_at
  FROM scenarios s
  WHERE s.deleted_at IS NULL
    AND (p_type IS NULL OR s.type = p_type)
    AND (p_is_draft IS NULL OR s.is_draft = p_is_draft)
    AND (p_theme_id IS NULL OR s.theme_id = p_theme_id)
    AND (s.is_active = true OR s.owner_id = auth.uid() OR is_admin())
  ORDER BY s.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Orphan Draft 정리 (30일 이상 미사용)
CREATE OR REPLACE FUNCTION cleanup_orphan_drafts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    UPDATE scenarios
    SET deleted_at = NOW()
    WHERE is_draft = true
      AND updated_at < NOW() - INTERVAL '30 days'
      AND (owner_id = auth.uid() OR is_admin())
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 10. 마이그레이션 완료 확인 및 정리
-- ================================================================

-- 마이그레이션 상태 확인 함수
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE (
  check_item TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    '테이블 존재'::TEXT as check_item,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'scenarios'
      ) THEN '✅ OK'::TEXT
      ELSE '❌ FAIL'::TEXT
    END as status,
    'scenarios 테이블 확인'::TEXT as details
  UNION ALL
  SELECT 
    '인덱스 존재'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'scenarios' AND indexname = 'idx_scenarios_type'
      ) THEN '✅ OK'::TEXT
      ELSE '❌ FAIL'::TEXT
    END,
    '주요 인덱스 확인'::TEXT
  UNION ALL
  SELECT 
    'RLS 활성화'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'scenarios' 
        AND rowsecurity = true
      ) THEN '✅ OK'::TEXT
      ELSE '❌ FAIL'::TEXT
    END,
    'Row Level Security 확인'::TEXT
  UNION ALL
  SELECT 
    '트리거 존재'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_scenarios_updated_at'
      ) THEN '✅ OK'::TEXT
      ELSE '❌ FAIL'::TEXT
    END,
    '업데이트 트리거 확인'::TEXT
  UNION ALL
  SELECT 
    'Helper 함수'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'save_scenario'
      ) THEN '✅ OK'::TEXT
      ELSE '❌ FAIL'::TEXT
    END,
    'save_scenario 함수 확인'::TEXT
  UNION ALL
  SELECT 
    '검증 함수'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'validate_scenario_json'
      ) THEN '✅ OK'::TEXT
      ELSE '❌ FAIL'::TEXT
    END,
    'validate_scenario_json 함수 확인'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 코멘트 추가
COMMENT ON FUNCTION save_scenario IS 
  '시나리오를 저장하는 Helper 함수. Draft 또는 Final로 저장 가능';
  
COMMENT ON FUNCTION load_scenario IS 
  '시나리오를 ID로 로드하는 함수';
  
COMMENT ON FUNCTION load_draft_session IS 
  'Draft 세션의 모든 시나리오를 로드하는 함수';
  
COMMENT ON FUNCTION delete_scenario IS 
  '시나리오를 Soft Delete하는 함수';
  
COMMENT ON FUNCTION finalize_draft IS 
  'Draft를 Final로 전환하는 함수';
  
COMMENT ON FUNCTION validate_scenario_json IS 
  '시나리오 JSON 유효성을 검증하는 함수';
  
COMMENT ON FUNCTION get_scenario_stats IS 
  '시나리오 통계를 조회하는 함수';
  
COMMENT ON FUNCTION list_scenarios IS 
  '시나리오 목록을 조회하는 함수 (필터링 지원)';
  
COMMENT ON FUNCTION cleanup_orphan_drafts IS 
  '30일 이상 미사용 Orphan Draft를 정리하는 함수';
  
COMMENT ON FUNCTION check_migration_status IS 
  '마이그레이션 상태를 확인하는 함수';

-- ================================================================
-- 완료 메시지
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ scenarios 통합 테이블 생성 완료';
  RAISE NOTICE '✅ 인덱스 생성 완료';
  RAISE NOTICE '✅ RLS 정책 설정 완료';
  RAISE NOTICE '✅ 업데이트 트리거 설정 완료';
  RAISE NOTICE '✅ Helper 함수 생성 완료 (save_scenario, load_scenario, etc.)';
  RAISE NOTICE '✅ 검증 함수 생성 완료 (validate_scenario_json)';
  RAISE NOTICE '✅ 통계 및 조회 함수 생성 완료';
  RAISE NOTICE '✅ 마이그레이션 완료 확인 함수 생성 완료';
  RAISE NOTICE '';
  RAISE NOTICE '📊 마이그레이션 상태 확인: SELECT * FROM check_migration_status();';
  RAISE NOTICE '📈 통계 조회: SELECT * FROM get_scenario_stats();';
END $$;
