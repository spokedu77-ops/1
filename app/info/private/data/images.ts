/**
 * 과외 안내 랜딩 페이지 이미지 URL
 * - 아래 URL만 바꾸면 수업 현장·커리큘럼 사진이 바로 반영됩니다.
 */

/** 수업 현장 섹션 (class-flow) 이미지 */
export const CLASS_FLOW_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800', alt: '수업 사진 1', large: true },
  { src: 'https://images.unsplash.com/photo-1576616281728-660c6d9d16fc?auto=format&fit=crop&q=80&w=400', alt: '수업 사진 2', large: false },
  { src: 'https://images.unsplash.com/photo-1515523110800-9415d13b84a8?auto=format&fit=crop&q=80&w=400', alt: '수업 사진 3', large: false },
] as const;

/** 커리큘럼 섹션 이미지 (순서: 줄넘기, 자전거, 인라인, 육상, 구기, 체력, 놀이, 수행평가) */
export const CURRICULUM_IMAGES = [
  { img: 'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?auto=format&fit=crop&q=80&w=400', alt: '줄넘기', title: '줄넘기', desc: '리듬감 및 전신 협응력 강화' },
  { img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400', alt: '자전거', title: '자전거', desc: '균형 감각 및 두려움 극복' },
  { img: 'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&q=80&w=400', alt: '인라인', title: '인라인 스케이트', desc: '안전한 낙법과 중심 이동' },
  { img: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=400', alt: '육상', title: '달리기 및 민첩성', desc: '바른 자세 교정과 반응 속도' },
  { img: 'https://images.unsplash.com/photo-1518605368461-1ee715b49ad6?auto=format&fit=crop&q=80&w=400', alt: '구기', title: '구기 기초', desc: '공간 지각력 및 시지각 발달' },
  { img: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?auto=format&fit=crop&q=80&w=400', alt: '체력', title: '기초 체력', desc: '코어 안정화 및 체력 증진' },
  { img: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&q=80&w=400', alt: '놀이', title: '창의적 신체 놀이', desc: '야외 지형지물 활용 인지 체육' },
  { img: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=400', alt: '학교체육', title: '수행 평가 대비', desc: '학교 체육 기준 맞춤형 지도' },
] as const;
