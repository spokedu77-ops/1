-- import-center가 curriculum 행과 1:1로 잡도록 해, 삭제·SUB 전환 시 Pro 뱅크에서 자동 비공개 처리 가능하게 함
ALTER TABLE public.spokedu_pro_programs
  ADD COLUMN IF NOT EXISTS source_center_curriculum_id integer REFERENCES public.curriculum (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_spokedu_pro_programs_source_center_curriculum
  ON public.spokedu_pro_programs (source_center_curriculum_id);

COMMENT ON COLUMN public.spokedu_pro_programs.source_center_curriculum_id IS
  '센터 curriculum.id — 동기화 시 설정. curriculum 삭제 시 NULL(SUB 비공개 처리는 import-center에서 수행)';

-- 기존 행: 제목·URL이 본편(is_sub false) 커리큘럼과 일치하면 id 연결
UPDATE public.spokedu_pro_programs AS p
SET source_center_curriculum_id = c.id
FROM public.curriculum AS c
WHERE coalesce(c.is_sub, false) = false
  AND trim(coalesce(p.title, '')) = trim(coalesce(c.title, ''))
  AND trim(coalesce(p.video_url, '')) = trim(coalesce(c.url, ''));
