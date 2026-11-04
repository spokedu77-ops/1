import {
  FEEDBACK_TEXT_FIELD_KEYS,
  type FeedbackFields,
  type FeedbackTextFieldKey,
} from '@/app/lib/feedbackValidation';

export type FeedbackCorrectionInputSnapshot = {
  feedback_fields: FeedbackFields;
  students_text: string;
  session_type: string;
  title: string;
  start_at: string;
};

import { redactLessonPlanExcerpt } from '@/app/lib/automation/feedbackCorrectionQuality';

/** Worker/API boundary: text correction fields only; attachments metadata copied from snapshot. */
const DRAFT_ALLOWED_TOP_LEVEL = new Set<string>(FEEDBACK_TEXT_FIELD_KEYS);

export function normalizeCorrectionDraft(
  raw: unknown,
  snapshot: FeedbackCorrectionInputSnapshot,
): FeedbackFields | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  if ('feedback_fields' in source) return null;
  for (const key of Object.keys(source)) {
    if (!DRAFT_ALLOWED_TOP_LEVEL.has(key)) return null;
  }
  const out: FeedbackFields = {};
  for (const key of FEEDBACK_TEXT_FIELD_KEYS) {
    const value = source[key];
    if (typeof value !== 'string') return null;
    const trimmed = value.replace(/\0/g, '').trim();
    if (trimmed.length < 1) return null;
    out[key] = trimmed.slice(0, 8000);
  }
  if (Array.isArray(snapshot.feedback_fields.center_document_names)) {
    out.center_document_names = snapshot.feedback_fields.center_document_names.map((name) =>
      String(name).slice(0, 300),
    );
  }
  return out;
}

/** Heuristic guard: 교정 결과가 원문의 고유 토큰(숫자·시간 등)을 과도하게 제거하지 않았는지 검사. */
export function assertCorrectionPreservesSourceTokens(
  snapshot: FeedbackCorrectionInputSnapshot,
  draft: FeedbackFields,
): string | null {
  const sourceText = FEEDBACK_TEXT_FIELD_KEYS.map((key) => snapshot.feedback_fields[key] ?? '')
    .join('\n');
  const draftText = FEEDBACK_TEXT_FIELD_KEYS.map((key) => draft[key] ?? '').join('\n');
  const tokens = extractPreserveTokens(sourceText);
  if (tokens.length === 0) return null;
  const missing = tokens.filter((token) => !draftText.includes(token));
  if (missing.length === 0) return null;
  if (missing.length / tokens.length > 0.35) {
    return `교정 초안이 원문의 핵심 정보(시간·수치 등)를 과도하게 제거했습니다: ${missing.slice(0, 5).join(', ')}`;
  }
  return null;
}

function extractPreserveTokens(text: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /\b\d{1,2}:\d{2}\b/g,
    /\b\d{1,2}월\s*\d{1,2}일/g,
    /\b\d+(?:\.\d+)?%/g,
    /\b\d+\s*(?:회|명|살|학년|kg|km|m|cm|분|초)\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const token = match[0]?.trim();
      if (token) found.add(token);
    }
  }
  return [...found];
}

export function buildWorkerJobContext(input: {
  jobId: string;
  sessionId: string;
  snapshot: FeedbackCorrectionInputSnapshot;
  lessonPlanContent: string | null;
}): Record<string, unknown> {
  return {
    job_id: input.jobId,
    session_id: input.sessionId,
    session: {
      title: input.snapshot.title,
      start_at: input.snapshot.start_at,
      session_type: input.snapshot.session_type,
    },
    source_feedback: input.snapshot.feedback_fields,
    lesson_plan_excerpt: redactLessonPlanExcerpt(input.lessonPlanContent),
    rules: [
      '맞춤법·문장만 교정한다.',
      '관찰 사실·활동·시간·수치는 추가·삭제·왜곡하지 않는다.',
      '존재하지 않는 행동·성과·평가를 만들지 않는다.',
      'SPOMOVE 등 사용자가 적은 고유명사/항목명은 그대로 둔다.',
      '학생 실명·연락처 등 개인정보를 새로 넣지 않는다.',
      'SPOKEDU 수업 기록 형식(5개 항목)을 유지한다.',
    ],
    expected_field_keys: FEEDBACK_TEXT_FIELD_KEYS satisfies readonly FeedbackTextFieldKey[],
    output_format: 'JSON object with keys main_activity, strengths, improvements, next_goals, condition_notes only',
  };
}
