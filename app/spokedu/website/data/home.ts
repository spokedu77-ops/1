import { SPOKEDU_IMAGES } from '../../data/images';
import { SPOKEDU_PATHS } from '../../data/public-routes';

/** Approved public copy inside the canonical Stitch slots. */
export const homeRefinement = {
  hero: SPOKEDU_IMAGES.home.fieldEditorialHero,
  lead: ['학교·기관부터 개인·소그룹까지 아동의 발달 수준과', '수업 환경에 맞춘 체육교육을 직접 설계하고 운영합니다.'],
  services: [
    { label: '학교·기관', title: '학교·기관 체육교육', body: '교육 대상과 참여 인원, 수업 공간을 고려해 활동을 구성하고 전문 지도자가 정기수업과 특강을 현장에서 직접 운영합니다.', href: SPOKEDU_PATHS.education, action: '기관·학교 체육교육 알아보기', photo: SPOKEDU_IMAGES.dispatch.groupClass, icon: 'groups' },
    { label: '개인·소그룹', title: '개인·소그룹 체육교육', body: '아이의 현재 움직임과 발달 수준을 살펴 활동의 난이도와 지도 방식을 조정합니다.', href: SPOKEDU_PATHS.private, action: '개인·소그룹 수업 알아보기', photo: SPOKEDU_IMAGES.private.oneToOne, icon: 'favorite' },
    { label: '지도자용 수업 플랫폼', title: '체육수업 플랫폼', body: 'SPOKEDU LAB을 통해 지도자의 수업 준비와 교육 자료 활용을 지원합니다.', href: SPOKEDU_PATHS.subscription, action: 'SPOKEDU LAB 보기', photo: { src: '/images/spokedu/subscription/library-program-cards-20261008-final.png', alt: 'SPOKEDU LAB 놀이체육 프로그램 탐색 화면과 활동별 콘텐츠 카드' }, icon: 'assignment' },
  ],
  showcases: [
    { number: '01', label: '교육 설계', title: ["수업 공간과 인원에 맞춰 활동을 구성합니다."], body: "아이의 현재 움직임과 교육 목표를 확인한 뒤 공간과 참여 인원에 맞춰 과제와 교구를 조정합니다.", tags: ['#발달수준고려', '#수업조건조정', '#맞춤형활동설계'], href: SPOKEDU_PATHS.education, action: '기관·학교 체육교육 알아보기', photo: { src: '/images/spokedu/복지관_민첩성 놀이체육.jpg', alt: '지도자가 콘 사이를 달리는 아동의 움직임을 지도하는 수업' } },
    { number: '02', label: '현장 적용', title: ["서로 다른 현장에서도 아이의 참여를 중심에 둡니다."], body: "학교와 키움센터 및 복지관에서 다양한 참여 수준을 고려해 과제를 조정합니다. 특수체육에서도 안전과 참여 경험을 우선합니다.", tags: ['#다양한교육현장', '#특수체육', '#개별참여지원'], href: SPOKEDU_PATHS.records, action: '현장 수업 사례 살펴보기', photo: SPOKEDU_IMAGES.programs.spomoveWhoAdapted },
    { number: '03', label: '교육 콘텐츠', title: ["지도자가 사용할 수 있는 교육 자료를 현장에 연결합니다."], body: "4MOVE 교육과정과 SPOMOVE 프로그램의 활동 원리를 지도자가 이해하고 수업에 적용할 수 있도록 SPOKEDU LAB을 통해 자료와 운영 기능을 제공합니다.", tags: ['#자체교육과정', '#시지각움직임교육', '#지도자교육플랫폼'], href: SPOKEDU_PATHS.subscription, action: 'SPOKEDU LAB 살펴보기', photo: { src: '/images/spokedu/subscription/library-program-cards-20261008-final.png', alt: 'SPOKEDU LAB 놀이체육 프로그램 탐색 화면과 활동별 콘텐츠 카드' } },
  ],
  fourMove: { title: "네 가지 움직임 영역을 연결하는 체육교육", body: "BASE MOVE, SPORTS MOVE, PLAY MOVE, SPOMOVE는 고정된 순서가 아닌 수업 목적과 참여 수준에 따라 구성하는 네 가지 교육 영역입니다." },
  moveAreas: [
    { name: "BASE MOVE", description: "기본 움직임", body: "걷기와 달리기 및 점프 등 기본 이동운동과 균형·신체 조절을 경험합니다." },
    { name: "SPORTS MOVE", description: "스포츠 움직임", body: "다양한 종목과 교구를 통해 조작운동과 스포츠 규칙을 경험합니다." },
    { name: "PLAY MOVE", description: "놀이·협동", body: "놀이 규칙을 이해하고 차례를 지키며 친구와 함께 움직이는 경험을 쌓습니다." },
    { name: "SPOMOVE", description: "시지각 움직임", body: "화면에서 시각정보를 보고 규칙에 맞는 반응을 선택해 신체 움직임으로 수행합니다." },
  ],
  spomoveSteps: [
    { number: '01', label: 'SEE', title: '시각정보 인지', body: '화면에 제시되는 색상과 도형 및 과제 정보를 확인합니다.' },
    { number: '02', label: 'THINK', title: '규칙 이해와 반응 선택', body: '제시된 규칙을 이해하고 수행할 움직임을 선택합니다.' },
    { number: '03', label: 'MOVE', title: '신체 움직임 수행', body: '선택한 반응을 실제 신체 움직임으로 수행합니다.' },
  ],
} as const;
