import type { HomeMediaKey } from './home-media';
import { dispatchInquiryHref } from './commercial-routes';
import {
  buildRecordsHeroSummary,
  buildRecordsPageFieldRecords,
  type RecordFilterId,
} from './field-records-catalog';

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
      '초등학교, 거점형 키움센터, 복지관, 특수학교부터 대규모 지자체 축제 부스까지. 현장의 조건에 맞춰 실제로 설계하고 운영한 스포키듀의 수업 기록입니다.',
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
    href: dispatchInquiryHref({}),
    trackLabel: 'records-dispatch-cta',
  },
} as const;
