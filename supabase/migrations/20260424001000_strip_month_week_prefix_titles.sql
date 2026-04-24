-- ============================================================
-- 제목 접두사 정리: "[N월 N주]" 제거
-- - spokedu_pro_programs.title
-- - curriculum.title
-- ============================================================

-- spokedu_pro_programs
UPDATE spokedu_pro_programs
SET title = regexp_replace(title, '^\s*\[\s*\d+\s*월\s*\d+\s*주\s*\]\s*', '', 'g')
WHERE title ~ '^\s*\[\s*\d+\s*월\s*\d+\s*주\s*\]\s*';

-- curriculum
UPDATE curriculum
SET title = regexp_replace(title, '^\s*\[\s*\d+\s*월\s*\d+\s*주\s*\]\s*', '', 'g')
WHERE title ~ '^\s*\[\s*\d+\s*월\s*\d+\s*주\s*\]\s*';

