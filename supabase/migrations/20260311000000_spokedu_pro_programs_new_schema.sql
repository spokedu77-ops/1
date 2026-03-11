-- ============================================================
-- 스포키듀 프로그램 뱅크 스키마 변경
-- 분류: 기능 종류, 메인테마, 인원구성 (PTG는 슬로건)
-- ============================================================

-- 기존 CHECK 제약 이름 확인 후 제거 (PostgreSQL이 생성한 이름)
ALTER TABLE spokedu_pro_programs DROP CONSTRAINT IF EXISTS spokedu_pro_programs_theme_key_check;
ALTER TABLE spokedu_pro_programs DROP CONSTRAINT IF EXISTS spokedu_pro_programs_category_check;

-- 새 컬럼 추가
ALTER TABLE spokedu_pro_programs
  ADD COLUMN IF NOT EXISTS function_type TEXT CHECK (function_type IS NULL OR function_type IN ('순발력','민첩성','리듬감','유연성','협응력','심폐지구력','근지구력')),
  ADD COLUMN IF NOT EXISTS main_theme TEXT CHECK (main_theme IS NULL OR main_theme IN ('육상놀이체육','협동형','경쟁형','도전형','태그형')),
  ADD COLUMN IF NOT EXISTS group_size TEXT CHECK (group_size IS NULL OR group_size IN ('개인','짝꿍','소그룹','대그룹')),
  ADD COLUMN IF NOT EXISTS checklist TEXT,
  ADD COLUMN IF NOT EXISTS equipment TEXT,
  ADD COLUMN IF NOT EXISTS activity_method TEXT,
  ADD COLUMN IF NOT EXISTS activity_tip TEXT;

-- 기존 분류 컬럼 제거 (선택: 새 구조만 사용)
ALTER TABLE spokedu_pro_programs
  DROP COLUMN IF EXISTS theme_key,
  DROP COLUMN IF EXISTS theme_label,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS gradient_class,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS target_brain,
  DROP COLUMN IF EXISTS target_physic,
  DROP COLUMN IF EXISTS tool,
  DROP COLUMN IF EXISTS setup_guide;

-- 인덱스 (필터용)
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_programs_function_type ON spokedu_pro_programs(function_type);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_programs_main_theme ON spokedu_pro_programs(main_theme);
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_programs_group_size ON spokedu_pro_programs(group_size);

COMMENT ON COLUMN spokedu_pro_programs.function_type IS '기능 종류: 순발력, 민첩성, 리듬감, 유연성, 협응력, 심폐지구력, 근지구력';
COMMENT ON COLUMN spokedu_pro_programs.main_theme IS '메인테마: 육상놀이체육, 협동형, 경쟁형, 도전형, 태그형';
COMMENT ON COLUMN spokedu_pro_programs.group_size IS '인원구성: 개인, 짝꿍, 소그룹, 대그룹';
