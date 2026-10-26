-- Post-commit rollback source only. First roll the application back, then publish
-- this through a separately approved NEW migration; never delete history 20261026171825.
DROP TRIGGER IF EXISTS trg_session_teacher_schedule_conflict_guard ON public.sessions;
DROP FUNCTION IF EXISTS public.admin_apply_session_schedule_changes(jsonb);
DROP FUNCTION IF EXISTS public.trg_session_teacher_schedule_conflict_guard();
DROP TABLE IF EXISTS private.session_teacher_schedule_slots;
-- btree_gist is retained because it may be shared by other database objects.
