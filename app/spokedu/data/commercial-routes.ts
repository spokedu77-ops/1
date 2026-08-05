import {
  FIELD_RECORD_CATALOG,
  hasFieldRecordOnsiteSummary,
  type FieldRecordSlug,
} from './field-records-catalog';
import { SPOKEDU_BASE_PATH } from './site';

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
  if (isDispatchProgramQueryId(trimmed)) return DISPATCH_PROGRAM_QUERY_MAP[trimmed];
  if ((DISPATCH_PROGRAM_OPTIONS as readonly string[]).includes(trimmed)) return trimmed;
  return null;
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
  return `${SPOKEDU_BASE_PATH}/dispatch${qs ? `?${qs}` : ''}#contact`;
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

export function curriculumInquiryHref(args: {
  mode: 'package' | 'training' | 'master' | 'license';
  conversionEvidence?: FieldRecordSlug;
}): string {
  const params = new URLSearchParams();
  params.set('mode', args.mode);
  if (args.conversionEvidence) params.set('conversionEvidence', args.conversionEvidence);
  return `${SPOKEDU_BASE_PATH}/curriculum?${params.toString()}#inquiry`;
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
