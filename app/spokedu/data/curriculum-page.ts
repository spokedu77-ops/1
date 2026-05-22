import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const curriculumPage = {
  hero: {
    lines: ['현장 수업을', '커리큘럼 콘텐츠로', '확장합니다'] as const,
    subtitle:
      '수업안, 운영 매뉴얼, 교구 활용 콘텐츠, 강사교육, 라이선싱까지 현장에서 검증한 수업 경험을 활용 가능한 형태로 정리합니다.',
    mediaKey: 'trackCurriculum' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '커리큘럼 콘텐츠 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      trackLabel: 'curriculum-cta-inquiry',
    },
  },
  contentProducts: {
    title: '현장 수업에서 확장하는 5가지 콘텐츠',
    lead: '자료 나열이 아니라, 강사·기관·파트너가 바로 운영에 쓸 수 있는 형태로 정리합니다.',
    items: [
      {
        title: '수업안',
        description:
          '강사가 바로 수업에 적용할 수 있도록 활동 목표, 진행 순서, 변형 방법을 정리합니다.',
        mediaKey: 'trackCurriculum' as HomeMediaKey,
      },
      {
        title: '운영 매뉴얼',
        description:
          '기관과 강사가 같은 기준으로 운영할 수 있도록 준비물, 동선, 안전, 진행 기준을 정리합니다.',
        mediaKey: 'proofLab' as HomeMediaKey,
      },
      {
        title: '교구 활용 콘텐츠',
        description:
          '하나의 교구를 여러 연령과 목적에 맞게 확장할 수 있도록 활동 예시와 응용법을 제공합니다.',
        mediaKey: 'programCurriculum' as HomeMediaKey,
      },
      {
        title: '강사 교육',
        description:
          '프로그램의 의도, 진행 방식, 현장 대응 기준을 이해하고 수업에 적용할 수 있도록 교육합니다.',
        mediaKey: 'proofMonthly' as HomeMediaKey,
      },
      {
        title: '프로그램 라이선싱',
        description:
          '기관이나 파트너가 스포키듀 프로그램을 일정 기준에 맞춰 운영할 수 있도록 콘텐츠와 운영 구조를 제공합니다.',
        mediaKey: 'trackDispatch' as HomeMediaKey,
      },
    ],
  },
  packages: {
    title: '활용 목적별 구성',
    lead: '가격 등급이 아니라, 도입 범위와 운영 목적에 맞춰 콘텐츠 조합을 제안합니다.',
    items: [
      {
        title: '문서 중심 패키지',
        description:
          '수업안과 활동 자료를 중심으로 내부 수업 준비에 활용합니다.',
      },
      {
        title: '현장 실행 패키지',
        description:
          '수업안, 운영 매뉴얼, 교구 활용법을 함께 제공해 실제 수업 운영까지 연결합니다.',
      },
      {
        title: '확장 운영 패키지',
        description:
          '강사교육과 라이선싱 구조를 포함해 기관·파트너 단위 운영으로 확장합니다.',
      },
    ],
  },
  productionFlow: {
    title: '현장 수업에서 시작하는 제작 흐름',
    steps: [
      {
        label: '현장 수업 분석',
        detail: '실제 수업에서 아이들의 반응, 난이도, 운영 변수를 확인합니다.',
      },
      {
        label: '활동 구조화',
        detail: '수업 목표, 진행 순서, 변형 방법, 안전 기준을 정리합니다.',
      },
      {
        label: '콘텐츠 문서화',
        detail: '강사가 이해하고 바로 적용할 수 있도록 수업안과 매뉴얼 형태로 정리합니다.',
      },
      {
        label: '교육·운영 적용',
        detail: '강사 교육, 기관 운영, 파트너 적용 과정에서 피드백을 반영합니다.',
      },
    ] as const,
  },
  finalCta: {
    title: '스포키듀의 수업 콘텐츠를 함께 활용하고 싶다면',
    description:
      '수업안, 운영 매뉴얼, 강사교육, 라이선싱 등 필요한 범위에 맞춰 커리큘럼 콘텐츠 활용 방식을 안내드립니다.',
    mediaKey: 'programCurriculum' as HomeMediaKey,
    primary: {
      label: '커리큘럼 콘텐츠 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      trackLabel: 'curriculum-final-inquiry',
    },
  },
} as const;
