import type { HomeMediaKey } from './home-media';
import type { SpokeduImageKind, SpokeduImageProgram } from './images';
import type { ConversionPageIntent } from './conversion-page-intent';
import { dispatchInquiryHref } from './commercial-routes';
import {
  getFieldRecordCatalogItem,
  getFieldRecordOnsitePath,
  type FieldRecordSlug,
} from './field-records-catalog';
import { SPOKEDU_BASE_PATH } from './site';

type DispatchMediaRequirement = {
  page: 'dispatch';
  program: SpokeduImageProgram;
  kind: SpokeduImageKind;
  /** 정확한 실물 이미지가 없어서 의도적으로 다이어그램/구조 카드로 대체하는 슬롯 */
  allowVisualFallback?: boolean;
};

export type DispatchExampleItem = {
  venue: string;
  audience: string;
  operation: string;
  activity: string;
  fitReason: string;
  review: string;
  mediaKey: HomeMediaKey;
  href: string;
  /** 이 카드가 증명하는 기관 운영 주장 */
  proves: string;
  /** 온사이트 상세가 있으면 slug, 없으면 목록(/records)만 */
  recordSlug?: FieldRecordSlug;
};

function dispatchExampleHref(recordSlug?: FieldRecordSlug): string {
  if (!recordSlug) return `${SPOKEDU_BASE_PATH}/records`;
  return getFieldRecordCatalogItem(recordSlug).href || getFieldRecordOnsitePath(recordSlug);
}

export type DispatchReview = {
  quote: string;
  body: string;
  name: string;
  org: string;
  accent: 'violet' | 'sky' | 'lime';
};

export type DispatchCompareRow = {
  label: string;
  check: string;
  spokedu: string;
};

export type DispatchOperationSolution = {
  title: string;
  description: string;
  itemIds: readonly string[];
};

export type DispatchLineupItem = {
  id: string;
  audience: string;
  name: string;
  subtitle: string;
  paragraphs: readonly string[];
  tags: readonly string[];
  example: string;
  mediaKey: HomeMediaKey;
  mediaRequirement: DispatchMediaRequirement;
  href?: string;
  trackLabel?: string;
};

