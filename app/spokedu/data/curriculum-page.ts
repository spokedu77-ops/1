import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export const curriculumPage = {
  hero: {
    lines: ['현장 수업을', '커리큘럼 콘텐츠로', '확장합니다'] as const,
    subtitle:
      '수업안, 운영 매뉴얼, 강사교육, 라이선싱까지 현장에서 검증한 수업 경험을 활용 가능한 형태로 정리합니다.',
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
    title: '현장 수업에서 확장하는 4가지 콘텐츠',
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
  serviceExamples: {
    title: '실제 운영 사례',
    lead: '현장에서 검증한 수업 경험을 강사교육, 커리큘럼 판매, 구독 서비스로 이어가고 있습니다.',
    items: [
      {
        title: '강사 세미나',
        date: '2023. 10~12',
        venue: '서초여성가족플라자',
        description:
          '아동체육 인큐베이팅 강의 — 파트너 강사 대상 수업 설계·현장 운영 기준을 공유했습니다.',
        status: '운영 완료',
        mediaKey: 'proofLab' as HomeMediaKey,
      },
      {
        title: '커리큘럼 판매',
        date: '2025. 03',
        venue: '이마트 문화센터',
        description:
          '미니올림픽 특강 수업안·운영 패키지 — 서울·경기·대전 문화센터에 맞춘 활동 구성을 제공했습니다.',
        status: '판매·적용',
        mediaKey: 'programCurriculum' as HomeMediaKey,
      },
      {
        title: '구독 서비스',
        date: '2026',
        venue: 'SPOKEDU MASTER',
        description:
          '강사용 수업 운영 플랫폼 — 프로그램 라이브러리, 스크린 실행 도구, 수업 기록을 한 곳에서 제공합니다. 오픈 예정.',
        status: '오픈 예정',
        mediaKey: 'trackCurriculum' as HomeMediaKey,
        href: '/spokedu-master/landing',
      },
    ],
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
