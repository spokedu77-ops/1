import {
  FEEDBACK_TEXT_FIELD_KEYS,
  type FeedbackFields,
  type FeedbackTextFieldKey,
} from '@/app/lib/feedbackValidation';

export const FEEDBACK_CORRECTION_V2_PROMPT = [
  '너는 SPOKEDU 아동 체육 피드백의 교정 제안자다. 원문을 대신 작성하지 않는다.',
  '고칠 필요가 있는 항목만 corrections에 넣는다. 맞춤법, 띄어쓰기, 조사, 비문만 수정한다.',
  'revised는 그 항목의 전체 문장이다. 활동명, 운동기술 명칭, SPOMOVE 이름, 횟수, 시간, 거리, 기록, 실제 수행, 개선점, 다음 지도 계획, 특이사항과 안전 기록은 삭제하거나 다른 뜻으로 바꾸지 않는다.',
  '영어 번역을 하지 않는다. 스텝레더를 스텝 리더로, 스퀘어를 스쿼어로, 발목 자세를 발목 관절로 바꾸지 않는다.',
  '교육적 의견은 notes에만 쓴다. notes는 원문 문장을 바꾸지 않으며, 원문에 없는 활동, 횟수, 수행을 만들지 않는다.',
  'JSON 객체만 반환한다. 형식은 {"corrections":[{"key":"improvements","revised":"...","reason":"..."}],"notes":[{"key":"next_goals","text":"..."}]} 이다.',
  'key는 main_activity, strengths, improvements, next_goals, condition_notes만 허용한다.',
].join('\n');

export type ProposalStatus = 'unchanged' | 'suggestion' | 'blocked';

export type FieldProposal = {
  key: FeedbackTextFieldKey;
  source: string;
  status: ProposalStatus;
  revised: string | null;
  reason: string | null;
  blockReason: string | null;
};

export type EducationalNote = {
  key: FeedbackTextFieldKey | 'general';
  text: string;
  status: 'note' | 'blocked';
  blockReason: string | null;
};

export type CorrectionProposal = {
  version: 2;
  fields: FieldProposal[];
  educationalNotes: EducationalNote[];
};

const MEANING_SHIFTS: Array<[string, string]> = [
  ['스텝레더', '스텝 리더'],
  ['스텝레더', '스텝리더'],
  ['스퀘어', '스쿼어'],
  ['발목 자세', '발목 관절'],
  ['발목 자채', '발목 관절'],
  ['발목자세', '발목관절'],
];

const compact = (value: string) => value.replace(/\s+/g, '');

function hangulCount(value: string): number {
  return value.match(/[가-힣]/g)?.length ?? 0;
}

function latinWordCount(value: string): number {
  return value.match(/[A-Za-z]{3,}/g)?.length ?? 0;
}

function digitRuns(value: string): string[] {
  return [...value.matchAll(/\d+/g)].map((match) => match[0] ?? '').filter(Boolean);
}

