-- note_documents에 보드 뷰용 properties(JSONB) 컬럼 추가
-- properties 예시: { "group": "협동형 활동", "tags": ["협응력", "순발력"], "icon": "🎯" }

ALTER TABLE note_documents
  ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT NULL;

COMMENT ON COLUMN note_documents.properties IS
  'Board view properties: { group?: string, tags?: string[], icon?: string, cover?: string }';
