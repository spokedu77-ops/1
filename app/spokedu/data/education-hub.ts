import { SPOKEDU_BASE_PATH } from './site';

/** 체육교육 허브 — PR1 최소 셸 (PR3 완성형 아님) */
export const educationHubPage = {
  hero: {
    eyebrow: '체육교육',
    title: '현장에서 직접 운영하는 체육교육',
    lead:
      '스포키듀는 키움센터·학교·복지관 등 기관수업과 개인·소그룹 수업을 직접 설계하고 운영합니다. 목적과 대상에 맞는 경로를 선택하세요.',
  },
  paths: [
    {
      id: 'dispatch',
      badge: '기관',
      title: '기관수업',
      description: '공간·인원·일정에 맞춘 정규·행사형 기관 체육 운영.',
      href: `${SPOKEDU_BASE_PATH}/dispatch`,
      ctaLabel: '기관 프로그램 보기',
      trackLabel: 'education-path-dispatch',
    },
    {
      id: 'private',
      badge: '개인',
      title: '개인·소그룹',
      description: '아이 조건에 맞춘 1:1·소그룹 체육수업 상담.',
      href: `${SPOKEDU_BASE_PATH}/private`,
      ctaLabel: '개인수업 보기',
      trackLabel: 'education-path-private',
    },
    {
      id: 'oneday',
      badge: '행사',
      title: '원데이·행사',
      description: '축제·특별활동·시즌 일정에 맞춘 단기 체육 프로그램.',
      href: `${SPOKEDU_BASE_PATH}/dispatch?program=oneday-event#programs`,
      ctaLabel: '원데이·행사 안내',
      trackLabel: 'education-path-oneday',
    },
    {
      id: 'inclusive',
      badge: '포용',
      title: '특수·포용 체육',
      description: '통합반·특수체육 등 참여 조건을 맞춘 기관 운영 안내.',
      href: `${SPOKEDU_BASE_PATH}/dispatch?program=special-pe#programs`,
      ctaLabel: '포용 체육 안내',
      trackLabel: 'education-path-inclusive',
    },
  ] as const,
  cta: {
    title: '어떤 경로가 맞는지 모르시겠다면',
    lead: '대상·공간·일정을 알려주시면 기관 또는 개인 경로로 안내합니다.',
    label: '상담하기',
    href: `${SPOKEDU_BASE_PATH}/contact`,
    trackLabel: 'education-cta-contact',
  },
} as const;
