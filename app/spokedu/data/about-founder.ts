/** 간단 소개서 — 대표 소개 (PDF p.3) */

export const ABOUT_FOUNDER_IMAGE = '/images/spokedu/about/founder.png';

export const aboutFounder = {
  id: 'founder',
  eyebrow: '대표 소개',
  title: '최지훈',
  role: '아동청소년 체육교육브랜드 스포키듀 운영대표',
  credentials: [
    '연세대학교 체육교육학과 졸업',
    '2급 교원자격증',
    '(전) 다수 영어유치원 체육 수업 출강',
    '스포키듀 방문 체육 과외 수업 3,000회 이상 진행',
    'KBS 「슈퍼맨이 돌아왔다」 체력 측정 자문 출연',
    '다수 기관 아동체육 파트너 강사 인큐베이팅 강의',
    '중구청 주관 특수학급 대상 [찾아가는 동행 체육교실] 운영',
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
      '스포키듀는 아동·청소년에게 단순한 체육수업이 아닌, 다양한 신체활동 경험을 통해 신체와 정서의 균형 있는 성장을 돕는 체육교육 브랜드입니다.',
      '2020년 설립 이후 육상, 놀이체육, 뉴스포츠 기반 수업을 운영해 왔으며, 현장 수업에서 축적한 자료와 지표를 바탕으로 수업의 기준을 만들어가고 있습니다.',
      '또한 빔 기반 에듀테크 놀이체육 프로그램 스포무브(SPOMOVE)를 통해 아이들이 시각 정보를 보고, 판단하고, 움직이며 반응하는 새로운 형태의 신체활동 경험을 제공합니다.',
      '스포키듀는 신체 기능 향상, 체력 측정, 운동 처방, 정서·인지 발달 등 아이의 성장 단계에 맞춘 다양한 교육 카테고리를 운영합니다.',
      '현장에서 검증한 수업 경험을 프로그램과 커리큘럼으로 확장하며, 아이들의 움직임이 긍정적인 성장 경험으로 이어질 수 있도록 설계하고 운영합니다.',
    ] as const,
  },
} as const;
