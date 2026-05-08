CREATE TABLE IF NOT EXISTS public.camera_activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NULL,
  teacher_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id uuid NULL,
  lesson_session_id uuid NULL,
  source text NOT NULL DEFAULT 'player',
  mode text NOT NULL,
  difficulty text NOT NULL,
  duration_sec integer NOT NULL,
  participant_mode text NOT NULL DEFAULT 'unknown',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  device jsonb NULL,
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT camera_activity_sessions_source_check
    CHECK (source IN ('player', 'controller', 'demo', 'import')),
  CONSTRAINT camera_activity_sessions_mode_check
    CHECK (mode IN ('speed', 'sequence', 'shape', 'moving', 'balance', 'mirror')),
  CONSTRAINT camera_activity_sessions_difficulty_check
    CHECK (difficulty IN ('easy', 'normal', 'hard')),
  CONSTRAINT camera_activity_sessions_participant_mode_check
    CHECK (participant_mode IN ('solo', 'multi', 'team', 'unknown'))
);

CREATE TABLE IF NOT EXISTS public.camera_activity_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.camera_activity_sessions(id) ON DELETE CASCADE,
  student_id uuid NULL,
  team_id text NULL,
  slot_index integer NOT NULL,
  display_name text NULL,
  score integer NOT NULL DEFAULT 0,
  avg_reaction_ms integer NULL,
  hit_count integer NOT NULL DEFAULT 0,
  miss_count integer NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camera_activity_sessions_center_created
  ON public.camera_activity_sessions (center_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_camera_activity_sessions_teacher_created
  ON public.camera_activity_sessions (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_camera_activity_sessions_class_created
  ON public.camera_activity_sessions (class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_camera_activity_sessions_mode_created
  ON public.camera_activity_sessions (mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_camera_activity_sessions_created_by_created
  ON public.camera_activity_sessions (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_camera_activity_participants_session_slot
  ON public.camera_activity_participants (session_id, slot_index);

CREATE INDEX IF NOT EXISTS idx_camera_activity_participants_student_created
  ON public.camera_activity_participants (student_id, created_at DESC);

ALTER TABLE public.camera_activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_activity_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "camera_activity_sessions_owner_select" ON public.camera_activity_sessions;
CREATE POLICY "camera_activity_sessions_owner_select"
  ON public.camera_activity_sessions
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "camera_activity_sessions_owner_insert" ON public.camera_activity_sessions;
CREATE POLICY "camera_activity_sessions_owner_insert"
  ON public.camera_activity_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "camera_activity_sessions_owner_update" ON public.camera_activity_sessions;
CREATE POLICY "camera_activity_sessions_owner_update"
  ON public.camera_activity_sessions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR teacher_id = auth.uid())
  WITH CHECK (created_by = auth.uid() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "camera_activity_participants_owner_select" ON public.camera_activity_participants;
CREATE POLICY "camera_activity_participants_owner_select"
  ON public.camera_activity_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.camera_activity_sessions s
      WHERE s.id = camera_activity_participants.session_id
        AND (s.created_by = auth.uid() OR s.teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "camera_activity_participants_owner_insert" ON public.camera_activity_participants;
CREATE POLICY "camera_activity_participants_owner_insert"
  ON public.camera_activity_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.camera_activity_sessions s
      WHERE s.id = camera_activity_participants.session_id
        AND (s.created_by = auth.uid() OR s.teacher_id = auth.uid())
    )
  );

COMMENT ON TABLE public.camera_activity_sessions IS 'Saved SPOKEDU camera activity results.';
COMMENT ON TABLE public.camera_activity_participants IS 'Per-player or per-team result rows for camera activities.';
