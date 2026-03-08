-- ================================================================
-- 스포키듀 구독(히든카드) 공용/테넌트 콘텐츠
-- Draft/Publish, version(낙관적 락). 접근은 API 전용(service_role).
-- 실행 순서: 49 (기존 마이그레이션 이후)
-- ================================================================

-- ================================================================
-- 1. 공용 콘텐츠 (카탈로그, 테마 등). 원생/즐겨찾기/로드맵 저장 금지.
-- ================================================================
CREATE TABLE IF NOT EXISTS spokedu_pro_content (
  key TEXT PRIMARY KEY,
  draft_value JSONB NOT NULL DEFAULT '{}',
  published_value JSONB NOT NULL DEFAULT '{}',
  draft_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE spokedu_pro_content IS '스포키듀 구독 공용 콘텐츠. catalog_*, report_tags_catalog 등. 원생/로드맵/즐겨찾기 저장 금지.';
COMMENT ON COLUMN spokedu_pro_content.version IS '낙관적 락. PATCH 시 클라이언트가 보낸 expectedVersion과 일치할 때만 업데이트.';

-- ================================================================
-- 2. 테넌트(개별) 콘텐츠. owner_id별 로드맵, 즐겨찾기, 원생 등.
-- ================================================================
CREATE TABLE IF NOT EXISTS spokedu_pro_tenant_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  key TEXT NOT NULL,
  draft_value JSONB NOT NULL DEFAULT '{}',
  published_value JSONB NOT NULL DEFAULT '{}',
  draft_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 0,
  UNIQUE(owner_id, key)
);

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_tenant_owner_key ON spokedu_pro_tenant_content(owner_id, key);

COMMENT ON TABLE spokedu_pro_tenant_content IS '스포키듀 구독 테넌트별 콘텐츠. tenant_roadmap, tenant_favorites, tenant_students 등.';
COMMENT ON COLUMN spokedu_pro_tenant_content.owner_id IS 'auth.uid() 또는 센터 id. MVP는 user id 권장.';

-- ================================================================
-- 3. RLS: API 전용 접근. 클라이언트는 직접 읽기/쓰기 불가.
-- (정책 없음 = authenticated/anon 모두 접근 불가, service_role만 bypass)
-- ================================================================
ALTER TABLE spokedu_pro_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE spokedu_pro_tenant_content ENABLE ROW LEVEL SECURITY;

-- 정책을 부여하지 않으므로, Supabase 클라이언트로는 접근 불가.
-- 모든 접근은 getServiceSupabase()를 사용하는 API에서만 수행.

-- ================================================================
SELECT 'spokedu_pro_content + spokedu_pro_tenant_content (49) applied.' AS status;
