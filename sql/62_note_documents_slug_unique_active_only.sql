-- ================================================================
-- slug 유니크: 활성 문서(deleted_at IS NULL)만 적용
-- - 휴지통에 있는 행이 동일 slug를 유지해도, 새 문서 생성 시 충돌하지 않음
-- - RLS 변경과 무관하게 소프트 삭제와 유니크 제약이 함께 쓰일 때 필요
-- ================================================================

DROP INDEX IF EXISTS public.idx_note_documents_slug_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_documents_slug_unique
  ON public.note_documents (slug)
  WHERE slug IS NOT NULL
    AND deleted_at IS NULL;

SELECT 'idx_note_documents_slug_unique: active rows only' AS status;
