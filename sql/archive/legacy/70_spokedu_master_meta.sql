-- ================================================================
-- spokedu-master 전용 메타 테이블
-- 실행 순서: 70 (69 이후)
-- ================================================================

-- ================================================================
-- 1. 프로그램 커스터마이징 메타 (curriculum.id 기반 오버레이)
-- ================================================================
CREATE TABLE IF NOT EXISTS spokedu_master_program_meta (
  curriculum_id   INTEGER PRIMARY KEY,         -- curriculum.id 참조
  sm_tags         TEXT[]  NOT NULL DEFAULT '{}',  -- spokedu-master 태그 (민첩성, 협동 등)
  sm_theme        TEXT    DEFAULT NULL,            -- 테마 분류 (공간 반응, 리듬 협응 등)
  sm_grade        TEXT    DEFAULT NULL,            -- 대상 연령 ('유아', '초등 저학년', '전학년' 등)
  sm_space        TEXT    DEFAULT NULL,            -- 공간 요건 ('좁은 공간', '넓은 공간', '실외 가능' 등)
  sm_is_pro       BOOLEAN DEFAULT FALSE,           -- PRO 전용 게이팅
  sm_is_new       BOOLEAN DEFAULT FALSE,           -- NEW 배지
  sm_is_hot       BOOLEAN DEFAULT FALSE,           -- HOT 배지
  sm_display_order INTEGER DEFAULT 0,              -- 라이브러리 표시 순서
  sm_colors       TEXT[]  DEFAULT '{}',            -- [color1, color2, color3, color4] (ThumbGrid용)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE spokedu_master_program_meta IS 'spokedu-master 라이브러리 전용 메타. curriculum 원본을 건드리지 않고 태그·테마·등급·PRO 설정을 덧붙임.';

-- ================================================================
-- 2. SPOMOVE 드릴 메타 (Core5Catalog programId 기반)
-- ================================================================
CREATE TABLE IF NOT EXISTS spokedu_master_drill_meta (
  drill_id        TEXT    PRIMARY KEY,             -- Core5Catalog programId (예: 'SR-01') 또는 커스텀 드릴 id
  display_name    TEXT    DEFAULT NULL,            -- 화면 표시 이름 오버라이드 (NULL이면 catalog 이름 사용)
  sm_tags         TEXT[]  NOT NULL DEFAULT '{}',  -- 드릴 태그
  is_pro          BOOLEAN DEFAULT FALSE,           -- PRO 전용 잠금
  is_visible      BOOLEAN DEFAULT TRUE,            -- 화면 노출 여부
  display_order   INTEGER DEFAULT 0,              -- 허브 화면 순서
  engine_mode     TEXT    DEFAULT NULL,            -- Core5 engine.mode (NULL이면 기본 큐 UI)
  engine_level    INTEGER DEFAULT NULL,            -- Core5 engine.level
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE spokedu_master_drill_meta IS 'spokedu-master SPOMOVE 드릴 메타. Core5Catalog programId 기반. 이름·PRO·가시성·표시 순서·엔진 연결을 관리.';

-- ================================================================
-- 3. RLS: service_role 전용 (API route에서만 접근)
-- ================================================================
ALTER TABLE spokedu_master_program_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE spokedu_master_drill_meta   ENABLE ROW LEVEL SECURITY;

-- 정책 없음 = authenticated/anon 직접 접근 불가. API에서 getServiceSupabase() 사용.

-- ================================================================
-- 4. updated_at 자동 갱신 트리거
-- ================================================================
CREATE OR REPLACE FUNCTION update_spokedu_master_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sm_program_meta_updated_at
  BEFORE UPDATE ON spokedu_master_program_meta
  FOR EACH ROW EXECUTE FUNCTION update_spokedu_master_updated_at();

CREATE OR REPLACE TRIGGER trg_sm_drill_meta_updated_at
  BEFORE UPDATE ON spokedu_master_drill_meta
  FOR EACH ROW EXECUTE FUNCTION update_spokedu_master_updated_at();

SELECT 'spokedu_master_program_meta + spokedu_master_drill_meta (70) applied.' AS status;
