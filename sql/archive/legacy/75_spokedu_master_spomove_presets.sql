-- ================================================================
-- spokedu-master SPOMOVE official launch presets
-- Run in Supabase SQL Editor after 70_spokedu_master_meta.sql
-- ================================================================

CREATE TABLE IF NOT EXISTS public.spokedu_master_spomove_presets (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  subtitle       TEXT NOT NULL DEFAULT '',
  intent         TEXT NOT NULL DEFAULT 'focus',
  drill_id       TEXT NOT NULL,
  engine_mode    TEXT NOT NULL,
  engine_level   INTEGER NOT NULL DEFAULT 1,
  duration_sec   INTEGER NOT NULL DEFAULT 60,
  speed_sec      NUMERIC NOT NULL DEFAULT 1.4,
  launch_mode    TEXT NOT NULL DEFAULT 'projector',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  target         TEXT NOT NULL DEFAULT '',
  space          TEXT NOT NULL DEFAULT '',
  use_case       TEXT NOT NULL DEFAULT '',
  is_visible     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.spokedu_master_spomove_presets IS
  'SPOKEDU MASTER SPOMOVE official launch presets. Admin-authored runtime settings for subscription users.';

ALTER TABLE public.spokedu_master_spomove_presets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_sm_spomove_presets_updated_at ON public.spokedu_master_spomove_presets;
CREATE TRIGGER trg_sm_spomove_presets_updated_at
  BEFORE UPDATE ON public.spokedu_master_spomove_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_spokedu_master_updated_at();

SELECT 'spokedu_master_spomove_presets (75) applied.' AS status;
