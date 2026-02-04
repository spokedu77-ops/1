-- ================================================================
-- KPI Logging v0
-- 관리자 생산성 + 구독자 런타임 이벤트
-- ================================================================

-- 관리자 생산성 이벤트
CREATE TABLE IF NOT EXISTS admin_productivity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  month_key TEXT,
  duration_ms INT,
  actor_id TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_productivity_event_type ON admin_productivity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_productivity_created ON admin_productivity_events(created_at);

ALTER TABLE admin_productivity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can insert productivity events" ON admin_productivity_events;
CREATE POLICY "Admin can insert productivity events"
ON admin_productivity_events FOR INSERT
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can select productivity events" ON admin_productivity_events;
CREATE POLICY "Admin can select productivity events"
ON admin_productivity_events FOR SELECT
USING (is_admin());

-- 구독자 런타임 이벤트
CREATE TABLE IF NOT EXISTS subscriber_runtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  week_key TEXT,
  session_id TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriber_runtime_event_type ON subscriber_runtime_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscriber_runtime_week_key ON subscriber_runtime_events(week_key);
CREATE INDEX IF NOT EXISTS idx_subscriber_runtime_created ON subscriber_runtime_events(created_at);

ALTER TABLE subscriber_runtime_events ENABLE ROW LEVEL SECURITY;

-- 구독자 페이지에서 insert (anon 또는 authenticated)
DROP POLICY IF EXISTS "Allow insert subscriber runtime events" ON subscriber_runtime_events;
CREATE POLICY "Allow insert subscriber runtime events"
ON subscriber_runtime_events FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can select subscriber events" ON subscriber_runtime_events;
CREATE POLICY "Admin can select subscriber events"
ON subscriber_runtime_events FOR SELECT
USING (is_admin());

COMMENT ON TABLE admin_productivity_events IS '관리자 편성 작업 KPI (SCHEDULE_OPEN, POLICY_APPLY, SLOT_EDIT, SCHEDULE_COMPLETE)';
COMMENT ON TABLE subscriber_runtime_events IS '구독자 phase 전환 KPI (PHASE_START, PHASE_END, DROP_OFF, PRELOAD_DELAY)';
