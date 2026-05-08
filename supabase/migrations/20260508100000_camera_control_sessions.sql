CREATE TABLE IF NOT EXISTS public.camera_control_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'paired', 'active', 'ended', 'expired')),
  player_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  controller_state JSONB,
  last_command JSONB,
  last_command_id TEXT,
  last_ack_command_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS camera_control_sessions_active_code_key
  ON public.camera_control_sessions (code)
  WHERE status IN ('waiting', 'paired', 'active');

CREATE INDEX IF NOT EXISTS idx_camera_control_sessions_created_by_created
  ON public.camera_control_sessions (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_camera_control_sessions_expires_at
  ON public.camera_control_sessions (expires_at);

ALTER TABLE public.camera_control_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "camera_control_sessions_owner_select" ON public.camera_control_sessions;
CREATE POLICY "camera_control_sessions_owner_select"
  ON public.camera_control_sessions
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "camera_control_sessions_owner_insert" ON public.camera_control_sessions;
CREATE POLICY "camera_control_sessions_owner_insert"
  ON public.camera_control_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "camera_control_sessions_owner_update" ON public.camera_control_sessions;
CREATE POLICY "camera_control_sessions_owner_update"
  ON public.camera_control_sessions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

COMMENT ON TABLE public.camera_control_sessions IS 'Short-lived pairing sessions between camera player and mobile controller.';
COMMENT ON COLUMN public.camera_control_sessions.code IS 'Short pairing code shown on the player and entered by the controller.';
COMMENT ON COLUMN public.camera_control_sessions.last_command IS 'Latest controller command envelope. Player applies it once and acknowledges last_command_id.';
