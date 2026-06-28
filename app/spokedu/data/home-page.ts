import { curriculumPage } from './curriculum-page';
import { dispatchPage } from './dispatch-page';
import { buildHomeFieldRecordCards } from './field-records-catalog';
import type { HomeMediaKey } from './home-media';
import { privatePage } from './private-page';
import {
  AUDIENCE_TRACK_ORDER,
  AUDIENCE_TRACK_PATHS,
  type AudienceTrackId,
  SPOKEDU_BASE_PATH,
} from './site';

export type { HomeFieldRecordCardFromCatalog as HomeFieldRecordCard } from './field-records-catalog';

export type HomeAudiencePath = {
  trackId: AudienceTrackId;
  audience: string;
  title: string;
  lead: string;
  href: string;
  trackLabel: string;
  mediaKey: HomeMediaKey;
};

export type HomeValuePillar = {
  id: string;
  title: string;
  body: string;
};

export type HomeAudienceProof = {
  trackId: AudienceTrackId;
  audience: string;
  quote: string;
  body: string;
  attribution: string;
  href: string;
  cta: string;
  trackLabel: string;
  /** 학부모 카드 등 — 운영진 얼굴 */
  portraitSrc?: string;
  portraitAlt?: string;
};

export type HomeHeroAudienceCta = {
  trackId: AudienceTrackId;
  audience: string;
  label: string;
  href: string;
  trackLabel: string;
};

export type HomeStatItem =
  | { id: string; kind: 'static'; value: string; label: string }
  | { id: string; kind: 'sessions' | 'students'; label: string };

const audiencePathCopy: Record<
  AudienceTrackId,
  Pick<HomeAudiencePath, 'audience' | 'title' | 'lead' | 'trackLabel' | 'mediaKey'>
> = {
  dispatch: {
    audience: '기관·단체',
    title: '기관·단체 프로그램',
    lead: '대상·공간·운영 목적에 맞춘 맞춤 프로그램과 과정',
    trackLabel: 'cta-home-path-dispatch',
    mediaKey: 'trackDispatch',
  },
  private: {
    audience: '학부모',
    title: '개인·소그룹 수업',
    lead: '연령과 성향에 맞춘 다양한 움직임의 체육 경험',
    trackLabel: 'cta-home-path-private',
    mediaKey: 'trackPrivate',
  },
  curriculum: {
    audience: '지도자·기관',
    title: '커리큘럼·지도자 교육',
    lead: '수업안, SPOMOVE 도입, 강사 교육과 운영 기준',
    trackLabel: 'cta-home-path-curriculum',
    mediaKey: 'gateCurriculum',
  },
};

