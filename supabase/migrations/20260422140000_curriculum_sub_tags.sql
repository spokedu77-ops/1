-- SUB 커리큘럼 전용 독립 교구 태그 테이블 (center_equipment와 완전히 무관)
CREATE TABLE IF NOT EXISTS public.curriculum_sub_tags (
  id            serial      PRIMARY KEY,
  name          text        NOT NULL,
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.curriculum_sub_tags              IS 'SUB 커리큘럼 전용 독립 교구 태그 (center_equipment와 무관)';
COMMENT ON COLUMN public.curriculum_sub_tags.name         IS '태그 표시 이름 (관리자가 자유롭게 수정 가능)';
COMMENT ON COLUMN public.curriculum_sub_tags.display_order IS '태그 정렬 순서 (오름차순)';

-- curriculum.equipment_tag_numbers 는 이제 curriculum_sub_tags.id 배열을 담음
COMMENT ON COLUMN public.curriculum.equipment_tag_numbers IS 'curriculum_sub_tags.id 배열 (SUB 전용 독립 태그)';
