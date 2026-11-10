-- Profile facts are independent; no inference from class location or weather.
ALTER TABLE public.admin_private_units
  ADD COLUMN gender text NOT NULL DEFAULT 'unknown' CHECK (gender IN ('unknown', 'male', 'female', 'mixed')),
  ADD COLUMN attends_gym boolean,
  ADD COLUMN rain_available boolean,
  ADD COLUMN schedule_group_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.admin_private_units.schedule_group_ids IS
  'Explicitly selected calendar group IDs (or singleton session IDs), used for a separate calendar-balance preview; not added to manual log consumption.';
