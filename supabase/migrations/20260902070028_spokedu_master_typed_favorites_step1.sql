-- FOUNDATION RESET v2.1 ERRATA, Favorites migration STEP 1 only.
-- Keep the existing table and physical program_id column. Backfill and
-- hardening are intentionally separate gates after the count-only audit.

alter table public.spokedu_master_program_favorites
  add column if not exists content_type text null;

alter table public.spokedu_master_program_favorites
  drop constraint if exists spokedu_master_program_favorites_content_type_check;

alter table public.spokedu_master_program_favorites
  add constraint spokedu_master_program_favorites_content_type_check
  check (content_type is null or content_type in ('program', 'spomove'))
  not valid;

alter table public.spokedu_master_program_favorites
  validate constraint spokedu_master_program_favorites_content_type_check;

comment on column public.spokedu_master_program_favorites.content_type is
  'Typed MASTER content domain. Nullable during the audited transition.';
