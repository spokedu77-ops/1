import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const curriculumPage = {
  hero: {
    lines: ['현장 수업을', '수업안·콘텐츠로', '패키징합니다'] as const,
    subtitle: '현장에서 검증한 수업을 수업안·운영 매뉴얼·강사 교육 콘텐츠로 확장해 운영 가능성을 높입니다.',
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
      {
        title: '수업안',
        tag: 'PDF·주차 시안',
        description: '연령별 목표와 회차 흐름이 정리된 수업안을 제공해 강사가 바로 운영할 수 있게 돕습니다.',
        mediaKey: 'trackCurriculum' as HomeMediaKey,
      },
      {
        title: '운영 매뉴얼',
        tag: '체크리스트',
        description: '수업 전·중·후 체크포인트를 표준화해 현장마다 편차를 줄이고 운영 품질을 유지합니다.',
        mediaKey: 'proofLab' as HomeMediaKey,
      },
      {
        title: '교구 활용 콘텐츠',
        tag: '세팅·활동 카드',
        description: '교구 세팅법, 활동 카드, 난이도 변형안을 함께 제공해 공간 제약에도 유연하게 대응합니다.',
        mediaKey: 'programCurriculum' as HomeMediaKey,
      },
      {
        title: '강사 교육',
        tag: '슬라이드·시연',
        description: '강사 교육 자료와 시연 가이드를 통해 지도 기준을 맞추고 수업 전달력을 높입니다.',
        mediaKey: 'proofMonthly' as HomeMediaKey,
      },
      {
        title: '프로그램 라이선싱',
        tag: '브랜드·기관 확장',
        description: '기관 목적에 맞는 라이선싱 범위를 설정해 프로그램 도입과 정기 업데이트를 이어갑니다.',
        mediaKey: 'trackDispatch' as HomeMediaKey,
      },
    ],
  },
  packages: {
    title: '도입 패키지',
    items: [
      { title: '스타터', description: '수업안을 빠르게 도입하려는 기관을 위한 기본형 패키지입니다. (수업안 + 운영 매뉴얼)' },
      { title: '현장형', description: '현장 적용과 강사 전달력까지 함께 강화하는 실무형 구성입니다. (교구 콘텐츠 + 강사 교육)' },
      { title: '파트너형', description: '기관 운영 기준에 맞춘 라이선싱과 정기 업데이트를 포함한 확장형 패키지입니다.' },
    ],
  },
  productionFlow: {
    title: '제작 흐름',
    steps: ['도입 목적 정리', '대상·환경 진단', '범위 설계', '자료 제작·강사 교육', '파일럿 운영', '정기 업데이트'] as const,
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
