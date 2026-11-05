import { SPOKEDU_IMAGES } from '../../data/images';
import { SPOKEDU_PATHS } from '../../data/public-routes';

/** Approved public copy inside the canonical Stitch slots. */
export const homeRefinement = {
  hero: SPOKEDU_IMAGES.home.fieldEditorialHero,
  lead: '전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.',
  showcases: [
    { number: '01', title: ['아이와 현장의 조건에 맞춘', '체육교육 설계 역량'], body: '아이의 발달 수준과 운동 수행 능력은 물론 수업 공간과 인원 및 교육 목적에 따라 활동의 난이도와 규칙을 조정합니다.', tags: ['#맞춤형수업설계', '#4MOVE체계', '#발달수준고려'], href: SPOKEDU_PATHS.education, action: '기관·학교 수업 자세히 보기', photo: { src: '/images/spokedu/복지관_민첩성 놀이체육.jpg', alt: '지도자가 콘 사이를 달리는 아동의 움직임을 지도하는 수업' } },
    { number: '02', title: ['다양한 교육환경에서 축적한', '포용적 현장 전문성'], body: '학교와 키움센터 및 복지관을 비롯해 개인·소그룹 수업까지 다양한 환경에서 교육을 운영합니다. 아동의 개별 참여 수준에 맞춰 지도 방법을 조정하고 특수교육 대상 및 느린학습자까지 함께할 수 있는 수업을 설계합니다.', tags: ['#모두가몰입하는수업', '#특수·포용체육', '#개인·소그룹맞춤'], href: SPOKEDU_PATHS.records, action: '실제 수업 사례 보기', photo: SPOKEDU_IMAGES.programs.spomoveWhoAdapted },
    { number: '03', title: ['현장의 경험을 커리큘럼과', '교육 도구로 연결하는 개발 역량'], body: '연세대학교 체육교육학과 출신 운영진의 현장 노하우를 4MOVE 커리큘럼과 SPOMOVE 및 지도자용 플랫폼 SPOKEDU LAB으로 확장합니다.', tags: ['#연세대체육교육전공운영진', '#자체교육콘텐츠', '#SPOKEDU_LAB'], href: SPOKEDU_PATHS.about, action: 'SPOKEDU의 교육 철학 보기', photo: { src: '/images/spokedu/subscription/prepare-class-tools.png', alt: 'SPOKEDU LAB의 실제 수업 운영 도구 화면' } },
  ],
} as const;
