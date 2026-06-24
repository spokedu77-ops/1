-- note_blocks 낙관적 락: PATCH 시 expected_version 과 일치할 때만 갱신
ALTER TABLE public.note_blocks
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.note_blocks.version IS
  '낙관적 락. PATCH 시 클라이언트 expected_version 과 일치할 때만 version+1 과 함께 갱신.';
