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

