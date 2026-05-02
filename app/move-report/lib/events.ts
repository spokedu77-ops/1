'use client';

import { getMoveReportAttribution } from './attribution';

export type MoveReportEventName =
  | 'move_report_started'
  | 'move_report_completed'
  | 'move_report_coach_link_created'
  | 'move_report_coach_link_landing'
  | 'move_report_coach_submission_completed'
  | 'move_report_coach_dashboard_viewed'
  | 'move_report_coach_csv_downloaded'
  | 'intro_started'
  | 'survey_completed'
  | 'result_viewed'
  | 'lead_saved'
  | 'share_clicked'
  | 'shared_entry_opened'
  | 'shared_entry_completed'
  | 'move_report_result_link_copied'
  | 'move_report_native_share_clicked'
  | 'move_report_share_card_opened'
  | 'move_report_result_card_opened'
  | 'move_report_educator_cta_clicked'
  | 'move_report_educator_entry_clicked'
  | 'move_report_shared_page_viewed'
  | 'move_report_shared_page_link_copied'
  | 'move_report_shared_page_native_share_clicked'
  | 'move_report_shared_page_start_clicked'
  | 'move_report_educator_beta_form_opened'
  | 'move_report_educator_beta_submitted'
  | 'move_report_educator_beta_submit_failed';

const SESSION_KEY = 'move_report_session_id';
const EVENT_TS_PREFIX = 'move_report_event_ts:';

const EVENT_COOLDOWN_MS: Record<MoveReportEventName, number> = {
  move_report_started: 10 * 60 * 1000,
  move_report_completed: 10 * 60 * 1000,
  move_report_coach_link_created: 15 * 1000,
  move_report_coach_link_landing: 10 * 1000,
  move_report_coach_submission_completed: 15 * 1000,
  move_report_coach_dashboard_viewed: 15 * 1000,
  move_report_coach_csv_downloaded: 5 * 1000,
  intro_started: 10 * 60 * 1000,
  survey_completed: 10 * 60 * 1000,
  result_viewed: 10 * 60 * 1000,
  lead_saved: 10 * 1000,
  share_clicked: 2 * 1000,
  shared_entry_opened: 10 * 60 * 1000,
  shared_entry_completed: 10 * 60 * 1000,
  move_report_result_link_copied: 2 * 1000,
  move_report_native_share_clicked: 2 * 1000,
  move_report_share_card_opened: 5 * 1000,
  move_report_result_card_opened: 5 * 1000,
  move_report_educator_cta_clicked: 5 * 1000,
  move_report_educator_entry_clicked: 5 * 1000,
  move_report_shared_page_viewed: 10 * 60 * 1000,
  move_report_shared_page_link_copied: 2 * 1000,
  move_report_shared_page_native_share_clicked: 2 * 1000,
  move_report_shared_page_start_clicked: 3 * 1000,
  move_report_educator_beta_form_opened: 60 * 1000,
  move_report_educator_beta_submitted: 10 * 1000,
  move_report_educator_beta_submit_failed: 3 * 1000,
};

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `mr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getMoveReportSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = createId();
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
}

export async function trackMoveReportEvent(params: {
  eventName: MoveReportEventName;
  shareKey?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const shareScope = params.shareKey ?? 'none';
    const stampKey = `${EVENT_TS_PREFIX}${params.eventName}:${shareScope}`;
    const cooldown = EVENT_COOLDOWN_MS[params.eventName] ?? 0;
    const now = Date.now();
    const prevRaw = window.sessionStorage.getItem(stampKey);
    const prev = prevRaw ? Number(prevRaw) : 0;
    if (cooldown > 0 && Number.isFinite(prev) && prev > 0 && now - prev < cooldown) {
      return;
    }
    window.sessionStorage.setItem(stampKey, String(now));

    const snap = getMoveReportAttribution();
    const baseMeta = params.meta ?? {};
    const meta =
      Object.keys(snap).length > 0
        ? { ...baseMeta, attribution: snap }
        : { ...baseMeta };

    await fetch('/api/move-report/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName: params.eventName,
        sessionId: getMoveReportSessionId(),
        shareKey: params.shareKey ?? null,
        meta,
      }),
    });
  } catch {
    // 이벤트 수집 실패는 사용자 플로우를 막지 않는다.
  }
}

