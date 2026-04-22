-- SUB 프로그램 구분 플래그 (월·주차 무관)
ALTER TABLE public.curriculum
  ADD COLUMN IF NOT EXISTS is_sub boolean NOT NULL DEFAULT false;

-- 교구 태그 (center_equipment.number 값 배열, 1~12)
ALTER TABLE public.curriculum
  ADD COLUMN IF NOT EXISTS equipment_tag_numbers integer[];

COMMENT ON COLUMN public.curriculum.is_sub IS 'true이면 SUB 프로그램(월·주차 미사용)';
COMMENT ON COLUMN public.curriculum.equipment_tag_numbers IS '교구 태그 번호 배열 (center_equipment.number 1~12)';

-- 기존 행 백필
UPDATE public.curriculum SET is_sub = false WHERE is_sub IS NULL;
