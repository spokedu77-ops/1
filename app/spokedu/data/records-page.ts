import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type RecordFilterId = 'all' | 'regular' | 'oneday' | 'camp' | 'edtech';

export type FieldRecordItem = {
  slug: string;
  venue: string;
  meta: string;
  operationType: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  filters: readonly RecordFilterId[];
};

export const recordFilters: { id: RecordFilterId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'regular', label: '정규수업' },
  { id: 'oneday', label: '원데이·행사' },
  { id: 'camp', label: '캠프' },
  { id: 'edtech', label: '에듀테크' },
];

export const recordsPage = {
  hero: {
    kicker: '현장 운영 증거',
    lines: ['현장에서 쌓은 수업 경험을', '기록합니다'] as const,
    subtitle:
      '키움센터, 학교, 아동시설, 문화공간 등 실제 운영 현장에서 진행한 수업과 프로그램 기록을 모았습니다.',
    mediaKey: 'proofLab' as HomeMediaKey,
  },
  roleCompare: {
    title: '현장 기록과 수업 사례의 차이',
    recordsLead:
      '실제 수업 현장의 활동 사진과 짧은 운영 설명 — 어디서, 누구에게, 어떤 프로그램을 진행했는지 확인합니다.',
    casesLead:
      '기관 협업 배경, 운영 과정, 문제 해결과 결과를 깊게 정리한 사례 — 배경 분석이 필요할 때 참고하세요.',
    casesHref: `${SPOKEDU_BASE_PATH}/cases`,
    casesLinkLabel: '수업 사례 보기',
  },
  recordsSectionTitle: '현장 기록',
  fieldRecords: [
    {
      slug: 'yangcheon-spomove',
      venue: '양천거점형키움센터',
      meta: '초등 저학년 · SPOMOVE 정규수업',
      operationType: '정규수업',
      description:
        '빔 화면의 색과 방향 신호를 보고 아이들이 직접 움직이며 반응한 에듀테크 놀이체육 수업입니다.',
      mediaKey: 'proofClass',
      href: `${SPOKEDU_BASE_PATH}/cases/yangcheon-spomove`,
      ctaLabel: '수업 기록 보기',
      trackLabel: 'records-yangcheon',
      filters: ['regular', 'edtech'],
    },
    {
      slug: 'dongjak-rhythm',
      venue: '동작거점형키움센터',
      meta: '초등학생 · SPOMOVE 연계 수업',
      operationType: '정규수업',
      description:
        '거점센터에 모인 아이들이 화면 신호에 맞춰 움직이고 반응하는 수업을 진행했습니다.',
      mediaKey: 'proofCenter',
      href: `${SPOKEDU_BASE_PATH}/cases/dongjak-rhythm`,
      ctaLabel: '현장 기록 보기',
      trackLabel: 'records-dongjak',
      filters: ['regular', 'edtech'],
    },
    {
      slug: 'dasarang-oneday',
      venue: '다사랑영등포지역아동센터',
      meta: '초등 전학년 · 원데이 체육행사',
      operationType: '원데이·행사',
      description:
        '지역아동센터 행사 일정에 맞춰 협동 미션과 체육 활동을 짧고 몰입감 있게 운영했습니다.',
      mediaKey: 'proofCommunity',
      href: `${SPOKEDU_BASE_PATH}/cases/dasarang-oneday`,
      ctaLabel: '현장 기록 보기',
      trackLabel: 'records-dasarang',
      filters: ['oneday'],
    },
    {
      slug: 'playz-camp',
      venue: '서울숲 PLAYZ Lounge',
      meta: '방학 · 방학캠프',
      operationType: '캠프',
      description:
        '체육과 예체능 활동을 결합해 하루 단위 몰입 프로그램을 운영했습니다.',
      mediaKey: 'proofLounge',
      href: `${SPOKEDU_BASE_PATH}/cases/playz-camp`,
      ctaLabel: '수업 기록 보기',
      trackLabel: 'records-playz',
      filters: ['camp'],
    },
    {
      slug: 'seodaemun-event-booth',
      venue: '서대문형무소 어린이날 행사',
      meta: '가족 참여 · 체험형 부스',
      operationType: '원데이·행사',
      description:
        '공공 행사 현장에서 회전형 체육 체험을 운영해 처음 참여하는 아이도 바로 움직일 수 있게 구성했습니다.',
      mediaKey: 'proofEvent',
      href: `${SPOKEDU_BASE_PATH}/cases/seodaemun-event-booth`,
      ctaLabel: '현장 기록 보기',
      trackLabel: 'records-seodaemun',
      filters: ['oneday'],
    },
  ] satisfies FieldRecordItem[],
  cta: {
    title: '우리 기관에서도 이런 수업을 운영하고 싶다면',
    description:
      '대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.',
    label: '기관 프로그램 제안받기',
    href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
    trackLabel: 'records-dispatch-cta',
  },
} as const;