export const homePage = {
  signature: 'PLAY · THINK · GROW',
  hero: {
    lines: ['다양한 움직임의 경험을 설계하고,', '체육교육의 기준을 만듭니다.'] as const,
    fieldQuote: '몸이 움직이면 뇌가 깨어납니다',
    fieldCaption: 'SPOMOVE · 기관 단체 수업 현장',
    support: [
      '개인·소그룹 수업부터 기관 맞춤 프로그램, SPOMOVE, 지도자 교육까지 한 팀이 설계합니다.',
    ] as const,
    mediaKey: 'homeHero' as HomeMediaKey,
    audienceCtas: [
      {
        trackId: 'dispatch',
        audience: '기관·단체',
        label: '기관 프로그램 제안받기',
        href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
        trackLabel: 'cta-home-dispatch-hero',
      },
      {
        trackId: 'private',
        audience: '학부모',
        label: '개인수업 상담하기',
        href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
        trackLabel: 'cta-home-private-hero',
      },
      {
        trackId: 'curriculum',
        audience: '지도자·기관',
        label: '커리큘럼·교육 문의',
        href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
        trackLabel: 'cta-home-curriculum-hero',
      },
    ] satisfies HomeHeroAudienceCta[],
    spomoveLink: {
      label: 'SPOMOVE 프로그램 보기',
      href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
      trackLabel: 'cta-home-spomove-hero',
    },
  },
  stats: [
    { id: 'orgs', kind: 'static', value: '500개+', label: '누적 파견 기관' },
    { id: 'renewal', kind: 'static', value: '98%', label: '기관 재계약률' },
    { id: 'sessions', kind: 'sessions', label: '누적 수업' },
    { id: 'students', kind: 'students', label: '수업 아이' },
  ] satisfies HomeStatItem[],
  trust: {
    badge: '연세대 체육교육학과 출신 운영진',
    lead: '아동·청소년 체육교육을 현장에서 운영하고, 과정과 커리큘럼으로 확장하는 교육 브랜드입니다.',
    pillars: [
      {
        id: 'teach',
        title: '현장에서 직접 가르칩니다',
        body: '개인·소그룹과 기관 현장에서 아이들을 직접 만나며 프로그램을 검증합니다.',
      },
      {
        id: 'design',
        title: '대상과 현장에 맞게 설계합니다',
        body: '연령, 인원, 공간, 목표에 따라 활동 순서와 난이도를 맞춥니다.',
      },
      {
        id: 'standard',
        title: '검증된 커리큘럼과 프로그램',
        body: '놀이체육 수업안과 SPOMOVE를 포함해 지도자가 활용할 기준을 만듭니다.',
      },
    ] satisfies HomeValuePillar[],
  },
  audienceProof: {
    id: 'audience-proof',
    eyebrow: '현장 평가',
    title: '관계자·학부모·지도자가 말하는 스포키듀',
    lead: '같은 브랜드라도 보는 관점이 다릅니다. 각자의 입장에서 확인해 보세요.',
    items: [
      {
        trackId: 'dispatch',
        audience: '기관 담당자',
        quote: dispatchPage.partnerReviews.items[1].quote,
        body: dispatchPage.partnerReviews.items[1].body,
        attribution: `${dispatchPage.partnerReviews.items[1].name} · ${dispatchPage.partnerReviews.items[1].org}`,
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        cta: '기관 프로그램 보기',
        trackLabel: 'cta-home-audience-proof-dispatch',
      },
      {
        trackId: 'private',
        audience: '학부모',
        quote: '아이가 매주 체육 시간만 기다려요.',
        body: privatePage.reviews.items[0].text,
        attribution: `${privatePage.reviews.items[0].who} · ${privatePage.reviews.items[0].course}`,
        portraitSrc: privatePage.instructors.items[0].photo,
        portraitAlt: privatePage.instructors.items[0].name,
        href: `${SPOKEDU_BASE_PATH}/private`,
        cta: '개인수업 안내 보기',
        trackLabel: 'cta-home-audience-proof-private',
      },
      {
        trackId: 'curriculum',
        audience: '지도자·파트너',
        quote: '현장 수업을 커리큘럼 콘텐츠로 확장합니다',
        body: `${curriculumPage.contentProducts.items[2].description} ${curriculumPage.serviceExamples.items[0].description}`,
        attribution: `${curriculumPage.serviceExamples.items[0].title} · ${curriculumPage.serviceExamples.items[0].venue}`,
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        cta: '커리큘럼·교육 보기',
        trackLabel: 'cta-home-audience-proof-curriculum',
      },
    ] satisfies HomeAudienceProof[],
  },
  audiencePaths: {
    id: 'paths',
    title: '관심 있는 영역을 선택하세요',
    lead: '학부모, 기관 담당자, 지도자 — 목적에 맞는 안내로 연결합니다.',
    items: AUDIENCE_TRACK_ORDER.map((trackId) => {
      const copy = audiencePathCopy[trackId];
      return {
        trackId,
        ...copy,
        href: `${SPOKEDU_BASE_PATH}${AUDIENCE_TRACK_PATHS[trackId]}`,
      };
    }) satisfies HomeAudiencePath[],
  },
  proof: {
    title: '기관 현장 사례',
    lead: '키움센터·아동시설·공공 행사 등 실제 운영 기록입니다.',
    featuredCount: 3,
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    recordsTrackLabel: 'cta-home-field-records',
    recordsLabel: '수업 사례 더 보기',
    cards: buildHomeFieldRecordCards(),
  },
  mission: {
    lines: [
      '아이들에게 평생 체육의 경험을 선물하고,',
      '더 나은 아동·청소년 체육교육의 기준을 만들어갑니다.',
    ] as const,
  },
  authority: {
    title: '수업을 운영하는 데서 멈추지 않습니다',
    body: '현장에서 검증한 경험을 프로그램과 커리큘럼으로 정리하고, 지도자 교육을 통해 더 많은 체육교육 현장으로 확장합니다.',
  },
  spomove: {
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    trackLabel: 'cta-home-spomove-spotlight',
  },
  closingCta: {
    line: '프로그램과 운영 과정, 상담부터 시작하세요.',
    label: '상담 문의하기',
    href: `${SPOKEDU_BASE_PATH}/contact`,
    trackLabel: 'cta-home-contact-final',
  },
} as const;
