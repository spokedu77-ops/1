-- =============================================================================
-- MOVE REPORT TRACK — Migration SQL DRAFT (Governance Rev.1)
-- =============================================================================
-- Sprint: MOVE-TRACK-FOUNDATION-01
-- Status: **HISTORICAL / REFERENCE ONLY** — DO NOT APPLY
-- SSOT (applied): supabase/migrations/20260829130000_move_report_track_core.sql
--
-- Rev.1 changes:
--   - voluntary_initiation → independent_initiation + self_reengagement
--   - functional_response_window → frw_seconds (1-6) + frw_status
-- Rev.2 (Scoring Manual v0.1 sync):
--   - observation_opportunity_band (SM-02)
--   - mr_measurement_timing (PRE/MID/POST/FOLLOW_UP) for external assessments
--   - mr_record_change_reason for audit
--   - NULL ≠ 0 semantics documented on observational columns
--   - No assessment_period on session records
--   - No composite / dimension score columns
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------------

CREATE TYPE public.mr_program_track AS ENUM (
  'developmental_disability',
  'slow_learner',
  'inclusive',
  'other'
);

CREATE TYPE public.mr_program_status AS ENUM (
  'preparing',
  'active',
  'closed'
);

CREATE TYPE public.mr_grade AS ENUM (
  'pre_k',
  'elem_1', 'elem_2', 'elem_3', 'elem_4', 'elem_5', 'elem_6',
  'secondary',
  'other'
);

CREATE TYPE public.mr_child_track AS ENUM (
  'developmental_disability',
  'slow_learner',
  'support_needed',
  'unclassified'
);

CREATE TYPE public.mr_move_goal_category AS ENUM (
  'g1_space_entry',
  'g2_visual_then_move',
  'g3_reduce_support',
  'g4_extend_duration',
  'g5_new_movement',
  'g6_new_equipment',
  'g7_partner_peer',
  'g8_custom'
);

CREATE TYPE public.mr_consent_status AS ENUM (
  'granted',
  'denied',
  'unknown'
);

CREATE TYPE public.mr_attendance_status AS ENUM (
  'present',
  'absent'
);

CREATE TYPE public.mr_absence_reason AS ENUM (
  'institution_schedule',
  'personal',
  'health',
  'other',
  'unknown'
);

CREATE TYPE public.mr_observation_opportunity_band AS ENUM (
  'one',
  'two',
  'three_plus'
);

CREATE TYPE public.mr_frw_status AS ENUM (
  'exploratory',
  'observed_stable',
  'not_determined'
);

CREATE TYPE public.mr_main_activity AS ENUM (
  'basic_movement',
  'spomove',
  'object_control',
  'sport',
  'cooperative',
  'other'
);

CREATE TYPE public.mr_movement_domain AS ENUM (
  'locomotor',
  'body_control',
  'visual_response',
  'object_control',
  'sport_challenge',
  'social_movement'
);

CREATE TYPE public.mr_session_status AS ENUM (
  'draft',
  'in_progress',
  'completed',
  'locked'
);

CREATE TYPE public.mr_source_type AS ENUM (
  'SYSTEM',
  'OBSERVED',
  'STANDARDIZED',
  'CONTEXT'
);

CREATE TYPE public.mr_measurement_timing AS ENUM (
  'pre',
  'mid',
  'post',
  'follow_up'
);

CREATE TYPE public.mr_record_change_reason AS ENUM (
  'input_error',
  'missing_record',
  'field_verification',
  'admin_correction',
  'other'
);

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.mr_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  institution_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.mr_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name text NOT NULL,
  program_track public.mr_program_track NOT NULL,
  total_sessions integer NOT NULL DEFAULT 16 CHECK (total_sessions > 0),
  session_minutes integer NOT NULL DEFAULT 50 CHECK (session_minutes > 0),
  start_date date,
  end_date date,
  status public.mr_program_status NOT NULL DEFAULT 'preparing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.mr_program_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.mr_programs(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.mr_institutions(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, institution_id)
);

CREATE TABLE public.mr_program_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.mr_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (program_id, user_id)
);