export const dispatchPage = {
  intent: {
    decisionQuestion: '우리 기관 조건에서 안정적으로 운영 가능한가?',
    primaryAudience: '기관 담당자',
    mustProve: ['공간 대응', '인원 대응', '연령 대응', '운영 방식', '실제 사례'],
    primaryCtaIntent: '기관 조건 기반 운영안 요청',
    pageFlow: ['hero', 'trust', 'fit', 'programs', 'standards', 'evidence', 'process', 'contact'],
  } satisfies ConversionPageIntent,
  decisionFit: {
    eyebrow: '운영 가능성 판단',
    title: '먼저 기관 조건을 확인하고, 그 조건에 맞는 운영안을 만듭니다',
    lead: '프로그램을 먼저 고르는 방식이 아니라 공간·인원·연령·일정의 제약을 확인한 뒤 수업 구성과 운영 방식을 맞춥니다.',
    items: [
      {
        label: '공간',
        condition: '교실 · 활동실 · 강당 · 체육관',
        response: '이동 범위, 대기 동선, 소음, 안전 범위를 먼저 조정합니다.',
      },
      {
        label: '인원',
        condition: '소규모 · 반 단위 · 다인원 행사',
        response: '팀 구성, 순환형 스테이션, 강사 배치 기준을 정합니다.',
      },
      {
        label: '연령',
        condition: '유아 · 초등 · 청소년 · 특수·통합',
        response: '규칙 이해도와 수행 속도에 맞춰 과제 난이도를 나눕니다.',
      },
      {
        label: '운영',
        condition: '정규수업 · 단기 특강 · 행사 · 방학 프로그램',
        response: '회차, 준비물, 기록 공유, 현장 피드백 범위를 정합니다.',
      },
    ] as const,
  },
  hero: {
    kicker: '기관·단체 프로그램',
    lines: ['기관 조건에 맞게', '체육수업 운영안을 설계합니다'] as const,
    subtitle:
      '키움센터·아동시설·학교·복지관에 맞춘 맞춤 프로그램. 공간·인원·목표에 따라 정규·원데이·방학 운영과 SPOMOVE를 제안합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '기관 조건으로 운영안 요청하기',
      href: '#contact',
      trackLabel: 'dispatch-cta-program',
    },
    secondary: {
      label: '실제 운영 사례 보기',
      href: '#evidence',
      trackLabel: 'dispatch-cta-evidence',
    },
  },
  trustMetrics: {
    eyebrow: '운영 방식',
    items: [
      { value: '맞춤 설계', label: '공간·인원·목표에 맞춘 수업 구성' },
      { value: '정규·원데이', label: '학기 운영부터 행사형까지' },
      { value: '서울·수도권', label: '상담 후 운영 가능 지역 안내' },
    ] as const,
  },
  partnerReviews: {
    eyebrow: '기관 후기',
    title: '기관 담당자가 직접 말하는 도입 효과',
    items: [
      {
        quote: '느린 학습자도 소외되지 않는 진짜 교육',
        body: '수준별 난이도·참여 설계로 통합반에서도 모두가 성취감을 느낍니다.',
        name: '센터 담당자',
        org: '찾아가는 동행 체육교실',
        accent: 'violet',
      },
      {
        quote: '재미에만 머무르지 않고, 성장의 흐름이 보이는 수업입니다.',
        body: '연간 커리큘럼 안에서 신체 기능 목표가 분명해 교육적으로 신뢰가 갑니다.',
        name: '센터 담당자',
        org: '양천거점형키움센터',
        accent: 'sky',
      },
      {
        quote: '공간과 인원에 꼭 맞게 수업을 정말 잘 맞춰주셨습니다.',
        body: '좁은 공간·변동 인원에도 수업 흐름이 무너지지 않도록 맞춰 주십니다.',
        name: '담당자',
        org: '강동구 보건소 연계 수업',
        accent: 'lime',
      },
    ] satisfies DispatchReview[],
  },
  comparison: {
    id: 'comparison',
    eyebrow: '운영 기준',
    title: '기관이 확인해야 할 운영 기준',
    lead: '가격이나 종목 수보다 먼저 봐야 하는 것은 설계, 강사, 현장 조정, 운영 후 공유 범위입니다.',
    rows: [
      {
        label: '설계',
        check: '대상·공간·운영 목적이 실제 수업안에 반영되는가',
        spokedu: '기관 조건을 확인한 뒤 프로그램, 동선, 회차를 맞춘 운영안을 제안합니다.',
      },
      {
        label: '강사',
        check: '사전 기준과 결강·대체 대응 방식이 있는가',
        spokedu: '스포키듀 수업 기준을 공유한 강사를 배정하고 대체 운영 상황을 함께 봅니다.',
      },
      {
        label: '현장',
        check: '공간, 인원, 연령 차이에 맞게 난이도와 동선을 조정하는가',
        spokedu: '인원 규모, 대기 동선, 수행 속도에 맞춰 수업 구조를 현장에서 조정합니다.',
      },
      {
        label: '공유',
        check: '운영 후 기관에 무엇이 전달되는가',
        spokedu: '필요 시 관찰 내용, 운영 피드백, 다음 회차 조정점을 정리해 공유합니다.',
      },
    ] satisfies DispatchCompareRow[],
  },  whoFits: {
    eyebrow: '대상 기관',
    title: '이런 기관에 적합합니다',
    items: [
      {
        title: '키움센터·지역아동센터',
        description: '정기 돌봄 흐름 안에서 아이들이 꾸준히 움직일 수 있는 체육수업을 운영합니다.',
      },
      {
        title: '학교·방과후',
        description: '학년과 인원에 맞춰 기초체력, 협동활동, 뉴스포츠 수업을 구성합니다.',
      },
      {
        title: '복지관·공공기관',
        description: '대상 특성과 공간 조건을 고려해 안전한 신체활동 프로그램을 제안합니다.',
      },
      {
        title: '유치원·어린이집',
        description: '연령에 맞는 기초 움직임과 놀이형 체육으로 짧은 시간 안에 참여 경험을 만듭니다.',
      },
      {
        title: '아동 대상 문화공간',
        description: '행사·체험 일정에 맞춰 원데이 프로그램과 집중형 체육 활동을 구성합니다.',
      },
    ],
  },
  smallSpace: {
    eyebrow: '공간',
    title: '공간이 작아도 가능한가요?',
    lead: '강당이 아니어도 가능합니다.',
    description:
      '교실, 다목적실, 센터 활동실처럼 제한된 공간에서도 인원, 동선, 소음, 안전 범위를 확인해 수업을 구성합니다.',
    criteria: [
      '인원 규모에 맞는 활동 면적과 대기 동선',
      '소음·이웃 이용을 고려한 활동 선택',
      '바닥·기구·이동 경로의 안전 범위 점검',
    ] as const,
  },
  coreCurriculum: {
    eyebrow: '베이스 프로그램',
    title: '펑셔널 무브 · 팀빌딩',
    paragraphs: [
      '펑셔널 무브로 기초 신체 기능을 체계적으로 올리고, 팀빌딩으로 협동과 건강한 경쟁 경험을 함께 설계합니다.',
      '기관 조건에 맞춰 이 베이스 위에 SPOMOVE·월간 스포츠·특수체육 등을 조합해 제안합니다.',
    ] as const,
  },
  programLineup: {
    eyebrow: '파견 라인업',
    title: '기관 목적에 맞춘 타겟 최적화 파견',
    lead: '대상 연령과 기관 특성에 맞춰 다양한 교구와 커리큘럼이 현장으로 직접 투입됩니다.',
    items: [
      {
        id: 'spomove',
        audience: '초중고 방과후 · 지역아동센터 · 기관 클래스',
        name: '스포무브',
        subtitle: '시지각 브레인 놀이체육',
        paragraphs: [
          '화면의 시각 정보를 보고 판단한 뒤 몸으로 반응하는 에듀테크형 놀이체육입니다. 시지각·주의집중·판단력·협응을 함께 자극합니다.',
        ],
        tags: ['몰입형 웜업', '연령별 커리큘럼', '교구 직접 지참'],
        example: '예시: 반응 인지, 이중 과제 등',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'dispatch-lineup-spomove',
        mediaKey: 'dispatchSpomove' as HomeMediaKey,
        mediaRequirement: {
          page: 'dispatch',
          program: 'spomove',
          kind: 'field-photo',
        } satisfies DispatchMediaRequirement,
      },
      {
        id: 'monthly-sports',
        audience: '초중고 방과후 · 지역아동센터 · 기관 클래스',
        name: '월간 스포츠',
        subtitle: '매달 바뀌는 종목·뉴스포츠 체험',
        paragraphs: [
          '매달 새로운 스포츠·뉴스포츠를 경험하며 흥미와 참여를 유지하는 월간 클래스입니다. 협동·판단·규칙 이해를 균형 있게 반영합니다.',
        ],
        tags: ['월별 순환 구성', '뉴스포츠 체험', '협동·판단 강화'],
        example: '예시: 플로어볼, 플래그풋볼 등',
        href: `${SPOKEDU_BASE_PATH}/monthly`,
        trackLabel: 'dispatch-lineup-monthly',
        mediaKey: 'dispatchMonthlySports' as HomeMediaKey,
        mediaRequirement: {
          page: 'dispatch',
          program: 'monthly-newsports',
          kind: 'diagram',
          allowVisualFallback: true,
        } satisfies DispatchMediaRequirement,
      },
      {
        id: 'slow-sports',
        audience: '복지관 · 발달센터 · 통합반 · 기관 클래스',
        name: '특수체육',
        subtitle: '슬로우 스포츠 · 속도·수준에 맞춘 기관 수업',
        paragraphs: [
          '참여자 속도와 운동 수준에 맞춰 과제·규칙을 조절하는 기관 체육입니다. 정규·특강·행사형으로 운영하며 반복 성공 경험을 만듭니다.',
        ],
        tags: ['수준별 과제 조절', '단계형 커리큘럼', '정규·특강 운영'],
        example: '예시: 단계별 이동운동, 규칙 단순화 게임 등',
        href: dispatchInquiryHref({ program: 'special-pe' }),
        trackLabel: 'dispatch-lineup-special',
        mediaKey: 'dispatchSpecialPe' as HomeMediaKey,
        mediaRequirement: {
          page: 'dispatch',
          program: 'dispatch',
          kind: 'diagram',
          allowVisualFallback: true,
        } satisfies DispatchMediaRequirement,
      },
      {
        id: 'mini-olympics',
        audience: '유치원 · 학교 · 복지관 · 기관 클래스',
        name: '미니 올림픽',
        subtitle: '협동과 참여로 완성하는 스포츠 스페셜 클래스',
        paragraphs: [
          '다양한 스포츠 요소를 재구성해 누구나 함께 참여하는 스페셜 클래스입니다. 협동·응원·역할 수행으로 현장 몰입을 높입니다.',
        ],
        tags: ['팀 기반 활동', '협동·응원 중심', '스페셜 클래스'],
        example: '예시: 스포츠 경기, 줄다리기 등',
        mediaKey: 'dispatchMiniOlympics' as HomeMediaKey,
        mediaRequirement: {
          page: 'dispatch',
          program: 'oneday',
          kind: 'diagram',
          allowVisualFallback: true,
        } satisfies DispatchMediaRequirement,
      },
      {
        id: 'sports-booth',
        audience: '학교 · 축제 · 박람회 · 기관 행사',
        name: '체험형 스포츠 부스',
        subtitle: '다양한 종목을 경험하는 스포츠 체험 부스',
        paragraphs: [
          '여러 스포츠 요소를 짧고 직관적으로 경험하는 체험형 부스입니다. 인원·목적에 맞춰 구성해 짧은 시간에도 참여도를 높입니다.',
        ],
        tags: ['순환형 체험 구성', '높은 참여도', '현장 맞춤 운영'],
        example: '예시: 자이언트 체스, 에듀테크 등',
        href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
        trackLabel: 'dispatch-lineup-oneday',
        mediaKey: 'dispatchSportsBooth' as HomeMediaKey,
        mediaRequirement: {
          page: 'dispatch',
          program: 'oneday',
          kind: 'diagram',
          allowVisualFallback: true,
        } satisfies DispatchMediaRequirement,
      },
      {
        id: 'custom',
        audience: '어린이집 · 학교 · 센터 · 복지기관',
        name: '커스터마이징',
        subtitle: '대상과 목적에 맞춰 설계하는 맞춤형 체육 클래스',
        paragraphs: [
          '연령·인원·공간·목표에 맞춰 구성하는 맞춤형 체육 클래스입니다. 기초체력부터 뉴스포츠·놀이체육까지 현장에 맞게 제안합니다.',
        ],
        tags: ['맞춤형 설계', '유연한 구성 운영', '현장 중심 제안'],
        example: '예시: 자유로운 테마 융복합 등',
        mediaKey: 'dispatchCustomDesign' as HomeMediaKey,
        mediaRequirement: {
          page: 'dispatch',
          program: 'dispatch',
          kind: 'diagram',
          allowVisualFallback: true,
        } satisfies DispatchMediaRequirement,
      },
    ] satisfies DispatchLineupItem[],
  },
  operationSolutions: {
    eyebrow: '조건별 운영 해법',
    title: '운영 목적에 맞춰 프로그램을 조합합니다',
    lead: '모든 프로그램을 같은 크기로 고르는 방식이 아니라, 기관이 필요한 운영 목적 아래에서 선택지를 좁힙니다.',
    groups: [
      {
        title: '지속적인 변화가 필요할 때',
        description: '반복 수업 안에서 움직임 습관, 참여 밀도, 신체 기능을 꾸준히 끌어올립니다.',
        itemIds: ['spomove', 'monthly-sports', 'slow-sports'],
      },
      {
        title: '짧고 강한 경험이 필요할 때',
        description: '행사, 축제, 방학 일정처럼 짧은 시간 안에 참여감이 필요한 상황에 맞춥니다.',
        itemIds: ['mini-olympics', 'sports-booth'],
      },
      {
        title: '기관 고유 조건이 있을 때',
        description: '대상, 공간, 목적이 뚜렷한 기관은 기존 프로그램을 조합해 맞춤 운영안으로 설계합니다.',
        itemIds: ['custom'],
      },
    ] satisfies DispatchOperationSolution[],
  },
  operationTypes: {
    eyebrow: '운영 형태',
    title: '운영 형태를 선택하세요',
    rows: [
      {
        label: '정규수업',
        description: '매주 반복되는 흐름 안에서 아이들의 움직임 습관과 참여 경험을 쌓습니다.',
      },
      {
        label: '원데이 행사',
        description: '기관 행사 일정에 맞춰 협동 미션과 체육 활동을 짧고 강하게 구성합니다.',
      },
      {
        label: '방학캠프',
        description: '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 경험을 만듭니다.',
      },
    ],
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  /** 담당자 공유·내부 결재용 한 장 요약 */
  processOnePager: {
    eyebrow: '도입 절차',
    title: '조건 확인부터 수업 운영까지 3단계로 정리합니다',
    lead: '기관 내부 공유와 결재가 쉽도록 필요한 조건, 제안 내용, 운영 범위를 짧게 정리합니다.',
    flow: [
      { label: '조건 확인', detail: '연령·인원·공간·일정을 확인하고 운영 가능 범위를 봅니다.' },
      { label: '운영안 제안', detail: '프로그램, 동선, 강사, 준비물 범위를 묶어 제안합니다.' },
      { label: '수업 운영', detail: '사전 조율 후 현장 진행과 필요한 피드백을 이어갑니다.' },
    ] as const,
    checklist: {
      title: '상담 전에 알려주시면 빠른 제안',
      items: [
        '대상 연령과 참여 인원',
        '수업 공간과 이동 동선',
        '운영 기간·횟수와 일정',
        '특수·통합 운영 필요 여부',
      ] as const,
    },
    formats: {
      title: '제안에 포함되는 내용',
      items: ['프로그램 구성', '현장 동선', '강사·준비물 범위'] as const,
    },
    cta: {
      label: '기관 조건으로 운영안 요청하기',
      href: '#contact',
    },
  },
  examples: {
    eyebrow: '사례',
    title: '실제 운영 사례',
    href: `${SPOKEDU_BASE_PATH}/records`,
    trackLabel: 'dispatch-cases',
    items: [
      {
        venue: '양천거점형키움센터',
        audience: '초등 저학년',
        operation: 'PAPS 연계 정규수업',
        activity: '교구·놀이체육으로 체력 요소 경험',
        fitReason:
          '초등 저학년이 반복 참여하는 정규 운영이라 짧은 미션 블록과 교구 단계로 참여·성취 흐름을 안정적으로 누적했습니다.',
        review: '측정형 요소를 놀이로 풀면서도 체력 경험의 목적이 드러났습니다.',
        mediaKey: 'proofYangcheon' as HomeMediaKey,
        proves: '저학년 정규 · 공간·인원 대응',
        recordSlug: 'yangcheon-paps',
        href: dispatchExampleHref('yangcheon-paps'),
      },
      {
        venue: 'PLAYZ Lounge',
        audience: '초등 방학',
        operation: '방학 원데이 캠프',
        activity: '체육·예체능 결합 몰입 프로그램',
        fitReason: '방학 기간의 짧은 집중 일정에 맞춰 체육과 놀이형 몰입 활동을 결합했습니다.',
        review: '짧은 일정 안에서도 참여 흐름이 분명했습니다.',
        mediaKey: 'proofLounge' as HomeMediaKey,
        proves: '방학·원데이 단기 운영',
        // 전용 온사이트 slug 없음 — 목록으로만 연결 (억지 페어 금지)
        href: dispatchExampleHref(),
      },
      {
        venue: '동작거점형키움센터',
        audience: '거점센터 연계',
        operation: 'SPOMOVE 정규수업',
        activity: '리듬·타이밍 반응형 수업 운영',
        fitReason: '거점센터 연계 수업에서 리듬과 반응 과제를 반복 운영해 참여 밀도를 유지했습니다.',
        review: '사진에만 머무르지 않고 성장 흐름이 보이는 수업이었습니다.',
        mediaKey: 'proofCenter' as HomeMediaKey,
        proves: '에듀테크 · 거점 정규 운영',
        recordSlug: 'dongjak-spomove',
        href: dispatchExampleHref('dongjak-spomove'),
      },
    ] satisfies DispatchExampleItem[],
  },
  faq: {
    eyebrow: 'FAQ',
    title: '기관 담당자분들이 자주 묻는 질문',
    items: [
      {
        q: '비용은 어떻게 되나요?',
        a: '기관 규모, 대상 연령, 파견 횟수에 따라 달라집니다. 상담 접수 후 운영 조건에 맞는 안내를 드립니다.',
      },
      {
        q: '최소 계약 기간이 있나요?',
        a: '없습니다. 원데이 수업부터, 단기, 정기 수업까지 모두 가능합니다.',
      },
      {
        q: '강사 교체 요청이 가능한가요?',
        a: '네, 담당 매니저를 통해 언제든 요청 가능합니다.',
      },
      {
        q: '특수학급 아동이 포함된 통합반도 운영되나요?',
        a: '느린 학습자와 특수 체육 대상자를 고려한 수업 경험이 있는 강사가 함께합니다.',
      },
      {
        q: '운영 가능한 지역이 어디인가요?',
        a: '현재 서울 및 수도권 근교 지역에서 운영 중입니다. 운영 가능 여부는 문의 시 확인해 드립니다.',
      },
    ] as const,
  },
  finalCta: {
    title: '기관에 맞는 체육 프로그램을 제안받아 보세요',
    description:
      '대상 연령, 인원, 공간, 일정을 확인한 뒤 정규수업·원데이·방학캠프 중 적합한 운영안을 안내드립니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primary: {
      label: '맞춤 운영안 받아보기',
      href: '#contact',
      trackLabel: 'dispatch-final-program',
    },
  },
} as const;
