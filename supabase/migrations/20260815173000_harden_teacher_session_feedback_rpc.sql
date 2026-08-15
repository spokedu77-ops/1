alter function public.teacher_save_session_feedback(
  uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text
) security invoker;

revoke all on function public.teacher_save_session_feedback(
  uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from public;

revoke all on function public.teacher_save_session_feedback(
  uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from anon;

revoke all on function public.teacher_save_session_feedback(
  uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from authenticated;

grant execute on function public.teacher_save_session_feedback(
  uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text
) to service_role;
