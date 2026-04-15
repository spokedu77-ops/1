-- 개인 커리큘럼 탭 정규화 (줄넘기/인라인/단일탭 종목)
-- 목적:
-- 1) 탭 클릭 시 같은 데이터만 보이는 현상(잘못된 sub_tab 값) 복구
-- 2) UI 상수(PERSONAL_SUB_TABS)와 DB sub_tab 값을 일치
-- 사용:
-- Supabase SQL Editor에서 한 번 실행

-- 1) 줄넘기 스탭 표기 통일
UPDATE public.personal_curriculum
SET sub_tab = CASE trim(sub_tab)
  WHEN '1' THEN '스탭 1'
  WHEN '2' THEN '스탭 2'
  WHEN '3' THEN '스탭 3'
  WHEN '4' THEN '스탭 4'
  WHEN '5' THEN '스탭 5'
  WHEN '6' THEN '음악줄넘기'
  WHEN '스탭1' THEN '스탭 1'
  WHEN '스탭2' THEN '스탭 2'
  WHEN '스탭3' THEN '스탭 3'
  WHEN '스탭4' THEN '스탭 4'
  WHEN '스탭5' THEN '스탭 5'
  ELSE sub_tab
END,
    updated_at = NOW()
WHERE category = '줄넘기'
  AND trim(sub_tab) IN (
    '1', '2', '3', '4', '5', '6',
    '스탭1', '스탭2', '스탭3', '스탭4', '스탭5'
  );

-- 줄넘기: 음악 탭 표기 통일
UPDATE public.personal_curriculum
SET sub_tab = '음악줄넘기',
    updated_at = NOW()
WHERE category = '줄넘기'
  AND trim(sub_tab) IN ('음악', '음악 줄넘기', 'music', 'Music');

-- 2) 인라인 스탭 표기 통일
UPDATE public.personal_curriculum
SET sub_tab = CASE trim(sub_tab)
  WHEN '1' THEN '스탭 1'
  WHEN '2' THEN '스탭 2'
  WHEN '3' THEN '스탭 3'
  WHEN '4' THEN '스탭 4'
  WHEN '5' THEN '스탭 5'
  WHEN '스탭1' THEN '스탭 1'
  WHEN '스탭2' THEN '스탭 2'
  WHEN '스탭3' THEN '스탭 3'
  WHEN '스탭4' THEN '스탭 4'
  WHEN '스탭5' THEN '스탭 5'
  ELSE sub_tab
END,
    updated_at = NOW()
WHERE category = '인라인'
  AND trim(sub_tab) IN (
    '1', '2', '3', '4', '5',
    '스탭1', '스탭2', '스탭3', '스탭4', '스탭5'
  );

-- 3) 단일 탭 종목은 sub_tab을 카테고리명으로 고정
UPDATE public.personal_curriculum
SET sub_tab = category,
    updated_at = NOW()
WHERE category IN ('달리기(육상)', '자전거', '축구', '농구', '배드민턴', '수행평가')
  AND (
    sub_tab IS NULL
    OR trim(sub_tab) = ''
    OR trim(sub_tab) <> category
  );

-- 4) 확인용 리포트
SELECT category, sub_tab, COUNT(*) AS row_count
FROM public.personal_curriculum
GROUP BY category, sub_tab
ORDER BY category, sub_tab;