CREATE TABLE public.mr_program_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.mr_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.mr_institutions(id) ON DELETE SET NULL,
  impact_report_approved boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);

CREATE TABLE public.mr_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_code text NOT NULL UNIQUE,
  child_name text NOT NULL,
  birth_year integer CHECK (birth_year IS NULL OR (birth_year >= 1990 AND birth_year <= 2100)),
  grade public.mr_grade,
  child_track public.mr_child_track NOT NULL DEFAULT 'unclassified',
  support_notes text,
  data_consent public.mr_consent_status NOT NULL DEFAULT 'unknown',
  media_consent public.mr_consent_status NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz
);

CREATE TABLE public.mr_program_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.mr_programs(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.mr_children(id) ON DELETE RESTRICT,
  move_goal_category public.mr_move_goal_category,
  move_goal_text text CHECK (move_goal_text IS NULL OR char_length(move_goal_text) <= 100),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  UNIQUE (program_id, child_id)
);

CREATE TABLE public.mr_track_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.mr_programs(id) ON DELETE CASCADE,
  session_number integer NOT NULL CHECK (session_number > 0),
  session_date date NOT NULL,
  instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  main_activities public.mr_main_activity[] NOT NULL DEFAULT '{}',
  status public.mr_session_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (program_id, session_number)
);

CREATE TABLE public.mr_session_child_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.mr_track_sessions(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.mr_children(id) ON DELETE RESTRICT,
  attendance_status public.mr_attendance_status NOT NULL,
  absence_reason public.mr_absence_reason,
  -- SM-02: meaningful participation opportunity count band; NULL = not assessed
  observation_opportunity_band public.mr_observation_opportunity_band,
  -- OBSERVED: NULL = Not Assessed; 0 = assessed, not observed; 1-n = Typical Performance (SM-03, SM-10)
  participation_level smallint CHECK (participation_level IS NULL OR participation_level BETWEEN 0 AND 4),
  support_level smallint CHECK (support_level IS NULL OR support_level BETWEEN 0 AND 4),
  independent_initiation smallint CHECK (independent_initiation IS NULL OR independent_initiation BETWEEN 0 AND 3),
  -- NULL = no opportunity; false = not observed; true = re-engaged after leaving
  self_reengagement boolean,
  spomove_used boolean,
  -- SYSTEM: SPOMOVE program setting — NOT reaction time
  frw_seconds smallint CHECK (frw_seconds IS NULL OR frw_seconds BETWEEN 1 AND 6),
  frw_status public.mr_frw_status,
  observation_note text CHECK (observation_note IS NULL OR char_length(observation_note) <= 150),
  record_version integer NOT NULL DEFAULT 1 CHECK (record_version >= 1),
  is_draft boolean NOT NULL DEFAULT true,
  quality_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, child_id),
  CONSTRAINT mr_scr_absent_fields_null CHECK (
    attendance_status <> 'absent'
    OR (
      observation_opportunity_band IS NULL
      AND participation_level IS NULL
      AND support_level IS NULL
      AND independent_initiation IS NULL
      AND self_reengagement IS NULL
      AND spomove_used IS NULL
      AND frw_seconds IS NULL
      AND frw_status IS NULL
    )
  ),
  CONSTRAINT mr_scr_spomove_frw CHECK (
    spomove_used IS DISTINCT FROM false
    OR (frw_seconds IS NULL AND frw_status IS NULL)
  ),
  CONSTRAINT mr_scr_frw_pair CHECK (
    (frw_seconds IS NULL AND frw_status IS NULL)
    OR (frw_seconds IS NOT NULL AND frw_status IS NOT NULL)
  )
);

CREATE TABLE public.mr_movement_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_child_record_id uuid NOT NULL REFERENCES public.mr_session_child_records(id) ON DELETE CASCADE,
  domain public.mr_movement_domain NOT NULL,
  subtag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_child_record_id, domain, subtag)
);

CREATE TABLE public.mr_record_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_child_record_id uuid NOT NULL REFERENCES public.mr_session_child_records(id) ON DELETE CASCADE,
  record_version integer NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_reason public.mr_record_change_reason,
  change_reason_note text,
  snapshot jsonb NOT NULL
);

