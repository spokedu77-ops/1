import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type InsightFilterId =
  | 'all'
  | 'movement'
  | 'lesson-design'
  | 'edtech'
  | 'institution'
  | 'parents';

/** 카드·필터에 표시하는 주제 라벨 */
export type InsightTopicLabel =
  | '신체기능·움직임'
  | '수업 설계'
  | '에듀테크 체육'
  | '기관 운영'
  | '학부모 관점';

export type InsightArticle = {
  slug: string;
  topic: InsightTopicLabel;
  coreQuestion: string;
  title: string;
  summary: string;
  audience: string;
  filters: readonly InsightFilterId[];
  mediaKey: HomeMediaKey;
  href: string;
  ctaLabel: string;
  trackLabel: string;
  /** 상세 페이지 도입 시 사용할 구조 (현재 라우트 없음) */
  detail: {
    scene: string;
    interpretation: string;
    designCriteria: string;
    spokeduApplication: string;
  };
};

export const insightFilters: { id: InsightFilterId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'movement', label: '아이의 움직임' },
  { id: 'lesson-design', label: '수업 설계' },
  { id: 'edtech', label: '에듀테크 체육' },
  { id: 'institution', label: '기관 운영' },
  { id: 'parents', label: '학부모 관점' },
];

export const insightArticles: InsightArticle[] = [
  {
    slug: 'why-start-exercise-lower-grades',
    topic: '신체기능·움직임',
    coreQuestion: '초등 저학년 운동, 왜 지금 시작해야 할까요?',
    title: '저학년에 쌓는 기초 움직임의 의미',
    summary:
      '아이들의 움직임 습관이 만들어지는 시기에 필요한 기초 움직임, 균형, 리듬, 반응 경험을 정리합니다.',
    audience: '학부모 · 초등 저학년',
    filters: ['parents', 'movement'],
    mediaKey: 'trackPrivate',
    href: `${SPOKEDU_BASE_PATH}/private`,
    ctaLabel: '개인·소그룹 안내',
    trackLabel: 'insights-article-lower-grades',
    detail: {
      scene: '저학년 아이들이 짧은 미션 안에서 균형과 방향 전환을 반복하는 수업 장면',
      interpretation:
        '이 시기에는 “잘하는지”보다 다양한 움직임을 경험하며 몸과 규칙에 익숙해지는 과정이 중요합니다.',
      designCriteria: '짧은 블록, 명확한 신호, 실패 부담이 낮은 활동 순서로 구성합니다.',
      spokeduApplication: '소그룹·개인 수업에서 기초 움직임 스테이션을 단계적으로 확장합니다.',
    },
  },
  {
    slug: 'why-spomove-see-choose-move',
    topic: '에듀테크 체육',
    coreQuestion: "SPOMOVE는 왜 '보고 → 선택하고 → 움직이는' 수업일까요?",
    title: '화면을 보는 수업이 아니라 몸으로 반응하는 수업',
    summary:
      '시각 자극을 보고 선택하고 움직이는 과정이 아이들의 집중 전환과 반응 경험으로 이어지는 이유를 설명합니다.',
    audience: '기관 담당자 · 강사',
    filters: ['edtech', 'lesson-design'],
    mediaKey: 'programSpomove',
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    ctaLabel: 'SPOMOVE 프로그램',
    trackLabel: 'insights-article-spomove',
    detail: {
      scene: '빔 화면 신호를 본 뒤 아이들이 방향을 고르고 이동하는 SPOMOVE 수업',
      interpretation:
        '화면은 지시문이 아니라 선택의 단서가 되고, 아이는 스스로 타이밍을 맞추며 참여합니다.',
      designCriteria: '신호 난이도, 대기 시간, 스테이션 전환을 연령에 맞게 조절합니다.',
      spokeduApplication: '키움·기관 정규수업에서 반응형 스테이션 회전으로 운영합니다.',
    },
  },
  {
    slug: 'first-experience-for-kids-avoiding-exercise',
    topic: '학부모 관점',
    coreQuestion: '운동을 어려워하는 아이에게 필요한 첫 경험은 무엇일까요?',
    title: '거부감을 낮추는 첫 움직임 경험',
    summary:
      '잘하지 못해도 참여할 수 있는 짧은 성공 경험과 역할 분담으로 운동 부담을 줄이는 접근을 정리합니다.',
    audience: '학부모 · 운동 부담 아이',
    filters: ['parents', 'movement'],
    mediaKey: 'proofCommunity',
    href: `${SPOKEDU_BASE_PATH}/private`,
    ctaLabel: '상담 연결',
    trackLabel: 'insights-article-avoiding-exercise',
    detail: {
      scene: '혼자 모든 동작을 하지 않아도 되는 소그룹 미션에 참여하는 장면',
      interpretation:
        '첫 경험의 목표는 실력 향상이 아니라 “움직여도 괜찮다”는 감각을 만드는 것입니다.',
      designCriteria: '선택권, 짧은 참여 시간, 칭찬 포인트를 활동 전에 분명히 합니다.',
      spokeduApplication: '개인·소그룹에서 난이도와 역할을 쪼개 참여를 설계합니다.',
    },
  },
  {
    slug: 'why-space-and-group-size-matter',
    topic: '기관 운영',
    coreQuestion: '기관 체육수업은 왜 공간과 인원 설계가 중요할까요?',
    title: '공간·인원이 수업 흐름을 만드는 이유',
    summary:
      '강당·교실·야외 등 공간과 인원에 따라 활동 밀도, 대기, 안전 동선이 달라지는 점을 정리합니다.',
    audience: '기관 담당자 · 방과후',
    filters: ['institution', 'lesson-design'],
    mediaKey: 'trackDispatch',
    href: `${SPOKEDU_BASE_PATH}/dispatch`,
    ctaLabel: '기관 수업 제안',
    trackLabel: 'insights-article-space-design',
    detail: {
      scene: '혼합 연령이 한 공간에서 스테이션을 순환하는 기관 수업',
      interpretation:
        '같은 프로그램도 동선이 겹치면 참여가 끊기고, 공간이 맞으면 반복 참여가 이어집니다.',
      designCriteria: '구역 분리, 동선 단방향, 인원 상한을 먼저 정한 뒤 활동을 배치합니다.',
      spokeduApplication: '기관 파견 전 현장 확인 후 스테이션 수와 룰을 조정합니다.',
    },
  },
  {
    slug: 'why-cooperative-missions-in-pe',
    topic: '수업 설계',
    coreQuestion: '체육수업에서 협동 미션이 필요한 이유는 무엇일까요?',
    title: '협동 미션이 만드는 참여 구조',
    summary:
      '역할 분담과 공동 목표가 아이들의 참여 균형과 수업 몰입을 어떻게 돕는지 정리합니다.',
    audience: '기관 담당자 · 강사',
    filters: ['lesson-design', 'institution'],
    mediaKey: 'proofClass',
    href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
    ctaLabel: '협동 프로그램',
    trackLabel: 'insights-article-cooperation',
    detail: {
      scene: '팀이 짧은 미션 규칙을 맞추며 이동하는 원데이·정규 협동 활동',
      interpretation:
        '협동은 친목이 아니라, 서로의 역할이 분명할 때 움직임이 이어지게 하는 수업 장치입니다.',
      designCriteria: '역할 2~3개, 짧은 라운드, 규칙 전환 시점을 미리 공유합니다.',
      spokeduApplication: '원데이·정규수업에서 팀 미션 비중을 목적에 맞게 배치합니다.',
    },
  },
  {
    slug: 'what-recording-movement-means',
    topic: '수업 설계',
    coreQuestion: '아이들의 움직임을 기록한다는 것은 어떤 의미일까요?',
    title: '움직임 기록은 평가가 아니라 설계 근거',
    summary:
      '참여·반응·협동 과정을 관찰해 다음 수업 블록을 조정하는 기록의 의미를 정리합니다.',
    audience: '기관 담당자 · 강사',
    filters: ['lesson-design'],
    mediaKey: 'proofCenter',
    href: `${SPOKEDU_BASE_PATH}/records`,
    ctaLabel: '현장 기록 보기',
    trackLabel: 'insights-article-recording',
    detail: {
      scene: '수업 후반에 아이들이 규칙 없이 미션을 이어가는 장면',
      interpretation:
        '기록은 점수화가 아니라, 어떤 활동에서 참여가 이어졌는지 보는 관찰 메모에 가깝습니다.',
      designCriteria: '관찰 포인트 2~3개만 정해 수업마다 같은 기준으로 봅니다.',
      spokeduApplication: '현장 기록을 바탕으로 월간·사례 수업 설계에 반영합니다.',
    },
  },
];

export function insightMatchesFilter(article: InsightArticle, filter: InsightFilterId): boolean {
  if (filter === 'all') return true;
  return article.filters.includes(filter);
}

export function getInsightBySlug(slug: string): InsightArticle | undefined {
  return insightArticles.find((a) => a.slug === slug);
}

/** @deprecated insightsCards — insightArticles 사용 */
export const insightsCards = insightArticles;
