-- 센터 수업 커리큘럼 카드 표시 순서 (월·주차별)
ALTER TABLE public.curriculum
  ADD COLUMN IF NOT EXISTS display_order integer;

COMMENT ON COLUMN public.curriculum.display_order IS '같은 month·week 내 카드 정렬 (오름차순, 관리자 드래그로 설정)';

-- 기존 UI와 동일: 주차별 id 내림차순 → display_order 0,1,2,...
UPDATE public.curriculum AS c
SET display_order = r.ord
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY month, week ORDER BY id DESC) - 1) AS ord
  FROM public.curriculum
) AS r
WHERE c.id = r.id;
