-- SPOMOVE 즐겨찾기: IP 공유 → 계정(user_id)별 분리

ALTER TABLE public.spomove_favorites
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.spomove_favorites
  ALTER COLUMN ip DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spomove_favorites_user_id
  ON public.spomove_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_spomove_favorites_user_created
  ON public.spomove_favorites (user_id, created_at DESC);
