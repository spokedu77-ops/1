-- SPOKEDU MASTER program media URL overlays.
-- Keep curriculum immutable; store subscription-facing image assets on MASTER meta.

ALTER TABLE public.spokedu_master_program_meta
  ADD COLUMN IF NOT EXISTS sm_thumbnail_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sm_hero_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sm_setup_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sm_gallery_image_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.spokedu_master_program_meta.sm_thumbnail_url IS
  'MASTER card thumbnail image URL override.';
COMMENT ON COLUMN public.spokedu_master_program_meta.sm_hero_image_url IS
  'MASTER lesson hero image URL override.';
COMMENT ON COLUMN public.spokedu_master_program_meta.sm_setup_image_url IS
  'MASTER lesson setup/reference layout image URL.';
COMMENT ON COLUMN public.spokedu_master_program_meta.sm_gallery_image_urls IS
  'MASTER lesson gallery image URL list.';

SELECT 'spokedu_master_program_meta image columns added.' AS status;
