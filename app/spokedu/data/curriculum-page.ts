import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const curriculumPage = {
  hero: {
    lines: ['선생님들의 선생님,', '체육수업을 커리큘럼과', '콘텐츠로 만듭니다'] as const,
    subtitle: '수업안·매뉴얼·교구 콘텐츠·강사교육·라이선싱을 패키지로 제공합니다.',
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
    title: '제공 가능한 콘텐츠',
    items: [
      { title: '수업안', tag: 'PDF·주차 시안', mediaKey: 'trackCurriculum' as HomeMediaKey },
      { title: '운영 매뉴얼', tag: '체크리스트', mediaKey: 'proofLab' as HomeMediaKey },
      { title: '교구 콘텐츠', tag: '세팅·활동 카드', mediaKey: 'programCurriculum' as HomeMediaKey },
      { title: '강사 교육', tag: '슬라이드·시연', mediaKey: 'proofMonthly' as HomeMediaKey },
      { title: '라이선싱', tag: '브랜드·기관 확장', mediaKey: 'trackDispatch' as HomeMediaKey },
    ],
  },
  packages: {
    title: '상품화 가능한 패키지',
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
    title: '운영 가능한 콘텐츠를 도입하세요',
    description: '필요 범위와 활용 목적을 알려주시면 맞춤 제안을 드립니다.',
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
