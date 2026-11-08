import { SPOKEDU_IMAGES } from '../../data/images';
import { SPOKEDU_PATHS } from '../../data/public-routes';

/** Approved public copy inside the canonical Stitch slots. */
export const homeRefinement = {
  hero: SPOKEDU_IMAGES.home.fieldEditorialHero,
  lead: '연세대학교 체육교육학과 출신 운영진을 중심으로 수업을 직접 설계하고 운영합니다.\n현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.',
  services: [
    { label: '학교·기관 담당자', title: '학교·기관 체육교육', body: '학교와 기관의 교육 목적과 운영 환경에 맞춰 정규수업부터 특별 프로그램까지 체계적으로 설계하고 운영합니다.', href: SPOKEDU_PATHS.education, action: '수업 프로그램 보기', icon: 'groups' },
    { label: '학부모·보호자', title: '개인·소그룹 체육교육', body: '아이의 발달 수준과 운동 경험을 살펴 기본운동기술부터 다양한 스포츠 활동까지 맞춤형으로 지도합니다.', href: SPOKEDU_PATHS.private, action: '맞춤 수업 알아보기', icon: 'favorite' },
    { label: '체육 지도자·교육기관', title: '체육수업 플랫폼', body: '놀이체육 커리큘럼과 활동별 수업 자료를 제공하며 수업 설계부터 현장 활용까지 지원합니다.', href: SPOKEDU_PATHS.subscription, action: 'SPOKEDU LAB 보기', icon: 'assignment' },
  ],
  showcases: [
    { number: '01', label: '교육 설계', title: ['아이의 움직임을 이해하고', '수업의 조건을 세심하게 설계합니다.'], body: '아이의 발달 수준과 운동 수행 능력을 살피고 수업 공간과 참여 인원에 맞춰 활동을 구성합니다. 같은 활동도 난이도와 규칙을 조정해 아이마다 적절한 움직임 경험을 제공합니다.', tags: ['#발달수준고려', '#수업조건조정', '#맞춤형활동설계'], href: SPOKEDU_PATHS.education, action: '기관·학교 체육교육 알아보기', photo: { src: '/images/spokedu/복지관_민첩성 놀이체육.jpg', alt: '지도자가 콘 사이를 달리는 아동의 움직임을 지도하는 수업' } },
    { number: '02', label: '현장 전문성', title: ['서로 다른 교육 현장에서도', '아이에게 맞는 수업을 이어갑니다.'], body: '학교와 키움센터부터 복지관과 개인·소그룹 수업까지 다양한 현장에서 아이들을 지도합니다. 일반 체육교육은 물론 특수교육 대상 아동과 느린학습자의 참여 특성까지 고려해 활동 방법과 지도 방식을 조정합니다.', tags: ['#다양한교육현장', '#특수체육', '#개별참여지원'], href: SPOKEDU_PATHS.records, action: '현장 수업 사례 살펴보기', photo: SPOKEDU_IMAGES.programs.spomoveWhoAdapted },
    { number: '03', label: '교육 체계 개발', title: ['현장에서 쌓은 경험을', '우리만의 교육 체계로 발전시킵니다.'], body: '연세대학교 체육교육학과 출신 운영진의 전문성과 현장 경험을 바탕으로 기본 움직임·스포츠·놀이·시지각 활동을 아우르는 체육교육과정을 개발했습니다. 시각정보에 반응하며 움직이는 SPOMOVE와 지도자용 수업 플랫폼 SPOKEDU LAB으로 교육의 활용 범위를 넓혀가고 있습니다.', tags: ['#자체교육과정', '#시지각움직임교육', '#지도자교육플랫폼'], href: SPOKEDU_PATHS.about, action: 'SPOKEDU의 교육 체계 알아보기', photo: { src: '/images/spokedu/subscription/library-program-cards-20261008-final.png', alt: 'SPOKEDU LAB 놀이체육 프로그램 탐색 화면과 활동별 콘텐츠 카드' } },
  ],
  spomoveSteps: [
    { number: '01', label: 'SEE', title: '시각정보 인지', body: '화면에 제시되는 색상과 도형 및 과제 정보를 확인합니다.' },
    { number: '02', label: 'THINK', title: '규칙 이해와 반응 선택', body: '제시된 규칙을 이해하고 수행할 움직임을 선택합니다.' },
    { number: '03', label: 'MOVE', title: '신체 움직임 수행', body: '선택한 반응을 실제 신체 움직임으로 수행합니다.' },
  ],
} as const;
