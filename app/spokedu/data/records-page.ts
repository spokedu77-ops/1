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
  /** 네이버 블로그 연동 시 대표(og) 이미지 제외 후 본문 사진 순서 — 0이 첫 현장 사진 */
  blogImageIndex?: number;
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
    kicker: '수업 사례',
    lines: ['현장에서 운영한 수업 사례'] as const,
    subtitle:
      '실제 운영 현장의 활동 사진과 운영 설명을 블로그 후기로 모았습니다. 아래에서 기관·수업 유형별로 골라 볼 수 있습니다.',
    venueTypes: ['키움센터', '학교', '아동시설', '문화공간'] as const,
    /** LCP preload — 카드 fallback·첫 화면용 (헤더 비주얼 없음) */
    preloadMediaKey: 'proofDasarang' as HomeMediaKey,
  },
  fieldRecords: [
    {
      slug: 'dongjak-spomove',
      venue: '동작거점형 우리동네키움센터',
      meta: '초등학생 · SPOMOVE 에듀테크',
      operationType: '정규수업',
      description:
        '스크린 신호를 보고 판단·반응하며 움직이는 SPOMOVE 놀이체육 — 거점형 키움센터 집단 수업입니다.',
      mediaKey: 'proofDongjak',
      href: 'https://blog.naver.com/spokedutogether/224288724087',
      ctaLabel: '블로그 후기 보기',
      trackLabel: 'records-dongjak-spomove-blog',
      filters: ['regular', 'edtech'],
    },
    {
      slug: 'yangcheon-paps',
      venue: '양천거점형키움센터',
      meta: '초등 1~2학년 · PAPS 놀이체육',
      operationType: '정규수업',
      description:
        '3개월간 교구·놀이체육으로 제자리멀리뛰기, 왕복오래달리기, 유연성·근지구력 요소를 경험하는 PAPS 연계 정규수업입니다.',
      mediaKey: 'proofYangcheon',
      href: 'https://blog.naver.com/spokedutogether/224286265879',
      ctaLabel: '블로그 후기 보기',
      trackLabel: 'records-yangcheon-paps-blog',
      filters: ['regular'],
    },
    {
      slug: 'maedong-sports-stepup',
      venue: '매동초등학교',
      meta: '종로거점형키움센터 연계 · 6개월 늘봄 스포츠',
      operationType: '정규수업',
      description:
        '클라이밍, 피클볼, 플로어볼, 플로어컬링, 플래그풋볼, 야구, 권투를 차례로 경험하는 스포츠 스텝업 늘봄 연계 수업입니다.',
      mediaKey: 'proofCenter',
      href: 'https://blog.naver.com/spokedutogether/224288711414',
      ctaLabel: '블로그 후기 보기',
      trackLabel: 'records-maedong-sports-blog',
      filters: ['regular'],
    },
    {
      slug: 'dasarang-oneday',
      venue: '다사랑영등포지역아동센터',
      meta: '초등 2~6학년 · 90분 펑셔널 놀이체육',
      operationType: '원데이·행사',
      description:
        '펀스틱 펜싱, 플로어 컬링, 신체기능 놀이체육, SPOMOVE 리듬챌린지로 90분 원데이 체육 프로그램을 운영했습니다.',
      mediaKey: 'proofCommunity',
      href: 'https://blog.naver.com/spokedutogether/224286297222',
      ctaLabel: '블로그 후기 보기',
      trackLabel: 'records-dasarang-blog',
      filters: ['oneday', 'edtech'],
    },
    {
      slug: 'seodaemun-event-booth',
      venue: '서대문구 독립문공원 어린이날 축제',
      meta: 'SPOMOVE 체험부스 · 어린이날 행사',
      operationType: '원데이·행사',
      description:
        '골프퍼팅, 에어타겟, SPOMOVE 반응인지, 모션탭 등 시간대별 체육 체험부스를 운영했습니다.',
      mediaKey: 'proofEvent',
      href: 'https://blog.naver.com/spokedu77/224282789801',
      ctaLabel: '블로그 후기 보기',
      trackLabel: 'records-seodaemun-blog',
      filters: ['oneday', 'edtech'],
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
