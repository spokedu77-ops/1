-- 공유 페이지 전용 이벤트명 허용
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
    'shared_entry_completed',
    'move_report_result_link_copied',
    'move_report_native_share_clicked',
    'move_report_share_card_opened',
    'move_report_educator_cta_clicked',
    'move_report_shared_page_viewed',
    'move_report_shared_page_link_copied',
    'move_report_shared_page_native_share_clicked',
    'move_report_shared_page_start_clicked'
  )
  and char_length(btrim(session_id)) >= 8
  and jsonb_typeof(meta) = 'object'
);
