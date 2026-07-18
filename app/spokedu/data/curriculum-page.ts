import type { HomeMediaKey } from './home-media';

export const curriculumPage = {
  hero: {
    kicker: '지도자 교육 · 커리큘럼',
    trustBadge: '연세대 체육교육학과 출신 운영진',
    lines: ['현장에서 검증한 기준을', '지도자 교육으로 전합니다'] as const,
    subtitle:
      '현장 수업에서 검증한 기준을 수업안·운영 매뉴얼·지도자 교육·SPOMOVE 도입 교육으로 확장합니다. 선생님들의 선생님을 지향합니다.',
    mediaKey: 'trackCurriculum' as HomeMediaKey,
  },
  trustMetrics: {
    eyebrow: '핵심 축',
    items: [
      { value: '수업안', label: '바로 적용 가능한 활동 설계' },
      { value: '지도자 교육', label: '세미나·인큐베이팅' },
      { value: 'SPOMOVE', label: '자체 개발·도입 교육' },
    ] as const,
  },
  heroCtas: {
    primary: {
      label: '지도자 교육·커리큘럼 문의',
      href: '#inquiry',
      trackLabel: 'curriculum-cta-inquiry',
    },
    secondary: {
      label: 'SPOKEDU MASTER 보기',
      href: '/spokedu-master/landing',
      trackLabel: 'curriculum-cta-master',
    },
  },
  leaderAxes: {
    eyebrow: '포지션',
    title: '왜 커리큘럼인가',
    lead: '개인수업·기관 파견에 그치지 않고, 경험을 설계하고 표준화해 지도자가 같은 기준으로 운영할 수 있게 교육합니다.',
    items: [
      {
        title: '다양한 체육 경험 설계',
        description: '기초 움직임부터 SPOMOVE·종목 준비까지, 연령과 목적에 맞는 경험 흐름을 설계합니다.',
      },
      {
        title: '현장 맞춤 커스터마이징',
        description: '공간·인원·대상이 달라도 같은 교육 의도를 유지하도록 난이도와 동선을 조정합니다.',
      },
      {
        title: '과정·수업안 표준화',
        description: '활동 목표, 진행 순서, 변형, 안전 기준을 문서화해 강사와 기관이 같은 언어로 운영합니다.',
      },
      {
        title: '지도자 교육',
        description: '놀이체육 세미나, SPOMOVE 도입 교육, 교구 활용 교육으로 현장 기준을 전파합니다.',
      },
    ] as const,
  },
  contentProducts: {
    eyebrow: '콘텐츠',
    title: '현장에서 확장하는 4가지 콘텐츠',
    lead: '자료 나열이 아니라, 강사·기관·파트너가 바로 운영에 쓸 수 있는 형태로 정리합니다.',
    items: [
      {
        title: '수업안',
        description: '활동 목표, 진행 순서, 변형 방법을 정리해 바로 수업에 적용합니다.',
        mediaKey: 'curriculumTools' as HomeMediaKey,
      },
      {
        title: '운영 매뉴얼',
        description: '준비물, 동선, 안전, 진행 기준을 기관·강사가 같은 기준으로 씁니다.',
        mediaKey: 'proofLab' as HomeMediaKey,
      },
      {
        title: '강사 교육',
        description: '프로그램 의도·진행 방식·현장 대응 기준을 이해하고 적용하도록 교육합니다.',
        mediaKey: 'programPlay' as HomeMediaKey,
      },
      {
        title: '프로그램 라이선싱',
        description: '기관·파트너가 스포키듀 프로그램을 일정 기준으로 운영할 수 있게 제공합니다.',
        mediaKey: 'trackDispatch' as HomeMediaKey,
      },
    ],
  },
  trainingTracks: {
    id: 'training',
    eyebrow: '교육',
    title: '지도자·기관이 함께 받는 교육',
    items: [
      { title: '놀이체육 세미나', body: '수업 설계 기준과 현장 운영 언어를 공유합니다.' },
      { title: 'SPOMOVE 도입 교육', body: '스크린 신호·패드 운영·난이도 조절을 함께 익힙니다.' },
      { title: '교구 활용 교육', body: '준비물·동선·안전 기준을 실습 중심으로 정리합니다.' },
      { title: '기관 컨설팅', body: '정규·원데이·방학 운영안을 기관 조건에 맞춰 제안합니다.' },
    ] as const,
  },
  serviceExamples: {
    id: 'history',
    eyebrow: '운영 이력',
    title: '현장에서 이어 온 교육·콘텐츠 이력',
    lead: '세미나·커리큘럼 판매·구독 도구까지, 현장 기준을 교육과 콘텐츠로 확장한 기록입니다.',
    items: [
      {
        title: '광주광역시 체육 지도자 교육 세미나',
        date: '2026. 07. 16',
        venue: '스포키듀 / 스포키듀LAB',
        description: '광주광역시 체육 지도자를 대상으로 수업 설계·현장 운영 기준을 공유한 교육 세미나입니다.',
        status: '운영 완료',
        mediaKey: 'gateCurriculum' as HomeMediaKey,
      },
      {
        title: '강사 세미나',
        date: '2023. 10~12',
        venue: '서초여성가족플라자',
        description: '아동체육 인큐베이팅 강의 — 파트너 강사 대상 수업 설계·현장 운영 기준을 공유했습니다.',
        status: '운영 완료',
        mediaKey: 'programSpomove' as HomeMediaKey,
      },
      {
        title: '커리큘럼 판매',
        date: '2025. 03',
        venue: '이마트 문화센터',
        description: '미니올림픽 특강 수업안·운영 패키지 — 서울·경기·대전 문화센터에 맞춘 구성을 제공했습니다.',
        status: '판매·적용',
        mediaKey: 'programCamp' as HomeMediaKey,
      },
      {
        title: '구독 서비스',
        date: '2026',
        venue: 'SPOKEDU MASTER',
        description: '강사용 수업 운영 플랫폼 — 프로그램 라이브러리, 스크린 실행, 수업 기록을 한곳에서 제공합니다.',
        status: '서비스 중',
        mediaKey: 'programOneday' as HomeMediaKey,
        href: '/spokedu-master/landing',
      },
    ],
  },
  masterSpotlight: {
    id: 'master',
    eyebrow: '강사용 구독 도구',
    title: '수업안·SPOMOVE·설명 문구를 매주 쓸 수 있는 도구',
    lead: 'SPOKEDU MASTER는 프로그램 라이브러리, 큰 화면 실행 도구, 수업 기록, 보호자·기관 설명 문구를 한곳에서 제공하는 강사용 플랫폼입니다.',
    tags: ['프로그램 라이브러리', 'SPOMOVE 큰 화면 실행', '수업 기록', '설명 문구 자동 생성', '월 자동결제'] as const,
    primary: {
      label: 'SPOKEDU MASTER 살펴보기',
      href: '/spokedu-master/landing',
      trackLabel: 'curriculum-master-cta-primary',
    },
    secondary: {
      label: '이용권 보기',
      href: '/spokedu-master/landing#pricing',
      trackLabel: 'curriculum-master-cta-pricing',
    },
  },
  finalCta: {
    title: '지도자 교육·커리큘럼을 함께 만들고 싶다면',
    description:
      '수업안, 운영 매뉴얼, 강사교육, SPOMOVE 도입, 라이선싱 등 필요한 범위에 맞춰 안내드립니다.',
    mediaKey: 'programCurriculum' as HomeMediaKey,
    primary: {
      label: '커리큘럼·교육 문의하기',
      href: '#inquiry',
      trackLabel: 'curriculum-final-inquiry',
    },
  },
} as const;
