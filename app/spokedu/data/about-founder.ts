/** 간단 소개서 — 대표 소개 (PDF p.3) */

export const ABOUT_FOUNDER_IMAGE = '/images/spokedu/about/founder.png';

export const aboutFounder = {
  id: 'founder',
  eyebrow: '대표 소개',
  title: '최지훈',
  role: '대표이사 · 체육교육 운영 총괄',
  credentials: [
    '연세대학교 체육교육학과 졸업',
    '2급 교원자격증',
    '(전) 다수 영어유치원 체육 수업 출강',
    '스포키듀 방문 체육 과외 수업 3,000회 이상 진행',
    'KBS 「슈퍼맨이 돌아왔다」 체력 측정 자문 출연',
    '다수 기관 아동체육 파트너 강사 인큐베이팅 강의',
  ] as const,
  philosophy: {
    title: '경영 이념',
    items: [
      {
        key: 'Premium',
        label: 'Premium',
        body: '체육교육 전공자 선생님들이 만들어가는 수업과 운영 기준',
      },
      {
        key: 'Potential',
        label: 'Potential',
        body: '아이의 잠재적 성장을 이끌어내는 참여·과제 설계',
      },
      {
        key: 'Panorama',
        label: 'Panorama',
        body: '신체활동 스펙트럼을 넓히는 다양한 움직임 경험',
      },
    ] as const,
  },
  message: {
    lead: 'SPORTS + KEY + EDUcation',
    paragraphs: [
      '스포키듀는 아동·청소년에게 단순한 체육수업이 아닌, 확장된 다양한 신체활동을 통해 정서와 신체의 종합적 성장을 돕습니다.',
      '2020년 설립 이후 육상·놀이 체육 기반 수업뿐 아니라 자료와 지표로 수업 기준을 쌓아 왔고, 신체 기능 향상·측정·운동 처방·정서·인지 발달 등 아이의 성장에 맞춘 카테고리를 운영합니다.',
      '현장 수업에서 검증한 경험을 프로그램과 커리큘럼으로 확장하며, 아이들의 성장이 긍정적인 경험으로 이어지도록 운영합니다.',
    ] as const,
  },
} as const;
