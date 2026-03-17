-- ================================================================
-- Admin 공용 노트(노션 스타일) 스키마
-- - 관리자들만 사용하는 협업 문서 공간
-- - 문서/블록/감사 로그 분리
-- - 접근은 기본적으로 service_role(API) 경유를 목표로 하되,
--   필요 시 authenticated admin 전용 정책을 추가하는 방향으로 확장 가능
-- 실행 순서 예시: 52 (기존 마이그레이션 이후)
-- ================================================================

-- ================================================================
-- 1. 문서 테이블: note_documents
-- - 한 문서는 여러 블록을 가짐
-- - created_by / updated_by 는 auth.users.id (UUID)
-- ================================================================
CREATE TABLE IF NOT EXISTS note_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  -- 정렬 및 최근 문서용 메타
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE note_documents IS 'Admin 공용 노트 문서. 관리자 전용 협업 문서 목록.';
COMMENT ON COLUMN note_documents.created_by IS 'auth.users.id 기준 생성자';
COMMENT ON COLUMN note_documents.updated_by IS '마지막 수정자';

-- 인덱스: 정렬/필터용
CREATE INDEX IF NOT EXISTS idx_note_documents_updated_at ON note_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_documents_is_archived ON note_documents(is_archived);

-- ================================================================
-- 2. 블록 테이블: note_blocks
-- - 각 문서는 여러 블록으로 구성
-- - 블록 타입: heading, text, todo, divider, image 등
-- - order_index 로 문서 내 순서를 관리
-- - 내용은 JSONB 로 유연하게 관리 (노션 스타일 확장성)
-- ================================================================
CREATE TABLE IF NOT EXISTS note_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES note_documents(id) ON DELETE CASCADE,
  -- 블록 타입: 'heading', 'text', 'todo', 'divider', 'image' 등
  type TEXT NOT NULL,
  -- 순서: 같은 document_id 내에서만 의미 있음
  order_index INTEGER NOT NULL,
  -- 내용: 타입별 구조를 JSONB 로 저장
  -- 예: { "text": "내용", "checked": false }
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE note_blocks IS 'Admin 공용 노트의 블록 단위 데이터. 문서 내 순서/타입/내용 저장.';
COMMENT ON COLUMN note_blocks.order_index IS '같은 document_id 내에서의 블록 순서 (0,1,2,...)';

-- 문서별 정렬/조회 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_note_blocks_document_order
  ON note_blocks(document_id, order_index);

-- ================================================================
-- 3. 감사 로그: note_audit_logs
-- - 누가 언제 어떤 액션을 했는지 기록
-- - 세부 diff 까지 넣을 수도 있지만, MVP 는 요약 정보 위주
-- ================================================================
CREATE TABLE IF NOT EXISTS note_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES note_documents(id) ON DELETE CASCADE,
  -- 선택적으로 특정 블록에 대한 변경일 경우
  block_id UUID,
  actor_id UUID, -- auth.users.id
  action TEXT NOT NULL, -- 'create_document', 'update_title', 'create_block', 'update_block', 'reorder_blocks', 'delete_block', ...
  summary TEXT, -- 사람이 읽기 쉬운 요약
  diff JSONB, -- 선택: 변경 전/후 데이터 일부 보관
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE note_audit_logs IS 'Admin 노트 편집 이력/감사 로그.';

CREATE INDEX IF NOT EXISTS idx_note_audit_logs_document_created_at
  ON note_audit_logs(document_id, created_at DESC);

-- ================================================================
-- 4. Presence/협업 보조 테이블 (선택적)
-- - 실시간 Presence 는 Supabase Realtime presence 기능으로 처리하되,
--   최근 편집자/접속자 정보를 남기고 싶을 때 사용할 수 있는 테이블
--   (필요 시 확장; 초기에는 최소 컬럼만 구성)
-- ================================================================
CREATE TABLE IF NOT EXISTS note_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES note_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- auth.users.id
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_cursor JSONB, -- 선택: { "blockId": "...", "offset": 10 } 등
  UNIQUE(document_id, user_id)
);

COMMENT ON TABLE note_collaborators IS '노트 문서별 최근 활동한 관리자 정보(협업 표시용).';

CREATE INDEX IF NOT EXISTS idx_note_collaborators_document
  ON note_collaborators(document_id);

-- ================================================================
-- 5. RLS 설정
-- - 기본 원칙: 클라이언트에서 직접 접근하지 않고, service_role 기반 API 로만 사용하는 것이 목표
--   → spokedu_pro_* 테이블과 마찬가지로 정책을 두지 않고 ENABLE RLS 만 수행
-- - 이후 필요 시 admin 전용 정책을 단계적으로 추가 가능
-- ================================================================

ALTER TABLE note_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_collaborators ENABLE ROW LEVEL SECURITY;

-- 정책을 부여하지 않으므로, Supabase 클라이언트에서는 기본적으로 접근 불가.
-- 모든 접근은 getServiceSupabase()를 사용하는 Admin API 에서만 수행.

SELECT 'admin notes schema (note_documents, note_blocks, note_audit_logs, note_collaborators) applied.' AS status;

