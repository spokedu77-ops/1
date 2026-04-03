-- Admin 노트: 상단 고정(pin) — 즐겨찾기보다 우선 표시, 기본 진입 시 선택 우선순위
ALTER TABLE note_documents
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN note_documents.is_pinned IS '사이드바 최상단 고정. 즐겨찾기보다 위에 표시.';
