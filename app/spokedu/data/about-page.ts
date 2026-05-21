import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type AboutWhatWeDoCard = {
  title: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  trackLabel: string;
};

export type AboutMethodCard = {
  code: string;
  title: string;
  description: string;
};

export type AboutFieldCard = {
  title: string;
  tagline: string;
  mediaKey: HomeMediaKey;
  href: string;
  trackLabel: string;
};

export const aboutPage = {
  hero: {
    lines: ['우리는 아이를 가르치고', '선생님을 가르치며', '체육수업을 콘텐츠로 만듭니다'] as const,
    subtitle: '현장 수업을 설계하고, 커리큘럼·콘텐츠로 확장하는 아동·청소년 체육 운영 단체입니다.',
  },
  /** home-lab-energy.jpg */
  heroMediaKey: 'proofLab' as HomeMediaKey,
  whatWeDo: {
    cards: [
      {
        title: '아이에게는 수업',
        description: '맞춤 체육수업으로 자신감과 기본 기능을 키웁니다.',
        mediaKey: 'trackPrivate',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'about-role-private',
      },
      {
        title: '기관에는 프로그램',
        description: '정규·원데이·캠프·SPOMOVE·PAPS를 기관 조건에 맞춰 제안합니다.',
        mediaKey: 'trackDispatch',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'about-role-dispatch',
      },
      {
        title: '선생님에게는 커리큘럼',
        description: '수업안·매뉴얼·교구·강사 교육 패키지로 정리합니다.',
        mediaKey: 'trackCurriculum',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'about-role-curriculum',
      },
    ] satisfies AboutWhatWeDoCard[],
  },
  method: {
    title: '체육을 움직임 교육으로 설계합니다',
    cards: [
      {
        code: 'BODY',
        title: '몸을 잘 쓰는 힘',
        description: '달리기·점프·균형을 놀이 안에서 익힙니다.',
      },
      {
        code: 'BRAIN',
        title: '보고 판단하고 반응하는 힘',
        description: '보고 선택하고, 타이밍에 맞춰 몸으로 반응합니다.',
      },
      {
        code: 'TOGETHER',
        title: '함께하는 힘',
        description: '규칙과 협력을 몸으로 경험합니다.',
      },
    ] satisfies AboutMethodCard[],
  },
  fieldBrand: {
    title: '현장 기록 → 커리큘럼으로',
    cards: [
      {
        title: '스포키듀 LAB',
        tagline: '프로그램 개발과 강사 교육',
        mediaKey: 'proofLab',
        href: `${SPOKEDU_BASE_PATH}/records`,
        trackLabel: 'about-field-lab',
      },
      {
        title: '개인·소그룹 수업',
        tagline: '아이 맞춤 체육수업',
        mediaKey: 'trackPrivate',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'about-field-private',
      },
      {
        title: '기관 파견 수업',
        tagline: '공간·인원·목적 맞춤',
        mediaKey: 'trackDispatch',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'about-field-dispatch',
      },
      {
        title: '월간 스포키듀 기록',
        tagline: '수업 운영을 커리큘럼의 근거로 축적',
        mediaKey: 'proofMonthly',
        href: `${SPOKEDU_BASE_PATH}/monthly`,
        trackLabel: 'about-field-monthly',
      },
    ] satisfies AboutFieldCard[],
  },
  finalCta: {
    title: '방향 선택',
    links: [
      {
        label: '개인수업',
        href: `${SPOKEDU_BASE_PATH}/private`,
        trackLabel: 'cta-about-private-final',
      },
      {
        label: '기관수업',
        href: `${SPOKEDU_BASE_PATH}/dispatch`,
        trackLabel: 'cta-about-dispatch-final',
      },
      {
        label: '커리큘럼',
        href: `${SPOKEDU_BASE_PATH}/curriculum`,
        trackLabel: 'cta-about-curriculum-final',
      },
    ],
  },
  /** Final CTA 배경 — 기관 현장 톤 */
  ctaMediaKey: 'trackDispatch' as HomeMediaKey,
} as const;
