/** SPOKEDU's own program framework; not a medical or accredited assessment. */
export const educationSystem = {
  title: '교육 목적에 따라 구성하는 4MOVE',
  body: '4MOVE는 SPOKEDU의 자체 교육 프로그램 체계입니다. 참여자의 연령과 현재 수행 수준, 수업 목적과 환경에 맞춰 활동을 구성합니다.',
  areas: [
    { name: 'BASEMOVE', description: '기본 움직임기술과 신체기능 중심 활동' },
    { name: 'SPORTSMOVE', description: '스포츠 종목과 조작운동기술 중심 활동' },
    { name: 'PLAYMOVE', description: '놀이·규칙·협동을 활용하는 신체활동' },
    { name: 'SPOMOVE', description: '시각정보·인지·운동 수행을 연결하는 활동' },
  ],
  applications: ['유아·초등·청소년', '개인·소그룹', '학교·교육기관', '특수·느린학습자', '가족 참여형 프로그램', '원데이·캠프·체험행사'],
} as const;
