import { FEEDBACK_TEXT_FIELD_KEYS, type FeedbackFields } from '@/app/lib/feedbackValidation';
import type { FeedbackCorrectionInputSnapshot } from '@/app/lib/automation/feedbackCorrectionDraft';
import { assertCorrectionPreservesSourceTokens } from '@/app/lib/automation/feedbackCorrectionDraft';

/**
 * 토큰(시간·%·단위) 일치 검사는 LLM 환각을 막지 못한다.
 * - 동의어 치환, 누락 없는 사실 왜곡, 새 평가 문장 추가는 사람 검수와 diff UI가 최종 방어선이다.
 * - 아래 휴리스틱은 회귀 방지용 최소 가드레일이다.
 */

const SPOMOVE_LITERAL = /SPOMOVE[\w-]*/gi;
const PHONE_LIKE = /\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g;

export function redactLessonPlanExcerpt(content: string | null): string | null {
  if (!content) return null;
  return content.replace(PHONE_LIKE, '[연락처]').slice(0, 4000);
}

export function assertSpomoveUserLiteralsPreserved(
  snapshot: FeedbackCorrectionInputSnapshot,
  draft: FeedbackFields,
): string | null {
  const sourceText = joinFeedbackText(snapshot.feedback_fields);
  const draftText = joinFeedbackText(draft);
  const literals = [...sourceText.matchAll(SPOMOVE_LITERAL)].map((m) => m[0]!);
  const unique = [...new Set(literals)];
  for (const literal of unique) {
    if (!draftText.includes(literal)) {
      return `SPOMOVE 사용자 작성 문구는 교정으로 변경할 수 없습니다: ${literal}`;
    }
  }
  return null;
}

export function assertCorrectionLengthNotInflated(
  snapshot: FeedbackCorrectionInputSnapshot,
  draft: FeedbackFields,
): string | null {
  const sourceLen = joinFeedbackText(snapshot.feedback_fields).length;
  const draftLen = joinFeedbackText(draft).length;
  if (sourceLen < 40) return null;
  if (draftLen > sourceLen * 1.45 + 120) {
    return '교정 결과가 원문보다 과도하게 길어 새로운 내용이 추가된 것으로 보입니다. 사람 검수가 필요합니다.';
  }
  return null;
}

/** 필드별로 원문과 무관한 전면 교체(다른 샘플 복붙 등)를 거부한다. */
export function assertCorrectionFieldsAlignWithSource(
  snapshot: FeedbackCorrectionInputSnapshot,
  draft: FeedbackFields,
): string | null {
  for (const key of FEEDBACK_TEXT_FIELD_KEYS) {
    const src = String(snapshot.feedback_fields[key] ?? '').trim();
    const out = String(draft[key] ?? '').trim();
    if (!src || !out) continue;
    const srcTokens = significantFieldTokens(src);
    if (srcTokens.length === 0) continue;
    const shared = srcTokens.filter((t) => out.includes(t));
    if (shared.length === 0) {
      return `교정 결과가 원문(${key})과 연관성이 없습니다. 필드별로 맞춤법·문장만 교정해야 합니다.`;
    }
  }
  return null;
}

export function validateFeedbackCorrectionQuality(
  snapshot: FeedbackCorrectionInputSnapshot,
  draft: FeedbackFields,
): string | null {
  return (
    assertCorrectionPreservesSourceTokens(snapshot, draft)
    ?? assertSpomoveUserLiteralsPreserved(snapshot, draft)
    ?? assertCorrectionFieldsAlignWithSource(snapshot, draft)
    ?? assertCorrectionLengthNotInflated(snapshot, draft)
  );
}

function significantFieldTokens(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/SPOMOVE[\w-]*|\d{1,2}:\d{2}|\d+(?:\.\d+)?%|[가-힣A-Za-z]{2,}/g)) {
    const token = match[0]?.trim();
    if (token && token.length >= 2) found.add(token);
  }
  return [...found];
}

function joinFeedbackText(fields: FeedbackFields): string {
  return FEEDBACK_TEXT_FIELD_KEYS.map((key) => fields[key] ?? '').join('\n');
}
