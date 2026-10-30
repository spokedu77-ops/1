import { HOME_SECTION03_PEOPLE } from '../components/home-web/home-section03-people';
import { PUBLIC_V0_METRICS } from './marketing-public-metrics';
import { getFieldRecordCatalogItem, type FieldRecordSlug } from './field-records-catalog';
import { SPOKEDU_PATHS } from './public-routes';
import { SPOKEDU_LAB_GYM_SPONSORSHIP_14 } from './sponsorship-public-assets';

/** 메인 히어로 — LAB 체육관 협찬 고화질 (13번 슬라이드 컷 제외) */
export const HOME_V0_HERO = {
  src: SPOKEDU_LAB_GYM_SPONSORSHIP_14,
  alt: '스포키듀LAB 체육관에서 지도자가 여러 아동과 교구 활동을 진행하는 밝은 수업 현장',
  objectPosition: '50% 48%',
} as const;

/** `home-web-assets.ts` HOME_MASTER_VISUAL — Section 3 LAB 카드 */
export const HOME_V0_LAB_SCREEN = {
  src: '/images/spokedu/subscription/library-program-cards-20261008-final.png',
  alt: '대상·공간·기능 조건으로 놀이체육 프로그램을 찾는 SPOKEDU LAB 수업자료 라이브러리',
  objectPosition: '50% 0%',
} as const;

const FIELD_CASE_FRAMES: readonly {
  slug: FieldRecordSlug;
  category: string;
  summary: string;
  objectPosition: string;
}[] = [
  {
    slug: 'donghaeng-special-pe',
    category: '특수·통합 체육',
    summary: '수행 수준에 맞춘 포용형 규칙 설계',
    objectPosition: '58% 50%',
  },
  {
    slug: 'maedong-sports-stepup',
    category: '학교 늘봄·정규',
    summary: '종로거점형키움센터 연계 6개월 과정',
    objectPosition: '50% 50%',
  },
  {
    slug: 'yangcheon-paps',
    category: '기관 PAPS 체육',
    summary: '초등 저학년 맞춤형 PAPS 놀이체육',
    objectPosition: '50% 50%',
  },
  {
    slug: 'seodaemun-event-booth',
    category: '원데이·축제 부스',
    summary: '대규모 SPOMOVE 체험부스 운영',
    objectPosition: '50% 50%',
  },
] as const;

function fieldCase(frame: (typeof FIELD_CASE_FRAMES)[number]) {
  const item = getFieldRecordCatalogItem(frame.slug);
  return {
    category: frame.category,
    title: item.venue,
    summary: frame.summary,
    image: item.thumbnailSrc!,
    alt: `${item.venue} ${item.programLabel} 수업 현장`,
    objectPosition: frame.objectPosition,
    href: item.href,
  };
}

/** `home-web-landing.tsx` AUDIENCE_PATHS 와 동일 자산·경로 */
export const HOME_V0_SERVICES = [
  {
    number: '01 · 개인·소그룹',
    title: '개인·소그룹 맞춤 수업',
    description:
      '아이의 운동 수준, 성향, 사회성 목표에 맞춰 소수 정예로 진행하는 맞춤형 체육 클래스',
    tags: '#기초체력 #사회성발달 #방문및센터수업',
    image: '/images/spokedu/private/private-coaching.jpg',
    imageAlt: '체육관에서 지도자와 아동이 스텝레더·민첩성 활동을 함께하는 개인수업',
    imagePosition: '50% 42%',
    cta: '개인수업 자세히 보기',
    href: SPOKEDU_PATHS.private,
    featured: false,
  },
  {
    number: '02 · 학교·기관',
    title: '기관·학교 출강 수업',
    description:
      '초등학교, 복지관, 키움센터의 공간·인원·연령에 맞춰 설계하는 체계적인 맞춤형 파견 교육',
    tags: '#정기출강 #특수포용체육 #미니올림픽',
    image: '/images/spokedu/records/donghaeng-special-pe-field.jpg',
    imageAlt: '기관·센터 현장에서 지도자와 아동이 교구 활동에 참여하는 출강 수업',
    imagePosition: '50% 45%',
    cta: '기관수업 자세히 보기',
    href: SPOKEDU_PATHS.education,
    featured: true,
  },
  {
    number: '03 · 지도자·LAB',
    title: 'SPOKEDU LAB',
    description:
      '전국 체육 지도자를 위한 검증된 놀이체육 커리큘럼 탐색과 수업 일정·출석·리포트 운영 도구',
    tags: '#수업콘텐츠 #강사네트워크 #학급운영툴',
    image: '/images/spokedu/home/field-editorial/home-master-ui.png',
    imageAlt: '이어서 준비할 수업과 추천 프로그램을 보여주는 SPOKEDU LAB 홈 화면',
    imagePosition: '50% 0%',
    cta: 'SPOKEDU LAB 둘러보기',
    href: SPOKEDU_PATHS.subscription,
    featured: false,
  },
] as const;

export const HOME_V0_FIELD_CASES = FIELD_CASE_FRAMES.map(fieldCase);

export const HOME_V0_EXPERTISE = [
  '학교·기관 맞춤형 커리큘럼 직접 설계',
  '자체 에듀테크 및 KC인증 교구 연구 개발',
  `${PUBLIC_V0_METRICS.instructors.value} ${PUBLIC_V0_METRICS.instructors.label} — 본사 직영 품질 관리`,
] as const;

export const HOME_V0_TEAM = HOME_SECTION03_PEOPLE.map((person) => ({
  name: person.name,
  nameEn: person.nameEn,
  role: person.role,
  photo: person.photo,
  photoObjectPosition: person.objectPosition,
  description: person.credentials.join(' · '),
}));

export const HOME_V0_CONTACT = {
  institutionHref: `${SPOKEDU_PATHS.education}#contact`,
  privateHref: `${SPOKEDU_PATHS.private}#apply`,
  recordsHref: SPOKEDU_PATHS.records,
  spomoveHref: SPOKEDU_PATHS.spomove,
  spomatHref: SPOKEDU_PATHS.spomat,
  labHref: SPOKEDU_PATHS.subscription,
  aboutHref: SPOKEDU_PATHS.about,
  contactHref: SPOKEDU_PATHS.contact,
} as const;
