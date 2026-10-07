-- Institution accounts reuse Supabase Auth and the existing LAB profile and
-- entitlement tables. The login ID is an operator-issued identifier, never an
-- email address, and remains server-readable only because this table already
-- denies anon/authenticated access.

ALTER TABLE public.spokedu_master_profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS login_id text,
  ADD COLUMN IF NOT EXISTS login_id_normalized text
    GENERATED ALWAYS AS (pg_catalog.lower(pg_catalog.btrim(login_id))) STORED,
  ADD COLUMN IF NOT EXISTS organization_name text;

ALTER TABLE public.spokedu_master_profiles
  DROP CONSTRAINT IF EXISTS spm_profiles_account_type_check,
  ADD CONSTRAINT spm_profiles_account_type_check
    CHECK (account_type IN ('individual', 'institution')),
  DROP CONSTRAINT IF EXISTS spm_profiles_institution_identity_check,
  ADD CONSTRAINT spm_profiles_institution_identity_check
    CHECK (
      account_type <> 'institution'
      OR (
        login_id IS NOT NULL
        AND pg_catalog.btrim(login_id) <> ''
        AND organization_name IS NOT NULL
        AND pg_catalog.btrim(organization_name) <> ''
      )
    );

CREATE UNIQUE INDEX IF NOT EXISTS spm_profiles_login_id_normalized_uidx
  ON public.spokedu_master_profiles (login_id_normalized)
  WHERE login_id_normalized IS NOT NULL;
