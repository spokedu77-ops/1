import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type AboutWhatWeDoCard = {
  title: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  trackLabel: string;
  linkLabel: string;
};

export const aboutPage = {
  hero: {
    kicker: '체육교육 운영 브랜드',
    lines: ['연세대 체육교육학과 출신 운영진이', '현장에서 직접 설계했습니다'] as const,
    subtitle:
      '스포키듀는 아동·청소년의 움직임 경험을 설계하는 체육교육 운영 브랜드입니다. 현장에서 아이들을 가르치고 얻은 경험과 체육전문가의 이론을 접목하여 체육 프로그램과 커리큘럼 콘텐츠를 제작합니다.',
    mediaKey: 'homeHero' as HomeMediaKey,
  },
  whatWeDo: {
    title: '우리가 하는 일',
    cards: [
      {
        title: '아이에게 맞는 움직임 경험을 만듭니다',
        description:
          '1:1·소그룹 수업을 통해 아이의 운동 경험과 참여 흐름에 맞춘 수업을 운영합니다.',
        mediaKey: 'trackPrivate',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'about-role-private',
        linkLabel: '개인·소그룹',
      },
      {
        title: '기관에서 운영 가능한 프로그램을 설계합니다',
        description:
          '공간, 인원, 일정에 맞춰 정규수업·원데이·방학캠프 형태로 수업을 구성합니다.',
        mediaKey: 'trackDispatch',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'about-role-dispatch',
        linkLabel: '기관 프로그램',
      },
      {
        title: '수업을 콘텐츠로 확장합니다',
        description:
          '현장에서 검증한 활동을 수업안, 매뉴얼, 강사교육, 라이선싱 형태로 정리합니다.',
        mediaKey: 'trackCurriculum',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'about-role-curriculum',
        linkLabel: '커리큘럼 콘텐츠',
      },
    ] satisfies AboutWhatWeDoCard[],
  },
  finalCta: {
    title: '스포키듀와 어떤 방식으로 연결할까요?',
    description:
      '아이 개인수업, 기관 프로그램, 커리큘럼 콘텐츠 중 필요한 방향에 맞춰 상담을 안내드립니다.',
    links: [
      {
        label: '개인수업 상담',
        href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
        trackLabel: 'about-cta-private',
      },
      {
        label: '기관 프로그램 제안',
        href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
        trackLabel: 'about-cta-dispatch',
      },
      {
        label: '커리큘럼 콘텐츠 문의',
        href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
        trackLabel: 'about-cta-curriculum',
      },
    ],
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
} as const;
