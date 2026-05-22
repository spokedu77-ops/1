import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const curriculumPage = {
  hero: {
    lines: ['선생님들의 선생님,', '체육수업을 커리큘럼과', '콘텐츠로 만듭니다'] as const,
    subtitle:
      '현장 수업을 수업안·운영 매뉴얼·교구 콘텐츠·강사 교육·라이선싱으로 패키지화해, 기관·센터·파트너가 운영할 수 있게 돕습니다.',
    mediaKey: 'trackCurriculum' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '커리큘럼 콘텐츠 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      trackLabel: 'curriculum-cta-inquiry',
    },
    secondary: {
      label: '콘텐츠 제휴 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum&intent=partnership`,
      trackLabel: 'curriculum-cta-partnership',
    },
  },
  contentProducts: {
    title: '제공 가능한 콘텐츠',
    items: [
      {
        title: '수업안',
        description:
          '활동 목표·진행 순서·변형 방법을 단계별로 정리해, 강사가 수업 시작 전에 흐름을 잡을 수 있게 합니다.',
        mediaKey: 'trackCurriculum' as HomeMediaKey,
      },
      {
        title: '운영 매뉴얼',
        description:
          '세팅·안전·인원·마무리 체크리스트로, 담당자와 강사가 같은 기준으로 운영할 수 있게 합니다.',
        mediaKey: 'proofLab' as HomeMediaKey,
      },
      {
        title: '교구 활용 콘텐츠',
        description:
          '교구 배치도와 활동 카드로, 좁은 공간·혼합 연령 수업도 현장에서 바로 조정할 수 있습니다.',
        mediaKey: 'programCurriculum' as HomeMediaKey,
      },
      {
        title: '강사 교육',
        description:
          '시연·실습·피드백으로 수업 의도와 코칭 포인트를 팀 전체가 같은 방식으로 맞춥니다.',
        mediaKey: 'proofMonthly' as HomeMediaKey,
      },
      {
        title: '프로그램 라이선싱',
        description:
          '프로그램 사용 권한·브랜드 가이드·정기 업데이트를 묶어, 센터·지역 단위 확장을 지원합니다.',
        mediaKey: 'trackDispatch' as HomeMediaKey,
      },
    ],
  },
  packages: {
    title: '상품화 가능한 패키지',
    items: [
      {
        title: '스타터',
        description: '문서 중심 — 수업안·매뉴얼만으로 첫 도입·시범 운영을 시작할 때.',
      },
      {
        title: '현장형',
        description: '현장 실행 — 교구 콘텐츠·강사 교육까지 포함해 운영 품질을 맞출 때.',
      },
      {
        title: '파트너형',
        description: '확장 운영 — 라이선싱·업데이트·파트너 지원으로 브랜드를 키울 때.',
      },
    ],
  },
  productionFlow: {
    title: '제작 흐름',
    steps: [
      { label: '도입 목적', detail: '기관·센터가 달성하려는 목표를 정리합니다.' },
      { label: '대상·환경', detail: '연령·공간·인원 조건을 반영합니다.' },
      { label: '범위 설계', detail: '수업안·매뉴얼·교육 범위를 확정합니다.' },
      { label: '자료·교육', detail: '콘텐츠 제작과 강사 교육을 진행합니다.' },
      { label: '파일럿', detail: '현장 시범 운영으로 흐름을 검증합니다.' },
      { label: '업데이트', detail: '운영 피드백을 반영해 개선합니다.' },
    ] as const,
  },
  finalCta: {
    title: '운영 가능한 콘텐츠를 도입하세요',
    description: '필요 범위와 활용 목적을 알려주시면 패키지 구성과 도입 일정을 맞춰 제안드립니다.',
    mediaKey: 'programCurriculum' as HomeMediaKey,
    primary: {
      label: '커리큘럼 콘텐츠 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum`,
      trackLabel: 'curriculum-final-inquiry',
    },
    secondary: {
      label: '콘텐츠 제휴 문의하기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=curriculum&intent=partnership`,
      trackLabel: 'curriculum-final-partnership',
    },
  },
} as const;
