import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type FeedbackCorrectionInputSnapshot,
  buildWorkerJobContext,
  normalizeCorrectionDraft,
} from '@/app/lib/automation/feedbackCorrectionDraft';
import { validateFeedbackCorrectionQuality } from '@/app/lib/automation/feedbackCorrectionQuality';
import { hasSessionFeedback } from '@/app/lib/server/sessionFeedbackGuard';
import type { FeedbackFields } from '@/app/lib/feedbackValidation';

type ServiceSupabase = SupabaseClient;

export type FeedbackCorrectionJobRow = {
  id: string;
  session_id: string;
  status: string;
  idempotency_key: string;
  input_snapshot: FeedbackCorrectionInputSnapshot;
  correction_draft: FeedbackFields | null;
  worker_id: string | null;
  lease_until: string | null;
  attempt_count: number;
  error_code: string | null;
  error_detail: string | null;
  requested_by: string | null;
  consumed_at: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export async function loadSessionCorrectionSnapshot(
  service: ServiceSupabase,
  sessionId: string,
): Promise<
  | { ok: true; snapshot: FeedbackCorrectionInputSnapshot; teacherName: string | null; lessonPlanContent: string | null }
  | { ok: false; code: string; status: number }
> {
  const { data: row, error } = await service
    .from('sessions')
    .select('id, title, start_at, session_type, students_text, feedback_fields, status, lesson_plans(content), users:created_by(name)')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) return { ok: false, code: 'SESSION_LOOKUP_FAILED', status: 500 };
  if (!row) return { ok: false, code: 'SESSION_NOT_FOUND', status: 404 };

  const feedbackFields =
    row.feedback_fields && typeof row.feedback_fields === 'object' && !Array.isArray(row.feedback_fields)
      ? (row.feedback_fields as FeedbackFields)
      : {};

  const snapshot: FeedbackCorrectionInputSnapshot = {
    feedback_fields: feedbackFields,
    students_text: String(row.students_text ?? ''),
    session_type: String(row.session_type ?? ''),
    title: String(row.title ?? ''),
    start_at: String(row.start_at ?? ''),
  };

  if (!hasSessionFeedback(snapshot)) {
    return { ok: false, code: 'SESSION_FEEDBACK_REQUIRED', status: 400 };
  }

  const lessonPlans = row.lesson_plans as { content?: unknown }[] | { content?: unknown } | null;
  const lessonPlanContent = Array.isArray(lessonPlans)
    ? String(lessonPlans[0]?.content ?? '') || null
    : lessonPlans && typeof lessonPlans === 'object'
      ? String((lessonPlans as { content?: unknown }).content ?? '') || null
      : null;

  const users = row.users as { name?: string } | { name?: string }[] | null;
  const teacherName = Array.isArray(users)
    ? users[0]?.name ?? null
    : users?.name ?? null;

  return { ok: true, snapshot, teacherName, lessonPlanContent };
}

export function parseJobRow(raw: Record<string, unknown>): FeedbackCorrectionJobRow {
  return {
    id: String(raw.id),
    session_id: String(raw.session_id),
    status: String(raw.status),
    idempotency_key: String(raw.idempotency_key),
    input_snapshot: raw.input_snapshot as FeedbackCorrectionInputSnapshot,
    correction_draft: (raw.correction_draft as FeedbackFields | null) ?? null,
    worker_id: raw.worker_id != null ? String(raw.worker_id) : null,
    lease_until: raw.lease_until != null ? String(raw.lease_until) : null,
    attempt_count: Number(raw.attempt_count ?? 0),
    error_code: raw.error_code != null ? String(raw.error_code) : null,
    error_detail: raw.error_detail != null ? String(raw.error_detail) : null,
    requested_by: raw.requested_by != null ? String(raw.requested_by) : null,
    consumed_at: raw.consumed_at != null ? String(raw.consumed_at) : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    started_at: raw.started_at != null ? String(raw.started_at) : null,
    completed_at: raw.completed_at != null ? String(raw.completed_at) : null,
  };
}

export function validateWorkerCompletionDraft(
  snapshot: FeedbackCorrectionInputSnapshot,
  draftRaw: unknown,
): { ok: true; draft: FeedbackFields } | { ok: false; error: string } {
  const draft = normalizeCorrectionDraft(draftRaw, snapshot);
  if (!draft) {
    return { ok: false, error: '교정 초안 형식이 올바르지 않습니다.' };
  }
  const qualityError = validateFeedbackCorrectionQuality(snapshot, draft);
  if (qualityError) {
    return { ok: false, error: qualityError };
  }
  return { ok: true, draft };
}

export function toWorkerPayload(
  job: FeedbackCorrectionJobRow,
  lessonPlanContent: string | null,
): Record<string, unknown> {
  return buildWorkerJobContext({
    jobId: job.id,
    sessionId: job.session_id,
    snapshot: job.input_snapshot,
    lessonPlanContent,
  });
}