export function assessRevision(source: string, revised: string): string | null {
  const src = source.trim();
  const dst = revised.trim();
  if (!dst) return '빈 문장으로 바꿀 수 없습니다.';
  if (compact(src) === compact(dst)) return null;

  if (hangulCount(src) >= 12 && hangulCount(dst) < hangulCount(src) * 0.45 && latinWordCount(dst) >= 4) {
    return '원문 전체를 영어로 번역했습니다.';
  }

  for (const [from, to] of MEANING_SHIFTS) {
    if (src.includes(from) && dst.includes(to) && !dst.includes(from)) {
      return `의미 왜곡: ${from} → ${to}`;
    }
  }

  const spomove = [...src.matchAll(/SPOMOVE[\w-]*/gi)].map((match) => match[0] ?? '');
  for (const literal of spomove) {
    if (!dst.includes(literal)) return `SPOMOVE 표기를 바꿨습니다: ${literal}`;
  }

  const digits = (value: string) => (value.match(/\d/g) ?? []).join('');
  if (digits(src) !== digits(dst)) {
    return '숫자·시간·기록의 의미가 달라졌습니다.';
  }

  const sentences = src
    .split(/\n+|(?<=다\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => hangulCount(part) >= 16);
  const dstCompact = compact(dst);
  for (const sentence of sentences) {
    const body = compact(sentence);
    const head = body.slice(0, 10);
    const tail = body.slice(-8);
    if ((head && !dstCompact.includes(head)) || (tail && !dstCompact.includes(tail))) {
      return '원문 문장 또는 지도 계획이 빠졌습니다.';
    }
  }

  return null;
}

function sourceOf(fields: FeedbackFields): Record<FeedbackTextFieldKey, string> {
  return Object.fromEntries(
    FEEDBACK_TEXT_FIELD_KEYS.map((key) => [key, String(fields[key] ?? '').trim()]),
  ) as Record<FeedbackTextFieldKey, string>;
}

function isFieldKey(value: string): value is FeedbackTextFieldKey {
  return (FEEDBACK_TEXT_FIELD_KEYS as readonly string[]).includes(value);
}

function fieldProposal(key: FeedbackTextFieldKey, source: string, revised: string | null, reason: string | null): FieldProposal {
  if (revised == null || compact(source) === compact(revised)) {
    return { key, source, status: 'unchanged', revised: null, reason: null, blockReason: null };
  }
  const blockReason = assessRevision(source, revised);
  if (blockReason) {
    return { key, source, status: 'blocked', revised, reason, blockReason };
  }
  return { key, source, status: 'suggestion', revised: revised.trim(), reason, blockReason: null };
}

function noteStatus(sourceText: string, text: string): Pick<EducationalNote, 'status' | 'blockReason'> {
  const extraNumber = digitRuns(text).find((token) => !digitRuns(sourceText).includes(token));
  if (extraNumber) return { status: 'blocked', blockReason: '원문에 없는 수치를 포함한 의견입니다.' };
  if (hangulCount(sourceText) >= 12 && hangulCount(text) < 4 && latinWordCount(text) >= 4) {
    return { status: 'blocked', blockReason: '교육 의견을 영어로 작성했습니다.' };
  }
  return { status: 'note', blockReason: null };
}

export function buildCorrectionProposal(sourceFields: FeedbackFields, modelRaw: unknown): CorrectionProposal {
  const source = sourceOf(sourceFields);
  const sourceText = FEEDBACK_TEXT_FIELD_KEYS.map((key) => source[key]).join('\n');
  const revisions = new Map<FeedbackTextFieldKey, { revised: string; reason: string | null }>();
  const notes: EducationalNote[] = [];

  if (modelRaw && typeof modelRaw === 'object' && !Array.isArray(modelRaw)) {
    const record = modelRaw as Record<string, unknown>;
    if (Array.isArray(record.corrections)) {
      for (const item of record.corrections) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const key = String(row.key ?? '');
        if (!isFieldKey(key) || typeof row.revised !== 'string') continue;
        revisions.set(key, { revised: row.revised, reason: typeof row.reason === 'string' ? row.reason.slice(0, 240) : null });
      }
    } else {
      for (const key of FEEDBACK_TEXT_FIELD_KEYS) {
        if (typeof record[key] === 'string') revisions.set(key, { revised: record[key] as string, reason: null });
      }
    }
    if (Array.isArray(record.notes)) {
      for (const item of record.notes) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const key = String(row.key ?? 'general');
        const text = typeof row.text === 'string' ? row.text.trim().slice(0, 500) : '';
        if (!text) continue;
        const noteKey = isFieldKey(key) ? key : 'general';
        notes.push({ key: noteKey, text, ...noteStatus(sourceText, text) });
      }
    }
  }

  return {
    version: 2,
    fields: FEEDBACK_TEXT_FIELD_KEYS.map((key) => {
      const revision = revisions.get(key);
      return fieldProposal(key, source[key], revision?.revised ?? null, revision?.reason ?? null);
    }),
    educationalNotes: notes,
  };
}

export function isCorrectionProposal(value: unknown): value is CorrectionProposal {
  return Boolean(
    value
    && typeof value === 'object'
    && (value as { version?: unknown }).version === 2
    && Array.isArray((value as { fields?: unknown }).fields),
  );
}

export function proposalFromStoredDraft(sourceFields: FeedbackFields, stored: unknown): CorrectionProposal {
  if (isCorrectionProposal(stored)) return stored;
  return buildCorrectionProposal(sourceFields, stored);
}
