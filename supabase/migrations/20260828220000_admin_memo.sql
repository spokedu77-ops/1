-- 어드민 공유 메모장 (admin/note 와 분리). 브라우저 direct write 없음.

CREATE TABLE IF NOT EXISTS public.admin_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.admin_memos (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_memos_parent_id_idx ON public.admin_memos (parent_id);
CREATE INDEX IF NOT EXISTS admin_memos_order_idx ON public.admin_memos (parent_id, order_index);

CREATE TABLE IF NOT EXISTS public.admin_memo_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES public.admin_memos (id) ON DELETE CASCADE,
  parent_block_id uuid REFERENCES public.admin_memo_blocks (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text', 'checklist', 'toggle')),
  content text NOT NULL DEFAULT '',
  checked boolean NOT NULL DEFAULT false,
  collapsed boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_memo_blocks_memo_id_idx ON public.admin_memo_blocks (memo_id);
CREATE INDEX IF NOT EXISTS admin_memo_blocks_parent_idx ON public.admin_memo_blocks (memo_id, parent_block_id, order_index);

ALTER TABLE public.admin_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_memo_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_memos_service_role_all ON public.admin_memos;
CREATE POLICY admin_memos_service_role_all
  ON public.admin_memos
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS admin_memo_blocks_service_role_all ON public.admin_memo_blocks;
CREATE POLICY admin_memo_blocks_service_role_all
  ON public.admin_memo_blocks
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

COMMENT ON TABLE public.admin_memos IS '어드민 공유 메모장 페이지 트리';
COMMENT ON TABLE public.admin_memo_blocks IS '어드민 공유 메모장 블록 (text/checklist/toggle)';
