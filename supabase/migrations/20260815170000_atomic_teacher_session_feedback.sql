create or replace function public.teacher_save_session_feedback(
  p_session_id uuid,
  p_is_center boolean,
  p_feedback_fields jsonb,
  p_photo_urls jsonb,
  p_requested_file_urls jsonb,
  p_removed_file_urls jsonb,
  p_requested_file_names jsonb,
  p_students_text text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_row public.sessions%rowtype;
  final_urls text[] := array[]::text[];
  final_names text[] := array[]::text[];
  current_urls text[] := array[]::text[];
  current_names jsonb := '[]'::jsonb;
  requested_urls text[] := array[]::text[];
  removed_urls text[] := array[]::text[];
  merged_fields jsonb := coalesce(p_feedback_fields, '{}'::jsonb);
  item text;
  item_index integer;
begin
  select * into current_row
  from public.sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  select coalesce(array_agg(value), array[]::text[])
    into requested_urls
  from jsonb_array_elements_text(coalesce(p_requested_file_urls, '[]'::jsonb));
  select coalesce(array_agg(value), array[]::text[])
    into removed_urls
  from jsonb_array_elements_text(coalesce(p_removed_file_urls, '[]'::jsonb));

  if p_is_center then
    select coalesce(array_agg(value), array[]::text[])
      into current_urls
    from jsonb_array_elements_text(coalesce(to_jsonb(current_row.file_url), '[]'::jsonb));
    current_names := coalesce(current_row.feedback_fields->'center_document_names', '[]'::jsonb);

    for item_index in 1..coalesce(array_length(current_urls, 1), 0) loop
      item := current_urls[item_index];
      if not (item = any(removed_urls)) and not (item = any(final_urls)) then
        final_urls := array_append(final_urls, item);
        final_names := array_append(final_names, coalesce(current_names->>(item_index - 1), '첨부 파일 ' || item_index));
      end if;
    end loop;
    for item_index in 1..coalesce(array_length(requested_urls, 1), 0) loop
      item := requested_urls[item_index];
      if not (item = any(removed_urls)) and not (item = any(final_urls)) then
        final_urls := array_append(final_urls, item);
        final_names := array_append(final_names, coalesce(p_requested_file_names->>item, '첨부 파일 ' || (array_length(final_urls, 1))));
      end if;
    end loop;

    if coalesce(array_length(final_urls, 1), 0) < 1 then
      raise exception 'CENTER_FILE_REQUIRED';
    end if;
    if array_length(final_urls, 1) > 2 then
      raise exception 'CENTER_FILE_LIMIT';
    end if;
    merged_fields := merged_fields || jsonb_build_object('center_document_names', to_jsonb(final_names));
  else
    final_urls := requested_urls;
    merged_fields := merged_fields - 'center_document_names';
  end if;

  update public.sessions
  set status = 'finished',
      feedback_fields = merged_fields,
      students_text = p_students_text,
      photo_url = coalesce(p_photo_urls, '[]'::jsonb),
      file_url = to_jsonb(final_urls)
  where id = p_session_id;

  return jsonb_build_object('fileUrls', to_jsonb(final_urls), 'feedbackFields', merged_fields);
end;
$$;

revoke all on function public.teacher_save_session_feedback(uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text) from public;
revoke all on function public.teacher_save_session_feedback(uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text) from anon;
revoke all on function public.teacher_save_session_feedback(uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text) from authenticated;
grant execute on function public.teacher_save_session_feedback(uuid, boolean, jsonb, jsonb, jsonb, jsonb, jsonb, text) to service_role;
