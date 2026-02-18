/**
 * KPI 로깅 클라이언트
 * admin_productivity_events, subscriber_runtime_events
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

export type AdminProductivityEventType =
  | 'SCHEDULE_OPEN'
  | 'POLICY_APPLY'
  | 'SLOT_EDIT'
  | 'SCHEDULE_COMPLETE';

export type SubscriberRuntimeEventType =
  | 'PHASE_START'
  | 'PHASE_END'
  | 'DROP_OFF'
  | 'PRELOAD_DELAY';

export interface AdminProductivityEvent {
  event_type: AdminProductivityEventType;
  month_key?: string;
  duration_ms?: number;
  actor_id?: string;
  meta?: Record<string, unknown>;
}

export interface SubscriberRuntimeEvent {
  event_type: SubscriberRuntimeEventType;
  week_key?: string;
  session_id?: string;
  meta?: Record<string, unknown>;
}

/**
 * 관리자 생산성 이벤트 기록 (fire-and-forget)
 */
export function logAdminProductivity(event: AdminProductivityEvent): void {
  supabase
    .from('admin_productivity_events')
    .insert(event)
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('[logAdminProductivity]', error.message);
    });
}

/**
 * 구독자 런타임 이벤트 기록 (fire-and-forget)
 */
export function logSubscriberRuntime(event: SubscriberRuntimeEvent): void {
  supabase
    .from('subscriber_runtime_events')
    .insert(event)
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('[logSubscriberRuntime]', error.message);
    });
}
