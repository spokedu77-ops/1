import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type DispatchExampleItem = {
  venue: string;
  audience: string;
  operation: string;
  activity: string;
  mediaKey: HomeMediaKey;
  href: string;
};

export const dispatchPage = {
  hero: {
    lines: ['기관의 공간과 일정에 맞춰', '운영 가능한 체육 프로그램을', '제안합니다'] as const,
    subtitle:
      '대상 연령, 인원, 공간, 일정에 맞춰 정규수업·원데이 행사·방학캠프 형태의 체육 프로그램을 구성합니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
  },
  heroCtas: {
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-cta-program',
    },
  },
  whoFits: {
    title: '이런 기관에 적합합니다',
    items: [
      {
        title: '키움센터·지역아동센터',
        description:
          '정기 돌봄 흐름 안에서 아이들이 꾸준히 움직일 수 있는 체육수업을 운영합니다.',
      },
      {
        title: '학교·방과후',
        description:
          '학년과 인원에 맞춰 기초체력, 협동활동, 뉴스포츠 수업을 구성합니다.',
      },
      {
        title: '복지관·공공기관',
        description:
          '대상 특성과 공간 조건을 고려해 안전한 신체활동 프로그램을 제안합니다.',
      },
      {
        title: '유치원·어린이집',
        description:
          '연령에 맞는 기초 움직임과 놀이형 체육으로 짧은 시간 안에 참여 경험을 만듭니다.',
      },
      {
        title: '아동 대상 문화공간',
        description:
          '행사·체험 일정에 맞춰 원데이 프로그램과 집중형 체육 활동을 구성합니다.',
      },
    ],
  },
  smallSpace: {
    title: '공간이 작아도 가능한가요?',
    lead: '강당이 아니어도 가능합니다.',
    description:
      '교실, 다목적실, 센터 활동실처럼 제한된 공간에서도 인원, 동선, 소음, 안전 범위를 확인해 수업을 구성합니다.',
    criteria: [
      '인원 규모에 맞는 활동 면적과 대기 동선',
      '소음·이웃 이용을 고려한 활동 선택',
      '바닥·기구·이동 경로의 안전 범위 점검',
    ] as const,
  },
  operationTypes: {
    title: '운영 형태를 선택하세요',
    rows: [
      {
        label: '정규수업',
        description:
          '매주 반복되는 흐름 안에서 아이들의 움직임 습관과 참여 경험을 쌓습니다.',
      },
      {
        label: '원데이 행사',
        description:
          '기관 행사 일정에 맞춰 협동 미션과 체육 활동을 짧고 강하게 구성합니다.',
      },
      {
        label: '방학캠프',
        description:
          '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 경험을 만듭니다.',
      },
    ],
    mediaKey: 'programOneday' as HomeMediaKey,
  },
  signaturePrograms: {
    title: '기관에서 도입하는 대표 프로그램',
    lead: '공간·일정·목적에 따라 SPOMOVE와 PAPS를 조합해 제안합니다.',
    items: [
      {
        name: 'SPOMOVE',
        description:
          '빔 화면의 시각 자극을 보고 몸으로 반응하는 에듀테크 놀이체육으로, 제한된 공간에서도 몰입감 있는 활동을 만들 수 있습니다.',
        href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
        trackLabel: 'dispatch-spomove',
        mediaKey: 'programSpomove' as HomeMediaKey,
      },
      {
        name: 'PAPS',
        description:
          '학교 체력평가 요소를 기반으로 아이들이 부담 없이 체력 요소를 경험하고 점검할 수 있도록 구성합니다.',
        href: `${SPOKEDU_BASE_PATH}/programs/paps`,
        trackLabel: 'dispatch-paps',
        mediaKey: 'programPaps' as HomeMediaKey,
      },
    ],
  },
  fit: {
    title: '공간·인원·일정 기준',
    items: [
      {
        title: '공간',
        description: '실내 활동실·다목적실·강당 등 현장 조건에 맞춰 동선과 활동 범위를 설계합니다.',
      },
      {
        title: '인원',
        description: '반·학년·행사 규모에 맞춰 역할 분담과 참여율이 유지되는 팀 구성을 제안합니다.',
      },
      {
        title: '일정',
        description: '정규 시간표, 원데이, 방학 캠프 일정에 맞춰 운영 단위와 회차를 조율합니다.',
      },
    ],
  },
  inquiryFlow: {
    title: '제안서 문의는 이렇게 진행됩니다',
    steps: [
      {
        label: '기관 정보 확인',
        detail: '기관 유형, 대상 연령, 예상 인원을 확인합니다.',
      },
      {
        label: '운영 조건 정리',
        detail: '공간, 일정, 희망 운영 형태를 함께 확인합니다.',
      },
      {
        label: '프로그램 제안',
        detail: '정규수업, 원데이, 캠프 중 적합한 형태를 제안합니다.',
      },
      {
        label: '제안서·견적 안내',
        detail: '조건에 맞는 운영안과 견적을 정리해 안내드립니다.',
      },
    ] as const,
  },
  examples: {
    title: '실제 운영 사례',
    href: `${SPOKEDU_BASE_PATH}/cases`,
    trackLabel: 'dispatch-cases',
    items: [
      {
        venue: '양천거점형키움센터',
        audience: '초등 저학년',
        operation: 'SPOMOVE 정규수업',
        activity: '시각 자극 반응형 에듀테크 체육',
        mediaKey: 'proofClass' as HomeMediaKey,
        href: `${SPOKEDU_BASE_PATH}/cases/yangcheon-spomove`,
      },
      {
        venue: 'PLAYZ Lounge',
        audience: '초등 방학',
        operation: '방학 원데이 캠프',
        activity: '체육·예체능 결합 몰입 프로그램',
        mediaKey: 'proofLounge' as HomeMediaKey,
        href: `${SPOKEDU_BASE_PATH}/cases/playz-camp`,
      },
      {
        venue: '동작거점형키움센터',
        audience: '거점센터 연계',
        operation: '에듀테크 체육수업',
        activity: '리듬·타이밍 반응형 수업 운영',
        mediaKey: 'proofCenter' as HomeMediaKey,
        href: `${SPOKEDU_BASE_PATH}/records`,
      },
    ] satisfies DispatchExampleItem[],
  },
  finalCta: {
    title: '기관에 맞는 체육 프로그램을 제안받아 보세요',
    description:
      '대상 연령, 인원, 공간, 일정을 확인한 뒤 정규수업·원데이·방학캠프 중 적합한 운영안을 안내드립니다.',
    mediaKey: 'trackDispatch' as HomeMediaKey,
    primary: {
      label: '기관 프로그램 제안받기',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'dispatch-final-program',
    },
  },
} as const;
