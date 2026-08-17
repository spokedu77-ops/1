-- ================================================================
-- note_blocks 휴지통(소프트 삭제) 컬럼 추가
-- - 일반 블록도 문서처럼 휴지통 복구 가능하게 확장
-- ================================================================

ALTER TABLE public.note_blocks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_note_blocks_document_active_order
  ON public.note_blocks(document_id, order_index)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_note_blocks_deleted_at
  ON public.note_blocks(deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

SELECT 'note_blocks trash columns added (76)' AS status;