CREATE TABLE public.mr_external_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.mr_children(id) ON DELETE RESTRICT,
  program_id uuid REFERENCES public.mr_programs(id) ON DELETE SET NULL,
  assessment_name text NOT NULL,
  measurement_timing public.mr_measurement_timing NOT NULL,
  raw_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  assessed_at date NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mr_field_source_catalog (
  field_key text PRIMARY KEY,
  source_type public.mr_source_type NOT NULL,
  description text NOT NULL
);

-- ---------------------------------------------------------------------------
-- Seed: field source catalog
-- ---------------------------------------------------------------------------

INSERT INTO public.mr_field_source_catalog (field_key, source_type, description) VALUES
  ('attendance_status', 'CONTEXT', 'Session attendance'),
  ('observation_opportunity_band', 'CONTEXT', 'SM-02 meaningful participation opportunity: one|two|three_plus; NULL=not assessed'),
  ('participation_level', 'OBSERVED', 'SM-03 Typical Performance pathway NULL|0-4'),
  ('support_level', 'OBSERVED', 'SM-06 Typical Performance support NULL|0-4 — not a score'),
  ('independent_initiation', 'OBSERVED', 'SM-04 initiation frequency NULL|0-3 — excludes direct action cues'),
  ('self_reengagement', 'OBSERVED', 'SM-07 re-engagement after leaving NULL|false|true'),
  ('spomove_used', 'CONTEXT', 'Whether SPOMOVE was used'),
  ('frw_seconds', 'SYSTEM', 'SM-08 SPOMOVE setting 1-6 — not reaction time'),
  ('frw_status', 'SYSTEM', 'SM-08 exploratory|observed_stable|not_determined'),
  ('movement_domains', 'OBSERVED', 'SM-12 domains child actually moved in'),
  ('observation_note', 'OBSERVED', 'SM-11/SM-14 Meaningful Change — not Typical Performance')
