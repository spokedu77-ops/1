import { SPOKEDU_IMAGES } from '../../data/images';

/** User-approved website copy and operating figures (2026-11-03). */
export const homeRefinement = {
  hero: SPOKEDU_IMAGES.home.fieldEditorialHero,
  casePhotos: {
    'dongjak-spomove': '/images/spokedu/records/dongjak-spomove.jpg',
    // Existing institution/program mapping: docs/design/phase-1b2a/SOURCE_AND_EVIDENCE.md.
    'yangcheon-paps': '/images/spokedu/home/field-records/yangcheon-paps.jpg',
    'maedong-sports-stepup': SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral.src,
  } as Record<string, string>,
  metrics: [
    { value: '10,000+', label: '누적 운영 수업' },
    { value: '500+', label: '누적 출강 학교·기관' },
    { value: '30명+', label: '전문 지도자' },
    { value: '98%', label: '기관 재계약률' },
  ],
  audiences: [
    { title: '기관·학교 담당자', name: '기관·학교 체육수업', body: '정규수업부터 특강·행사까지, 우리 기관에 맞는 프로그램과 도입 방법을 확인하세요.', href: '/education', action: '기관·학교 수업 안내' },
    { title: '학부모', name: '개인·소그룹 수업', body: '아이에게 맞는 수업 형태와 지도 방식을 살펴보고, 가능한 장소와 일정을 상담하세요.', href: '/private', action: '개인·소그룹 수업 안내' },
    { title: '체육 지도자·LAB 이용자', name: 'SPOKEDU LAB', body: '다음 수업에 활용할 콘텐츠와 수업 준비·운영 도구를 한곳에서 만나보세요.', href: '/spokedu-lab', action: 'SPOKEDU LAB 둘러보기' },
  ],
  showcases: [
    {
      number: '01', title: ['구경하는 아이 없이', '모두가 몰입하는 기관 출강'],
      body: '학교·키움센터·복지관 등 다양한 교육 현장에서 공간과 인원, 연령, 활동 목적에 맞는 체육수업을 설계하고 운영합니다. 모두가 참여할 수 있는 활동 구조와 단계별 과제를 중요하게 생각합니다.',
      tags: ['#학교·기관출강', '#특수·포용체육', '#맞춤형커리큘럼'],
      href: '/education', action: '기관수업 자세히 보기',
      photo: { src: '/images/spokedu/복지관_민첩성 놀이체육.jpg', alt: '지도자의 안내에 따라 아동들이 콘 사이를 달리는 기관 체육수업' },
    },
    {
      number: '02', title: ['16가지 움직임 성향 기반', '맞춤형 개인·소그룹 수업'],
      body: '아이의 움직임 특성과 현재 수행 수준을 살펴보고 개인별 목표에 맞춰 수업을 구성합니다. 기초 움직임기술부터 종목 활동과 또래 협동까지 아동의 출발점에 맞는 경험을 제공합니다.',
      tags: ['#1대1맞춤지도', '#소그룹체육', '#움직임성향분석'],
      href: '/private', action: '개인수업 자세히 보기',
      photo: { src: '/images/spokedu/private/private-coaching.jpg', alt: '지도자가 아동의 사다리 달리기 동작을 가까이에서 지도하는 개인수업' },
    },
    {
      number: '03', title: ['시지각을 깨우는 SPOMOVE와', '체계적인 수업 운영 도구'],
      body: 'SPOMOVE는 화면에 제시되는 시각정보를 인지하고 규칙에 따라 반응을 선택해 신체 움직임으로 연결하는 프로그램입니다. SPOKEDU LAB은 지도자가 수업 콘텐츠를 준비하고 운영하는 데 활용하는 플랫폼입니다.',
      tags: ['#SPOMOVE', '#SPOMAT', '#SPOKEDULAB'],
      href: '/spomove', action: 'SPOMOVE 자세히 보기',
    },
  ],
} as const;
