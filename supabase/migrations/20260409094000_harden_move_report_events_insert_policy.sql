drop policy if exists "move_report_events_insert_anon" on public.move_report_events;

create policy "move_report_events_insert_anon"
on public.move_report_events
for insert
to anon, authenticated
with check (
  event_name in (
    'intro_started',
    'survey_completed',
    'result_viewed',
    'lead_saved',
    'share_clicked',
    'shared_entry_opened',
    'shared_entry_completed'
  )
  and char_length(btrim(session_id)) >= 8
  and jsonb_typeof(meta) = 'object'
);
