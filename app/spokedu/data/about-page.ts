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

export type AboutTeamRole = {
  title: string;
  description: string;
};

export const aboutPage = {
  hero: {
    kicker: '체육교육 운영 브랜드',
    lines: ['현장 수업에서 시작해', '체육교육 콘텐츠로 확장합니다'] as const,
    subtitle:
      '스포키듀는 아동·청소년의 움직임 경험을 설계하는 체육교육 운영 브랜드입니다. 현장에서 아이들을 가르치고, 그 수업을 프로그램과 커리큘럼 콘텐츠로 확장합니다.',
    mediaKey: 'proofClass' as HomeMediaKey,
  },
  definition: {
    title: '스포키듀란',
    body: '스포키듀는 아동·청소년의 움직임 경험을 설계하는 체육교육 운영 브랜드입니다. 현장에서 아이들을 가르치고, 그 수업을 프로그램과 커리큘럼 콘텐츠로 확장합니다.',
    pillars: ['현장 수업', '프로그램 운영', '커리큘럼 콘텐츠'] as const,
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
  philosophy: {
    title: '교육 관점',
    lead: '스포키듀는 체육을 단순히 많이 움직이는 활동으로 보지 않습니다.',
    body: '아이들이 무엇을 보고, 어떻게 선택하고, 어떤 기준으로 반응하고, 어떻게 몸을 사용하는지까지 함께 설계합니다. SPOMOVE·PAPS, 개인·소그룹, 기관 프로그램 모두 같은 기준으로 이어집니다.',
  },
  fieldTrust: {
    title: '현장에서 다듬는 프로그램',
    lead: '스포키듀의 방향은 책상 위에서 만들어지지 않습니다. 실제 수업 현장에서 아이들의 반응과 참여 흐름을 관찰하며 프로그램을 다듬어갑니다.',
    operations: [
      '키움센터 정규수업',
      '기관 원데이·행사',
      '방학캠프',
      'SPOMOVE 운영',
      'PAPS 프로그램',
      '개인·소그룹 수업',
      '커리큘럼 콘텐츠 개발',
    ] as const,
    mediaKey: 'proofCenter' as HomeMediaKey,
    recordsHref: `${SPOKEDU_BASE_PATH}/records`,
    casesHref: `${SPOKEDU_BASE_PATH}/cases`,
  },
  team: {
    title: '역할 중심 운영',
    roles: [
      {
        title: '현장 운영',
        description: '아이들과 직접 만나 수업을 진행하고 참여 흐름을 관찰합니다.',
      },
      {
        title: '프로그램 기획',
        description: '현장 활동을 정규수업, 원데이, 캠프, 에듀테크 프로그램으로 구조화합니다.',
      },
      {
        title: '콘텐츠 확장',
        description: '수업안, 운영 매뉴얼, 강사교육 콘텐츠로 수업 경험을 정리합니다.',
      },
    ] satisfies AboutTeamRole[],
  },
  expansion: {
    title: '프로그램과 콘텐츠로의 확장',
    body: '스포키듀는 개인수업과 기관수업에 머물지 않고, 현장에서 검증한 체육수업을 프로그램, 커리큘럼, 콘텐츠로 확장해갑니다.',
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
