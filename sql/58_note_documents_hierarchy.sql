-- ================================================================
-- note_documents 계층/링크 확장
-- - parent_id: 문서 트리 구조
-- - slug: 위키링크/URL 친화 식별자
-- ================================================================

ALTER TABLE public.note_documents
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.note_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE INDEX IF NOT EXISTS idx_note_documents_parent_id
  ON public.note_documents(parent_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_documents_slug_unique
  ON public.note_documents(slug)
  WHERE slug IS NOT NULL;

-- 휴지통(소프트 삭제) 컬럼이 있으면(60_note_trash.sql 이후) 동일 slug가 휴지통·활성에 동시 존재할 수 있어야 하므로
-- 아래 스크립트로 인덱스를 “활성 행만 유니크”로 교체하세요.
--   sql/62_note_documents_slug_unique_active_only.sql

