import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const curriculumPage = {
  hero: {
    lines: ['현장 수업을', '수업안·콘텐츠로', '패키징합니다'] as const,
    subtitle: '수업안·매뉴얼·교구·강사 교육·라이선싱 패키지.',
    mediaKey: 'trackCurriculum' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '커리큘럼 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      trackLabel: 'curriculum-cta-inquiry',
    },
    secondary: {
      label: '콘텐츠 제휴 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum&intent=partnership`,
      trackLabel: 'curriculum-cta-partnership',
    },
  },
  contentProducts: {
    title: '콘텐츠 라인업',
    items: [
      { title: '수업안', tag: 'PDF·주차 시안', mediaKey: 'trackCurriculum' as HomeMediaKey },
      { title: '운영 매뉴얼', tag: '체크리스트', mediaKey: 'proofLab' as HomeMediaKey },
      { title: '교구 콘텐츠', tag: '세팅·활동 카드', mediaKey: 'programCurriculum' as HomeMediaKey },
      { title: '강사 교육', tag: '슬라이드·시연', mediaKey: 'proofMonthly' as HomeMediaKey },
      { title: '라이선싱', tag: '브랜드·기관 확장', mediaKey: 'trackDispatch' as HomeMediaKey },
    ],
  },
  packages: {
    title: '도입 패키지',
    items: [
      { title: '스타터', description: '수업안 + 운영 매뉴얼' },
      { title: '현장형', description: '교구 콘텐츠 + 강사 교육' },
      { title: '파트너형', description: '라이선싱 + 정기 업데이트' },
    ],
  },
  productionFlow: {
    title: '제작 흐름',
    steps: ['도입 목적', '대상·환경', '범위 설계', '자료·교육', '파일럿', '업데이트'] as const,
  },
  finalCta: {
    title: '콘텐츠 도입 문의',
    description: '필요 범위와 목적만 알려주세요.',
    mediaKey: 'programCurriculum' as HomeMediaKey,
    primary: {
      label: '커리큘럼 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      trackLabel: 'curriculum-final-inquiry',
    },
    secondary: {
      label: '콘텐츠 제휴 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum&intent=partnership`,
      trackLabel: 'curriculum-final-partnership',
    },
  },
} as const;
