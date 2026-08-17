-- ================================================================
-- Admin Notes: 휴지통(소프트 삭제) 컬럼 추가
-- - note_documents를 즉시 물리 삭제하지 않고, deleted_at/deleted_by로 휴지통 이동
-- ================================================================

ALTER TABLE public.note_documents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_note_documents_deleted_at
  ON public.note_documents(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_documents_active_updated_at
  ON public.note_documents(updated_at DESC)
  WHERE deleted_at IS NULL;

SELECT 'note trash columns applied.' AS status;

-- 다음(운영 권장): slug 전역 유니크는 휴지통 행과 충돌하므로
-- sql/62_note_documents_slug_unique_active_only.sql 실행으로 활성 문서만 유니크로 교체

