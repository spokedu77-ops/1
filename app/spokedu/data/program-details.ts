import type { ProgramSlug } from './programs';
import { SPOKEDU_BASE_PATH } from './content';

export type ProgramDetailBlock = {
  why: string;
  activities: string[];
  targets: string[];
  caseSlugs: string[];
  primaryCta: { label: string; href: string; trackLabel: string };
  secondaryCta: { label: string; href: string; trackLabel: string };
};

export const programDetailBlocks: Record<
  Extract<ProgramSlug, 'spomove' | 'paps' | 'oneday-event' | 'camp'>,
  ProgramDetailBlock
> = {
  spomove: {
    why: '아이가 보고·선택하고 반응하는 과정을 놀이체육 안에 넣어, 집중과 움직임을 동시에 설계합니다.',
    activities: ['빔 기반 반응 미션', '방향·타이밍 전환 활동', '소그룹 회전 스테이션'],
    targets: ['키움센터·방과후', '개인·소그룹 응용', '혼합 연령 기관 수업'],
    caseSlugs: ['yangcheon-spomove', 'dongjak-rhythm'],
    primaryCta: {
      label: 'SPOMOVE 수업 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'spomove-private-inquiry',
    },
    secondaryCta: {
      label: '기관 도입 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'spomove-dispatch-inquiry',
    },
  },
  paps: {
    why: '기초체력 요소를 평가 부담 없이 놀이로 경험해, 아이가 몸을 쓰는 감각을 익히게 합니다.',
    activities: ['심폐·근력 놀이 모듈', '유연성·순발력 스테이션', '기록 없는 참여형 챌린지'],
    targets: ['초등 저·고학년', '기관 정규수업', '체력 경험형 프로그램'],
    caseSlugs: ['yangcheon-spomove'],
    primaryCta: {
      label: 'PAPS 놀이체육 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'paps-inquiry',
    },
    secondaryCta: {
      label: '기관 수업 제안',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'paps-dispatch-proposal',
    },
  },
  'oneday-event': {
    why: '행사 일정과 공간에 맞춰 단시간 몰입·협동 경험을 설계하는 체육 기반 원데이 프로그램입니다.',
    activities: ['스테이션 순환 체험', '팀 미션·협동 게임', '안전 동선 기반 회전 운영'],
    targets: ['지역아동센터 행사', '어린이날·시즌 이벤트', '기관 특별활동'],
    caseSlugs: ['dasarang-oneday', 'seodaemun-event-booth'],
    primaryCta: {
      label: '원데이 행사 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'oneday-inquiry',
    },
    secondaryCta: {
      label: '제안서 요청',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'oneday-proposal',
    },
  },
  camp: {
    why: '방학 시즌에 체육과 예체능을 결합해, 하루 일과 안에서 집중형 움직임 경험을 만듭니다.',
    activities: ['오전·오후 블록 운영', '협동·체력 결합 활동', '캠프형 피드백 루프'],
    targets: ['방학 집중 프로그램', '키즈 복합공간', '기관·공간 연계 캠프'],
    caseSlugs: ['playz-camp'],
    primaryCta: {
      label: '방학캠프 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'camp-inquiry',
    },
    secondaryCta: {
      label: '공간 제휴 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'camp-partnership',
    },
  },
};
