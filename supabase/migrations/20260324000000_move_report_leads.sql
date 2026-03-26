CREATE TABLE IF NOT EXISTS move_report_leads (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20)  NOT NULL,
  child_name    VARCHAR(50),
  age_group     VARCHAR(20),
  profile_key   VARCHAR(8),
  profile_title VARCHAR(100),
  consent       BOOLEAN      NOT NULL DEFAULT TRUE,
  source        VARCHAR(30)  DEFAULT 'move_report',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS move_report_leads_phone_key_idx
  ON move_report_leads(phone, profile_key);

ALTER TABLE move_report_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON move_report_leads
  FOR ALL USING (auth.role() = 'service_role');
