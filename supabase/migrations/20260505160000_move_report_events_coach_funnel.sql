-- 코치 퍼널 이벤트 (anon insert 허용 목록 확장)
DROP POLICY IF EXISTS "move_report_events_insert_anon" ON public.move_report_events;

CREATE POLICY "move_report_events_insert_anon"
ON public.move_report_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_name IN (
    'move_report_started',
    'move_report_completed',
    'move_report_coach_link_created',
    'move_report_coach_link_landing',
    'move_report_coach_submission_completed',
    'move_report_coach_dashboard_viewed',
    'move_report_coach_csv_downloaded',
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
    'move_report_result_card_opened',
    'move_report_educator_cta_clicked',
    'move_report_educator_entry_clicked',
    'move_report_shared_page_viewed',
    'move_report_shared_page_link_copied',
    'move_report_shared_page_native_share_clicked',
    'move_report_shared_page_start_clicked',
    'move_report_educator_beta_form_opened',
    'move_report_educator_beta_submitted',
    'move_report_educator_beta_submit_failed'
  )
  AND char_length(btrim(session_id)) >= 8
  AND jsonb_typeof(meta) = 'object'
);
