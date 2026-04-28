-- center_history: 관리자 수정·삭제 (기존 SELECT/INSERT와 동일 역할 조건)

DROP POLICY IF EXISTS "center_history_update_admin" ON public.center_history;
CREATE POLICY "center_history_update_admin"
  ON public.center_history FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')
    )
  );

DROP POLICY IF EXISTS "center_history_delete_admin" ON public.center_history;
CREATE POLICY "center_history_delete_admin"
  ON public.center_history FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'master')
    )
  );
