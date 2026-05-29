-- Admin 노트: 페이지별 공개(read-only) 링크
ALTER TABLE public.note_documents
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_documents_share_token_unique
  ON public.note_documents (share_token)
  WHERE share_token IS NOT NULL
    AND deleted_at IS NULL;

COMMENT ON COLUMN public.note_documents.is_public IS 'true면 share_token 링크로 read-only 공개';
COMMENT ON COLUMN public.note_documents.share_token IS '공개 URL용 불변 토큰 (/note/p/[token])';
