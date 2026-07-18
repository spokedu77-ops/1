import { extractExactSectionLines, parseTextareaLines } from './lessonContentContract';

const INVALID_VIDEO = new Set(['', '-', '0', '123', 'none', 'null', 'undefined', '없음', '영상없음']);

export const CONTENT_AUDIT_SAFETY_LABELS = ['안전 포인트', '안전 유의사항', '안전'] as const;

export type ContentAuditChecks = {
  video: boolean;
  equipment: boolean;
  safety: boolean;
  steps: boolean;
  tags: boolean;
};

export type ContentAuditItemInput = {
  curriculumId: number;
  title: string;
  videoUrl?: string | null;
  equipment?: string[] | string | null;
  steps?: string[] | string | null;
  tags?: string[] | null;
  briefingNotes?: string | null;
  isHot?: boolean;
  displayOrder?: number | null;
};

export type ContentAuditItem = {
  curriculumId: number;
  title: string;
  isHot: boolean;
  displayOrder: number;
  checks: ContentAuditChecks;
  score: number;
  missing: Array<keyof ContentAuditChecks>;
  pass: boolean;
};

export function normalizeAuditVideoUrl(value: string | null | undefined): string | undefined {
  const text = (value ?? '').trim();
  if (!text || INVALID_VIDEO.has(text.toLowerCase().replace(/\s+/g, ''))) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : undefined;
  } catch {
    return undefined;
  }
}

function toLines(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return parseTextareaLines(value);
}

export function extractSafetyNotes(briefingNotes: string | null | undefined): string[] {
  return CONTENT_AUDIT_SAFETY_LABELS.flatMap((label) => extractExactSectionLines(briefingNotes, label));
}

export function buildContentAuditItem(input: ContentAuditItemInput): ContentAuditItem {
  const checks: ContentAuditChecks = {
    video: Boolean(normalizeAuditVideoUrl(input.videoUrl)),
    equipment: toLines(input.equipment).length > 0,
    safety: extractSafetyNotes(input.briefingNotes).length > 0,
    steps: toLines(input.steps).length > 0,
    tags: (input.tags ?? []).filter((tag) => typeof tag === 'string' && tag.trim()).length > 0,
  };
  const missing = (Object.keys(checks) as Array<keyof ContentAuditChecks>).filter((key) => !checks[key]);
  const score = Object.values(checks).filter(Boolean).length;
  return {
    curriculumId: input.curriculumId,
    title: input.title.trim() || `커리큘럼 #${input.curriculumId}`,
    isHot: Boolean(input.isHot),
    displayOrder: typeof input.displayOrder === 'number' ? input.displayOrder : 9999,
    checks,
    score,
    missing,
    pass: missing.length === 0,
  };
}

export function sortContentAuditItems(items: ContentAuditItem[]): ContentAuditItem[] {
  return [...items].sort((a, b) => {
    if (a.isHot !== b.isHot) return Number(b.isHot) - Number(a.isHot);
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.curriculumId - b.curriculumId;
  });
}

export function summarizeContentAudit(items: ContentAuditItem[]) {
  const failCount = items.filter((item) => !item.pass).length;
  const byMissing = {
    video: items.filter((item) => !item.checks.video).length,
    equipment: items.filter((item) => !item.checks.equipment).length,
    safety: items.filter((item) => !item.checks.safety).length,
    steps: items.filter((item) => !item.checks.steps).length,
    tags: items.filter((item) => !item.checks.tags).length,
  };
  return {
    total: items.length,
    passCount: items.length - failCount,
    failCount,
    byMissing,
  };
}
