alter table public.spokedu_master_program_meta
  add column if not exists sm_briefing_notes text,
  add column if not exists sm_variation_method text;
