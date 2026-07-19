import type { HomeMediaKey } from './home-media';
import {
  buildRecordsHeroSummary,
  buildRecordsPageFieldRecords,
  type RecordFilterId,
} from './field-records-catalog';
import { SPOKEDU_BASE_PATH } from './site';

export type { FieldRecordItem, RecordFilterId } from './field-records-catalog';

export const recordFilters: { id: RecordFilterId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'regular', label: '정규수업' },
  { id: 'oneday', label: '원데이·행사' },
  { id: 'camp', label: '캠프' },
  { id: 'edtech', label: '에듀테크' },
];

const heroSummary = buildRecordsHeroSummary();

export const recordsPage = {
  hero: {
    kicker: '수업 사례',
    lines: ['현장에서 운영한 수업 사례'] as const,
    subtitle:
      '실제 운영 현장의 활동 사진과 운영 설명을 블로그 후기로 모았습니다. 아래에서 기관·수업 유형별로 골라 볼 수 있습니다.',
    venueTypes: heroSummary.venueTypes,
    stats: [
      { value: String(heroSummary.caseCount), label: '공개 운영 사례' },
      { value: String(heroSummary.venueTypeCount), label: '기관 유형' },
      { value: String(heroSummary.operationTypeCount), label: '운영 방식' },
    ] as const,
    /** LCP preload — 카드 fallback·첫 화면용 (헤더 비주얼 없음) */
    preloadMediaKey: 'proofDongjak' as HomeMediaKey,
  },
  fieldRecords: buildRecordsPageFieldRecords(),
  cta: {
    title: '우리 기관에서도 이런 수업을 운영하고 싶다면',
    description:
      '대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.',
    label: '기관 프로그램 제안받기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'records-dispatch-cta',
  },
} as const;
