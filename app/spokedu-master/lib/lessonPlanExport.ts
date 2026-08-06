import { isLessonPlaceholder } from './lessonDisplay';
import type { LessonDisplayModel } from './lessonDisplayModel';

/** 지도안 반출 고정 섹션 순서 (P1.5 상품 템플릿). 빈 항목·「없음」은 생략. */
export const LESSON_PLAN_SECTION_ORDER = [
  'title',
  'context',
  'equipment',
  'prep',
  'method',
  'variation',
  'coaching',
  'safety',
  'parentNote',
] as const;

export type LessonPlanSectionId = (typeof LESSON_PLAN_SECTION_ORDER)[number];

/** 화면에 보이는 섹션 제목 — 플랜 계약과 동일해야 함 */
export const LESSON_PLAN_SECTION_LABEL: Record<LessonPlanSectionId, string> = {
  title: '수업명',
  context: '대상 · 공간 · 인원',
  equipment: '준비물',
  prep: '사전 준비',
  method: '활동 방법',
  variation: '변형',
  coaching: '지도 포인트',
  safety: '안전',
  parentNote: '학부모 안내문',
};

const SECTION_LABEL = LESSON_PLAN_SECTION_LABEL;

function usableLine(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text || isLessonPlaceholder(text)) return '';
  if (/^없음$/u.test(text)) return '';
  return text;
}

function usableLines(values: string[] | null | undefined): string[] {
  return (values ?? []).map((value) => usableLine(value)).filter(Boolean);
}

function formatBulletBlock(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join('\n');
}

function formatNumberedBlock(lines: string[]): string {
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

export type LessonPlanSection = {
  id: LessonPlanSectionId;
  label: string;
  body: string;
};

/**
 * 지도안 복사용 텍스트 섹션.
 * 내용이 있는 섹션만 반환. 「없음」·placeholder 미노출.
 */
export function buildLessonPlanSections(model: LessonDisplayModel): LessonPlanSection[] {
  const sections: LessonPlanSection[] = [];
  const title = usableLine(model.title) || 'SPOKEDU 수업';

  sections.push({ id: 'title', label: SECTION_LABEL.title, body: title });

  const context = [usableLine(model.target), usableLine(model.space), usableLine(model.participantFormat)]
    .filter(Boolean)
    .join(' · ');
  if (context) {
    sections.push({ id: 'context', label: SECTION_LABEL.context, body: context });
  }

  const equipment = usableLines(model.equipment);
  if (equipment.length) {
    sections.push({ id: 'equipment', label: SECTION_LABEL.equipment, body: formatBulletBlock(equipment) });
  }

  const prep = [...usableLines(model.setupNotes), ...usableLines(model.briefingNotes)];
  if (prep.length) {
    sections.push({ id: 'prep', label: SECTION_LABEL.prep, body: formatBulletBlock(prep) });
  }

  const method = usableLines(model.activityMethod);
  if (method.length) {
    sections.push({ id: 'method', label: SECTION_LABEL.method, body: formatNumberedBlock(method) });
  }

  const variation = usableLines(model.variationMethod);
  if (variation.length) {
    sections.push({ id: 'variation', label: SECTION_LABEL.variation, body: formatBulletBlock(variation) });
  }

  const coaching = usableLines(model.fieldTips);
  if (coaching.length) {
    sections.push({ id: 'coaching', label: SECTION_LABEL.coaching, body: formatBulletBlock(coaching) });
  }

  const safety = usableLines(model.safetyNotes);
  if (safety.length) {
    sections.push({ id: 'safety', label: SECTION_LABEL.safety, body: formatBulletBlock(safety) });
  }

  const parentNote = usableLine(model.parentNote);
  if (parentNote) {
    sections.push({ id: 'parentNote', label: SECTION_LABEL.parentNote, body: parentNote });
  }

  return sections;
}

/** 클립보드용 평문 지도안 */
export function formatLessonPlanText(model: LessonDisplayModel): string {
  return buildLessonPlanSections(model)
    .map((section) => `${section.label}\n${section.body}`)
    .join('\n\n');
}
