-- SPOKEDU MASTER account profile (onboarding + display fields).
-- Accessed only via service_role server API.

CREATE TABLE IF NOT EXISTS public.spokedu_master_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '선생님',
  school text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'teacher',
  age_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  program_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  onboarding_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spokedu_master_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spokedu_master_profiles_deny_all ON public.spokedu_master_profiles;
CREATE POLICY spokedu_master_profiles_deny_all
  ON public.spokedu_master_profiles
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spm_profiles_role_check'
  ) THEN
    ALTER TABLE public.spokedu_master_profiles
      ADD CONSTRAINT spm_profiles_role_check
      CHECK (role IN ('teacher', 'director')) NOT VALID;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.set_spokedu_master_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spokedu_master_profiles_updated_at ON public.spokedu_master_profiles;
CREATE TRIGGER trg_spokedu_master_profiles_updated_at
  BEFORE UPDATE ON public.spokedu_master_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_spokedu_master_profiles_updated_at();