ON CONFLICT (field_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_mr_program_institutions_program ON public.mr_program_institutions (program_id);
CREATE INDEX idx_mr_program_institutions_institution ON public.mr_program_institutions (institution_id);
CREATE INDEX idx_mr_program_instructors_user ON public.mr_program_instructors (user_id);
CREATE INDEX idx_mr_program_children_program ON public.mr_program_children (program_id);
CREATE INDEX idx_mr_program_children_child ON public.mr_program_children (child_id);
CREATE INDEX idx_mr_track_sessions_program_date ON public.mr_track_sessions (program_id, session_date DESC);
CREATE INDEX idx_mr_track_sessions_program_number ON public.mr_track_sessions (program_id, session_number);
CREATE INDEX idx_mr_session_child_records_session ON public.mr_session_child_records (session_id);
CREATE INDEX idx_mr_session_child_records_child ON public.mr_session_child_records (child_id);
CREATE INDEX idx_mr_record_audit_log_record ON public.mr_record_audit_log (session_child_record_id, changed_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mr_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_mr_institutions_updated_at
  BEFORE UPDATE ON public.mr_institutions
  FOR EACH ROW EXECUTE FUNCTION public.mr_set_updated_at();

CREATE TRIGGER tr_mr_programs_updated_at
  BEFORE UPDATE ON public.mr_programs
  FOR EACH ROW EXECUTE FUNCTION public.mr_set_updated_at();

CREATE TRIGGER tr_mr_children_updated_at
  BEFORE UPDATE ON public.mr_children
  FOR EACH ROW EXECUTE FUNCTION public.mr_set_updated_at();

CREATE TRIGGER tr_mr_track_sessions_updated_at
  BEFORE UPDATE ON public.mr_track_sessions
  FOR EACH ROW EXECUTE FUNCTION public.mr_set_updated_at();

CREATE TRIGGER tr_mr_session_child_records_updated_at
  BEFORE UPDATE ON public.mr_session_child_records
  FOR EACH ROW EXECUTE FUNCTION public.mr_set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit: version bump + snapshot (change_reason set by API on locked edits)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mr_audit_session_child_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.mr_record_audit_log (
      session_child_record_id,
      record_version,
      changed_by,
      change_reason,
      change_reason_note,
      snapshot
    ) VALUES (
      OLD.id,
      OLD.record_version,
      COALESCE(NEW.updated_by, NEW.created_by),
      NULL,
      NULL,
      to_jsonb(OLD)
    );
    NEW.record_version := OLD.record_version + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_mr_session_child_records_audit
  BEFORE UPDATE ON public.mr_session_child_records
  FOR EACH ROW EXECUTE FUNCTION public.mr_audit_session_child_record();

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mr_is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND (
        u.role IN ('admin', 'master')
        OR u.is_admin IS TRUE
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.mr_is_program_instructor(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mr_program_instructors pi
    WHERE pi.program_id = p_program_id
      AND pi.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.mr_is_program_viewer(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mr_program_viewers pv
    WHERE pv.program_id = p_program_id
      AND pv.user_id = (SELECT auth.uid())
      AND pv.impact_report_approved IS TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.mr_can_read_program(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT public.mr_is_platform_admin())
    OR (SELECT public.mr_is_program_instructor(p_program_id))
    OR (SELECT public.mr_is_program_viewer(p_program_id));
$$;

-- Growth-phase FRW: seconds 2-6, observed_stable only; 1s Challenge excluded (I5)
CREATE OR REPLACE FUNCTION public.mr_frw_growth_phase_eligible(
  p_seconds smallint,
  p_status public.mr_frw_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_seconds IS NOT NULL
    AND p_seconds BETWEEN 2 AND 6
    AND p_status = 'observed_stable';
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.mr_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_program_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_program_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_program_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_program_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_track_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_session_child_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_movement_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_record_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_external_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mr_field_source_catalog ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mr_institutions', 'mr_programs', 'mr_program_institutions',
    'mr_program_instructors', 'mr_program_viewers', 'mr_children',
    'mr_program_children', 'mr_track_sessions', 'mr_session_child_records',
    'mr_movement_experiences', 'mr_record_audit_log', 'mr_external_assessments',
    'mr_field_source_catalog'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t || '_service_role', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS mr_programs_select_member ON public.mr_programs;
CREATE POLICY mr_programs_select_member
  ON public.mr_programs FOR SELECT TO authenticated
  USING ((SELECT public.mr_can_read_program(id)));

DROP POLICY IF EXISTS mr_children_select_member ON public.mr_children;
CREATE POLICY mr_children_select_member
  ON public.mr_children FOR SELECT TO authenticated
  USING (
    (SELECT public.mr_is_platform_admin())
    OR EXISTS (
      SELECT 1
      FROM public.mr_program_children pc
      JOIN public.mr_program_instructors pi ON pi.program_id = pc.program_id
      WHERE pc.child_id = mr_children.id
        AND pi.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS mr_field_source_catalog_select ON public.mr_field_source_catalog;
CREATE POLICY mr_field_source_catalog_select
  ON public.mr_field_source_catalog FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.mr_session_child_records IS
  'MOVE TRACK observation. NULL=Not Assessed, 0=assessed absent. No composite scores. Typical Performance in structured fields; Meaningful Change in observation_note.';

COMMENT ON COLUMN public.mr_session_child_records.observation_opportunity_band IS
  'SM-02: one|two|three_plus meaningful participation opportunities; NULL=not assessed. Drives Typical Performance confidence.';

COMMENT ON COLUMN public.mr_session_child_records.independent_initiation IS
  'OBSERVED frequency 0-3. Excludes direct action cues (go, step on red, grab ball). See Scoring Manual SM-04.';

COMMENT ON COLUMN public.mr_session_child_records.self_reengagement IS
  'Separate construct: re-engagement after leaving. NULL=no opportunity, false=not seen, true=seen.';

COMMENT ON COLUMN public.mr_session_child_records.frw_seconds IS
  'SPOMOVE program setting 1-6 (SYSTEM). NOT reaction time. sec 1 = Challenge, excluded from growth Impact.';

COMMENT ON COLUMN public.mr_session_child_records.frw_status IS
  'FRW stability classification. Growth Impact uses observed_stable + seconds 2-6 only.';

COMMIT;
