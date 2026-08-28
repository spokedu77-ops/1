-- 메모장 A안: 페이지당 body 텍스트 하나. 기존 블록은 best-effort로 body에 합침.

ALTER TABLE public.admin_memos
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.admin_memos.body IS '페이지 본문 (plain text, - [ ] 체크 문법)';

-- 루트 블록만 body로 이전 (토글 안 자식은 수동 정리)
UPDATE public.admin_memos m
SET body = sub.agg
FROM (
  SELECT
    memo_id,
    string_agg(
      CASE
        WHEN type = 'checklist' THEN
          (CASE WHEN checked THEN '- [x] ' ELSE '- [ ] ' END) || content
        WHEN type = 'toggle' THEN '## ' || content
        ELSE content
      END,
      E'\n'
      ORDER BY order_index
    ) AS agg
  FROM public.admin_memo_blocks
  WHERE parent_block_id IS NULL
  GROUP BY memo_id
) sub
WHERE m.id = sub.memo_id
  AND m.body = '';
