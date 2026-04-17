/**
 * 과외 안내 랜딩 페이지 이미지 URL
 * - 아래 URL만 바꾸면 수업 현장·커리큘럼 사진이 바로 반영됩니다.
 */

/** 수업 현장 섹션 (class-flow) 이미지 */
export const CLASS_FLOW_IMAGES = [
  { src: 'https://i.postimg.cc/4xWDWVRM/SE-5e4e5035-6810-11ee-a584-85f14318c83a.jpg', alt: '60분 수업 스케치 1', large: true },
  { src: 'https://i.postimg.cc/FHTMT3QX/IMG-1392.jpg', alt: '60분 수업 스케치 2', large: false },
  { src: 'https://i.postimg.cc/VkKxKnPV/DSC06500.jpg', alt: '60분 수업 스케치 3', large: false },
] as const;

/** 커리큘럼 섹션 이미지 */
export const CURRICULUM_IMAGES = [
  { img: 'https://i.postimg.cc/8Cjz4T9Y/Kakao-Talk-20260415-155838324.png', alt: '줄넘기', title: '줄넘기', desc: '리듬감 및 전신 협응력 강화' },
  { img: 'https://i.postimg.cc/QMHdmjwP/Kakao-Talk-20260415-155838324-01.png', alt: '육상', title: '육상(달리기)', desc: '바른 자세 교정과 반응 속도 향상' },
  { img: 'https://i.postimg.cc/3wVJbPQZ/Kakao-Talk-20260415-155838324-02.png', alt: '자전거', title: '자전거', desc: '균형 감각 및 두려움 극복' },
  { img: 'https://i.postimg.cc/wBZTbSYW/Kakao-Talk-20260415-155838324-03.png', alt: '인라인', title: '인라인', desc: '안전한 라이딩과 중심 이동 훈련' },
  { img: 'https://i.postimg.cc/JhGzxRvn/Kakao-Talk-20260415-155337917.png', alt: '유아체육', title: '유아체육', desc: '놀이 기반 기초 운동 발달' },
  { img: 'https://i.postimg.cc/R0yVbjz5/Kakao-Talk-20260415-155848168.png', alt: '축구', title: '축구', desc: '민첩성, 팀워크, 기초 구기 능력 향상' },
  { img: 'https://i.postimg.cc/ZqC5HJ2n/Kakao-Talk-20260415-155848168-01.png', alt: '농구', title: '농구', desc: '드리블과 공간 인지 능력 강화' },
  { img: 'https://i.postimg.cc/vBcLmNQ2/Kakao-Talk-20260416-153848501.png', alt: '팝스', title: '팝스', desc: '팝스 수행평가 대비 및 체력향상' },
] as const;
