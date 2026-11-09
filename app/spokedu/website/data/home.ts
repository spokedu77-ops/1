import { SPOKEDU_IMAGES } from '../../data/images';
import { SPOKEDU_PATHS } from '../../data/public-routes';

/** Approved public copy inside the canonical Stitch slots. */
export const homeRefinement = {
  hero: SPOKEDU_IMAGES.home.fieldEditorialHero,
  lead: '학교·기관부터 개인·소그룹까지 아동의 발달 수준과 수업 환경에 맞춘 체육교육을 직접 설계하고 운영합니다.',
  services: [
    { label: '학교·기관', title: '학교·기관 체육교육', body: '학교와 키움센터·복지관 등 교육 현장의 대상과 운영 목적에 맞춰 정기수업과 특강을 구성합니다.', href: SPOKEDU_PATHS.education, action: '기관·학교 체육교육 알아보기', icon: 'groups' },
    { label: '개인·소그룹', title: '개인·소그룹 체육교육', body: '아이의 현재 움직임과 발달 수준을 살펴 활동의 난이도와 지도 방식을 조정합니다.', href: SPOKEDU_PATHS.private, action: '개인·소그룹 수업 알아보기', icon: 'favorite' },
    { label: '지도자용 수업 플랫폼', title: '체육수업 플랫폼', body: 'SPOKEDU LAB을 통해 지도자의 수업 준비와 교육 자료 활용을 지원합니다.', href: SPOKEDU_PATHS.subscription, action: 'SPOKEDU LAB 보기', icon: 'assignment' },
  ],
  showcases: [
    { number: '01', label: '교육 설계', title: ['아이의 움직임을 이해하고', '수업의 조건을 세심하게 설계합니다.'], body: '아이의 발달 수준과 운동 수행 능력을 살피고 수업 공간과 참여 인원에 맞춰 활동을 구성합니다. 같은 활동도 난이도와 규칙을 조정해 적절한 움직임 경험을 제공합니다.', tags: ['#발달수준고려', '#수업조건조정', '#맞춤형활동설계'], href: SPOKEDU_PATHS.education, action: '기관·학교 체육교육 알아보기', photo: { src: '/images/spokedu/복지관_민첩성 놀이체육.jpg', alt: '지도자가 콘 사이를 달리는 아동의 움직임을 지도하는 수업' } },
    { number: '02', label: '현장 적용', title: ['서로 다른 교육 현장에서도', '아이에게 맞는 수업을 이어갑니다.'], body: '학교·키움센터·복지관과 개인·소그룹 수업까지 다양한 교육 현장에서 아이들을 지도합니다. 특수교육 대상 아동과 느린학습자의 참여 특성에 맞춰 과제 제시와 지도 방식을 조정합니다.', tags: ['#다양한교육현장', '#특수체육', '#개별참여지원'], href: SPOKEDU_PATHS.records, action: '현장 수업 사례 살펴보기', photo: SPOKEDU_IMAGES.programs.spomoveWhoAdapted },
    { number: '03', label: '교육 콘텐츠', title: ['교육과정과 수업 자료를', '실제 현장에 연결합니다.'], body: '기본 움직임·스포츠·놀이·시지각 활동을 연결한 4MOVE 교육과정을 활용합니다. SPOMOVE는 시각정보를 움직임으로 연결하고 SPOKEDU LAB은 지도자용 수업 자료를 제공합니다.', tags: ['#자체교육과정', '#시지각움직임교육', '#지도자교육플랫폼'], href: SPOKEDU_PATHS.subscription, action: 'SPOKEDU LAB 살펴보기', photo: { src: '/images/spokedu/subscription/library-program-cards-20261008-final.png', alt: 'SPOKEDU LAB 놀이체육 프로그램 탐색 화면과 활동별 콘텐츠 카드' } },
  ],
  spomoveSteps: [
    { number: '01', label: 'SEE', title: '시각정보 인지', body: '화면에 제시되는 색상과 도형 및 과제 정보를 확인합니다.' },
    { number: '02', label: 'THINK', title: '규칙 이해와 반응 선택', body: '제시된 규칙을 이해하고 수행할 움직임을 선택합니다.' },
    { number: '03', label: 'MOVE', title: '신체 움직임 수행', body: '선택한 반응을 실제 신체 움직임으로 수행합니다.' },
  ],
} as const;
