-- 센터 curriculum SUB 탭(is_sub=true) 프로그램을 스포키듀 Pro 뱅크에서 제외하기 위한 플래그
ALTER TABLE public.spokedu_pro_programs
  ADD COLUMN IF NOT EXISTS center_curriculum_is_sub boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.spokedu_pro_programs.center_curriculum_is_sub IS
  'public.curriculum.is_sub 동기값. true면 SUB 탭 전용 — Pro 프로그램 뱅크 GET에서 제외';

-- 기존 행: curriculum과 제목·영상 URL로 매칭되는 SUB 행만 true로 표시
UPDATE public.spokedu_pro_programs AS p
SET center_curriculum_is_sub = true
FROM public.curriculum AS c
WHERE c.is_sub = true
  AND trim(coalesce(p.title, '')) = trim(coalesce(c.title, ''))
  AND trim(coalesce(p.video_url, '')) = trim(coalesce(c.url, ''));
