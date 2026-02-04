-- ================================================================
-- 센터 정보 MVP 스키마
-- centers, center_finance_terms, programs, center_logs, center_files
-- 실행 순서: 27 (기존 마이그레이션 이후)
-- ================================================================

-- ================================================================
-- 1. centers
-- ================================================================
CREATE TABLE IF NOT EXISTS centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region_tag TEXT,
  address TEXT,
  access_note TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_role TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  contract_start DATE,
  contract_end DATE,
  weekly_schedule JSONB NOT NULL DEFAULT '[]',
  instructors_default JSONB NOT NULL DEFAULT '{"main":null,"sub":null,"backup":[]}',
  highlights TEXT,
  next_actions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_centers_status ON centers(status);
CREATE INDEX IF NOT EXISTS idx_centers_contract_end ON centers(contract_end);

-- ================================================================
-- 2. center_finance_terms (1:1 per center)
-- ================================================================
CREATE TABLE IF NOT EXISTS center_finance_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL UNIQUE REFERENCES centers(id) ON DELETE CASCADE,
  unit_price INT,
  payment_day TEXT,
  invoice_required BOOLEAN NOT NULL DEFAULT false,
  doc_checklist JSONB NOT NULL DEFAULT '[]',
  special_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_center_finance_terms_center_id ON center_finance_terms(center_id);

-- ================================================================
-- 3. programs (1:N per center)
-- ================================================================
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term TEXT,
  start_date DATE,
  end_date DATE,
  sessions_count INT,
  instructors JSONB NOT NULL DEFAULT '{}',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_center_id ON programs(center_id);

-- ================================================================
-- 4. center_logs (1:N per center)
-- ================================================================
CREATE TABLE IF NOT EXISTS center_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('request', 'issue', 'result', 'note')),
  content TEXT NOT NULL,
  next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_center_logs_center_id ON center_logs(center_id);

-- ================================================================
-- 5. center_files (1:N per center)
-- ================================================================
CREATE TABLE IF NOT EXISTS center_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_center_files_center_id ON center_files(center_id);

-- ================================================================
-- 6. updated_at 트리거 (공용 함수)
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS centers_updated_at ON centers;
CREATE TRIGGER centers_updated_at
  BEFORE UPDATE ON centers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS center_finance_terms_updated_at ON center_finance_terms;
CREATE TRIGGER center_finance_terms_updated_at
  BEFORE UPDATE ON center_finance_terms
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS programs_updated_at ON programs;
CREATE TRIGGER programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS center_logs_updated_at ON center_logs;
CREATE TRIGGER center_logs_updated_at
  BEFORE UPDATE ON center_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS center_files_updated_at ON center_files;
CREATE TRIGGER center_files_updated_at
  BEFORE UPDATE ON center_files
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- 7. RLS (MVP: authenticated 전원 허용, 추후 admin role로 좁히기)
-- ================================================================
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_finance_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_files ENABLE ROW LEVEL SECURITY;

-- centers
DROP POLICY IF EXISTS "authenticated_all_centers" ON centers;
CREATE POLICY "authenticated_all_centers" ON centers
  FOR ALL USING (auth.uid() IS NOT NULL);

-- center_finance_terms
DROP POLICY IF EXISTS "authenticated_all_center_finance_terms" ON center_finance_terms;
CREATE POLICY "authenticated_all_center_finance_terms" ON center_finance_terms
  FOR ALL USING (auth.uid() IS NOT NULL);

-- programs
DROP POLICY IF EXISTS "authenticated_all_programs" ON programs;
CREATE POLICY "authenticated_all_programs" ON programs
  FOR ALL USING (auth.uid() IS NOT NULL);

-- center_logs
DROP POLICY IF EXISTS "authenticated_all_center_logs" ON center_logs;
CREATE POLICY "authenticated_all_center_logs" ON center_logs
  FOR ALL USING (auth.uid() IS NOT NULL);

-- center_files
DROP POLICY IF EXISTS "authenticated_all_center_files" ON center_files;
CREATE POLICY "authenticated_all_center_files" ON center_files
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ================================================================
-- 완료
-- ================================================================
SELECT 'Centers schema (27) created successfully.' AS status;
