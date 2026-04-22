-- curriculum_sub_tags RLS 정책
-- SELECT: 로그인한 모든 사용자 (관리자 + 강사)
-- INSERT / UPDATE / DELETE: 관리자(role = 'admin')만
ALTER TABLE public.curriculum_sub_tags ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 로그인 사용자
DROP POLICY IF EXISTS "curriculum_sub_tags_read" ON public.curriculum_sub_tags;
CREATE POLICY "curriculum_sub_tags_read"
  ON public.curriculum_sub_tags
  FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기(INSERT): 관리자만
DROP POLICY IF EXISTS "curriculum_sub_tags_admin_insert" ON public.curriculum_sub_tags;
CREATE POLICY "curriculum_sub_tags_admin_insert"
  ON public.curriculum_sub_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 수정(UPDATE): 관리자만
DROP POLICY IF EXISTS "curriculum_sub_tags_admin_update" ON public.curriculum_sub_tags;
CREATE POLICY "curriculum_sub_tags_admin_update"
  ON public.curriculum_sub_tags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 삭제(DELETE): 관리자만
DROP POLICY IF EXISTS "curriculum_sub_tags_admin_delete" ON public.curriculum_sub_tags;
CREATE POLICY "curriculum_sub_tags_admin_delete"
  ON public.curriculum_sub_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
