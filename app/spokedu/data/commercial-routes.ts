import {
  FIELD_RECORD_CATALOG,
  hasFieldRecordOnsiteSummary,
  type FieldRecordSlug,
} from './field-records-catalog';
import { SPOKEDU_BASE_PATH, SPOKEDU_PATHS } from './site';

/** URL 안정 ID → Dispatch 폼 칩 라벨 */
export const DISPATCH_PROGRAM_QUERY_MAP = {
  spomove: 'SPOMOVE',
  paps: 'PAPS 놀이체육',
  'monthly-newsports': '월간 뉴스포츠',
  'oneday-event': '스포츠 부스·원데이',
  camp: '방학캠프',
  'special-pe': '특수체육',
  'mini-olympics': '미니 올림픽',
} as const;

export type DispatchProgramQueryId = keyof typeof DISPATCH_PROGRAM_QUERY_MAP;

export const DISPATCH_PROGRAM_OPTIONS = [
  'SPOMOVE',
  'PAPS 놀이체육',
  '월간 뉴스포츠',
  '특수체육',
  '미니 올림픽',
  '스포츠 부스·원데이',
  '방학캠프',
  '맞춤 스포츠 특강',
  '기타',
] as const;

export function isDispatchProgramQueryId(value: string): value is DispatchProgramQueryId {
  return Object.prototype.hasOwnProperty.call(DISPATCH_PROGRAM_QUERY_MAP, value);
}

export function parseDispatchProgramLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const queryKey = trimmed.toLowerCase();
  if (isDispatchProgramQueryId(queryKey)) return DISPATCH_PROGRAM_QUERY_MAP[queryKey];
  if ((DISPATCH_PROGRAM_OPTIONS as readonly string[]).includes(trimmed)) return trimmed;
  const byValue = (Object.values(DISPATCH_PROGRAM_QUERY_MAP) as readonly string[]).find(
    (label) => label.toLowerCase() === trimmed.toLowerCase(),
  );
  return byValue ?? null;
}

export function isFieldRecordSlug(value: string): value is FieldRecordSlug {
  return FIELD_RECORD_CATALOG.some((item) => item.slug === value);
}

export function parseConversionEvidenceSlug(raw: string | null | undefined): FieldRecordSlug | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return isFieldRecordSlug(trimmed) ? trimmed : null;
}

export function dispatchInquiryHref(args: {
  program?: DispatchProgramQueryId;
  conversionEvidence?: FieldRecordSlug;
}): string {
  const params = new URLSearchParams();
  if (args.program) params.set('program', args.program);
  if (args.conversionEvidence) params.set('conversionEvidence', args.conversionEvidence);
  const qs = params.toString();
  // path → query → hash. `#contact`는 EducationHubLanding 안의 DispatchProposalForm이 소유한다.
  return `${SPOKEDU_PATHS.education}${qs ? `?${qs}` : ''}#contact`;
}

export function privateInquiryHref(args: {
  startDirection?: 'confidence' | 'fundamental' | 'sport-prep' | 'peer-group';
  conversionEvidence?: FieldRecordSlug;
}): string {
  const params = new URLSearchParams();
  if (args.startDirection) params.set('startDirection', args.startDirection);
  if (args.conversionEvidence) params.set('conversionEvidence', args.conversionEvidence);
  const qs = params.toString();
  return `${SPOKEDU_BASE_PATH}/private${qs ? `?${qs}` : ''}#apply`;
}

/** SPOMOVE·교구 문의 — `/contact?type=spomove` + 희망 운영 형태 */
export const SPOMOVE_OPERATION_QUERY_MAP = {
  adoption: 'SPOMOVE 도입',
  equipment: 'SPOMOVE/교구 도입',
} as const;

export type SpomoveOperationQueryId = keyof typeof SPOMOVE_OPERATION_QUERY_MAP;

export function parseSpomoveOperationLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (Object.prototype.hasOwnProperty.call(SPOMOVE_OPERATION_QUERY_MAP, trimmed)) {
    return SPOMOVE_OPERATION_QUERY_MAP[trimmed as SpomoveOperationQueryId];
  }
  if ((Object.values(SPOMOVE_OPERATION_QUERY_MAP) as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return null;
}

export function spomoveInquiryHref(args?: { operation?: SpomoveOperationQueryId }): string {
  const params = new URLSearchParams();
  params.set('type', 'spomove');
  if (args?.operation) params.set('operation', args.operation);
  const qs = params.toString();
  return `${SPOKEDU_PATHS.contact}?${qs}#contact-type-select`;
}

export function curriculumInquiryHref(args: {
  mode: 'package' | 'training' | 'master' | 'license';
  conversionEvidence?: FieldRecordSlug;
}): string {
  const params = new URLSearchParams();
  params.set('mode', args.mode);
  if (args.conversionEvidence) params.set('conversionEvidence', args.conversionEvidence);
  return `${SPOKEDU_PATHS.subscription}?${params.toString()}#inquiry`;
}

/** 사례 → 관련 상업 경로 (온사이트 상세만) */
export function getRecordConversionHref(slug: FieldRecordSlug): string | null {
  const item = FIELD_RECORD_CATALOG.find((r) => r.slug === slug);
  if (!item || !hasFieldRecordOnsiteSummary(item)) return null;

  switch (slug) {
    case 'dongjak-spomove':
      return dispatchInquiryHref({ program: 'spomove', conversionEvidence: slug });
    case 'yangcheon-paps':
      return dispatchInquiryHref({ program: 'paps', conversionEvidence: slug });
    case 'dasarang-oneday':
    case 'seodaemun-event-booth':
      return dispatchInquiryHref({ program: 'oneday-event', conversionEvidence: slug });
    default:
      return dispatchInquiryHref({ conversionEvidence: slug });
  }
}
