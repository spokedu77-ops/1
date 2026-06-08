import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type HomeVisitorGateCard = {
  audience: string;
  title: string;
  description: string;
  tags: readonly string[];
  linkLabel: string;
  href: string;
  trackLabel: string;
};

export type HomeFieldRecordCard = {
  proofId: 'proof-spomove' | 'proof-rhythm' | 'proof-oneday' | 'proof-booth';
  tagline: string;
  venue: string;
  sessionLine: string;
  href: string;
  trackLabel: string;
  /** 네이버 블로그 본문 사진 순서 — records 페이지와 동일 인덱스 */
  blogImageIndex?: number;
};

export type HomeProgramSystemItem = {
  id: string;
  name: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  trackLabel: string;
  featured?: boolean;
};

export const homePage = {
  hero: {
    kicker: '체육교육 운영 브랜드',
    lines: ['전문성과 현장 경험으로', '아동·청소년의 움직임을 설계합니다'] as const,
    subtitleParagraphs: [
      '스포키듀는 연세대학교 체육교육학과 출신 운영진이 만든 아동·청소년 체육교육 전문 브랜드입니다.',
      '현장에서 아이들을 직접 지도하며 축적한 경험을 바탕으로 개인 수업, 기관 프로그램, 커리큘럼 콘텐츠까지 아이들의 성장 단계에 맞는 움직임 경험을 설계합니다.',
    ] as const,
    supportChips: ['1:1 개인과외', '기관 단체 수업', '커리큘럼 콘텐츠 제작'] as const,
  },
  heroCtas: {
    primary: {
      label: '어떤 수업이 필요한지 보기',
      href: '#visitor-gate',
      trackLabel: 'cta-home-direction-hero',
    },
    secondary: [] as const,
  },
  visitorGate: {
    id: 'visitor-gate',
    eyebrow: '맞춤 선택',
    title: '어떤 수업이 필요하신가요?',
    lead: '목적에 맞는 수업을 선택하세요.',
    cards: [
      {
        audience: '기관',
        title: '기관 및 단체 수업',
        description:
          '공간, 인원, 일정, 맞춤 프로그램 등 기관에서 원하는 방향성으로 설계하여 운영합니다.',
        tags: ['정규수업', '늘봄·돌봄수업', '방학캠프', '원데이특강'],
        linkLabel: '기관 및 단체 수업 보기',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-gate-dispatch',
      },
      {
        audience: '강사·파트너',
        title: '교육 콘텐츠',
        description:
          '연세대 체육교육과 출신 연구진이 현장 경험을 바탕으로 얻은 노하우를 알려드립니다.',
        tags: ['강사교육', '운영 메뉴얼', '콘텐츠 커리큘럼'],
        linkLabel: '교육 콘텐츠 보기',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-home-gate-curriculum',
      },
      {
        audience: '학부모',
        title: '개인 수업',
        description:
          '운동을 어려워하는 아이, 수행평가를 준비하는 아이, 보다 체계적으로 운동을 배우고 싶은 아이를 위한 체육과외 수업입니다.',
        tags: ['1:1과외', '소그룹과외', '단기과외'],
        linkLabel: '개인수업 보기',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-home-gate-private',
      },
    ] satisfies HomeVisitorGateCard[],
  },
  fieldRecords: {
    eyebrow: '수업 사례',
    title: '현장에서 운영한 수업',
    lead: '어디서, 누구에게, 어떤 프로그램을 진행했는지 블로그 후기로 확인할 수 있습니다.',
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    recordsTrackLabel: 'cta-home-field-records',
    recordsCtaLabel: '수업 사례 더 보기',
    cards: [
      {
        proofId: 'proof-rhythm',
        tagline: 'SPOMOVE',
        venue: '동작거점형 우리동네키움센터',
        sessionLine: '초등학생 · SPOMOVE 에듀테크',
        href: 'https://blog.naver.com/spokedutogether/224288724087',
        trackLabel: 'cta-home-proof-dongjak-blog',
      },
      {
        proofId: 'proof-spomove',
        tagline: 'PAPS',
        venue: '양천거점형키움센터',
        sessionLine: '초등 1~2학년 · PAPS 놀이체육',
        href: 'https://blog.naver.com/spokedutogether/224286265879',
        trackLabel: 'cta-home-proof-yangcheon-paps-blog',
      },
      {
        proofId: 'proof-oneday',
        tagline: '원데이',
        venue: '다사랑영등포지역아동센터',
        sessionLine: '초등 2~6학년 · 펑셔널 놀이체육',
        href: 'https://blog.naver.com/spokedutogether/224286297222',
        trackLabel: 'cta-home-proof-dasarang-blog',
      },
      {
        proofId: 'proof-booth',
        tagline: '원데이·행사',
        venue: '서대문구 독립문공원',
        sessionLine: '어린이날 SPOMOVE 체험부스',
        href: 'https://blog.naver.com/spokedu77/224282789801',
        trackLabel: 'cta-home-proof-seodaemun-blog',
      },
    ] satisfies HomeFieldRecordCard[],
  },
  programSystem: {
    eyebrow: '수업 콘텐츠',
    title: '수업은 프로그램이 되고,\n프로그램은 커리큘럼이 됩니다',
    lead: '현장에서 검증한 프로그램을, 기관·강사가 바로 운영할 수 있는 형태로 정리합니다.',
    items: [
      {
        id: 'spomove',
        featured: true,
        name: 'SPOMOVE',
        description:
          '시각 자극을 보고 몸으로 반응하는 스크린 기반 에듀테크 놀이체육입니다.',
        mediaKey: 'programSpomove',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'cta-home-system-spomove',
      },
      {
        id: 'paps',
        name: 'PAPS 놀이체육',
        description:
          '학교 체력평가 요소를 놀이형 수업으로 경험하며 참여와 움직임을 돕는 프로그램입니다.',
        mediaKey: 'programPaps',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'cta-home-system-paps',
      },
      {
        id: 'monthly-newsports',
        name: '월간 뉴스포츠',
        description:
          '매월 뉴스포츠 테마를 중심으로 교구·협동 활동을 이어가는 월간형 체육 프로그램입니다.',
        mediaKey: 'programMonthlyNewsports',
        href: `${SPOKEDU_BASE_PATH}/programs/monthly-newsports`,
        trackLabel: 'cta-home-system-monthly',
      },
      {
        id: 'camp',
        name: '방학캠프',
        description:
          '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 프로그램으로 운영합니다.',
        mediaKey: 'programCamp',
        href: `${SPOKEDU_BASE_PATH}/programs/camp`,
        trackLabel: 'cta-home-system-camp',
      },
      {
        id: 'oneday',
        name: '원데이 스페셜 이벤트',
        description:
          '기관 행사나 특별활동 일정에 맞춰 짧고 몰입감 있는 체육 경험을 제공합니다.',
        mediaKey: 'programOneday',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'cta-home-system-oneday',
      },
      {
        id: 'custom-sports',
        name: '맞춤 스포츠 특강',
        description:
          '기관 목적과 대상에 맞춰 종목·난이도·운영 형태를 조정하는 맞춤형 스포츠 특강입니다.',
        mediaKey: 'programPlay',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-home-system-custom',
      },
    ] satisfies HomeProgramSystemItem[],
  },
  finalCta: {
    title: '목적에 맞는 상담을 선택하세요',
    description:
      '과외수업, 기관 수업, 기타 문의 — 아래에서 유형을 선택하면 상담 폼으로 바로 연결됩니다.',
    links: [
      {
        label: '과외수업 상담',
        href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
        trackLabel: 'cta-home-private-final',
      },
      {
        label: '기관 수업 요청',
        href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
        trackLabel: 'cta-home-dispatch-final',
      },
      {
        label: '기타 문의',
        href: `${SPOKEDU_BASE_PATH}/contact`,
        trackLabel: 'cta-home-other-final',
      },
    ],
  },
} as const;
