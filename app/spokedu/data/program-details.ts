import type { HomeMediaKey } from './home-media';
import type { ProgramSlug } from './programs';
import { SPOKEDU_BASE_PATH } from './site';

export type ProgramActivity = {
  title: string;
  description: string;
};

export type ProgramDetailBlock = {
  mediaKey: HomeMediaKey;
  heroSubtitle: string;
  whyPoints: string[];
  activities: ProgramActivity[];
  targets: string[];
  caseSlugs: string[];
  finalCtaTitle: string;
  finalCtaSub: string;
  primaryCta: { label: string; href: string; trackLabel: string };
  secondaryCta: { label: string; href: string; trackLabel: string };
};

export const programDetailBlocks: Record<
  Extract<ProgramSlug, 'spomove' | 'paps' | 'oneday-event' | 'camp'>,
  ProgramDetailBlock
> = {
  spomove: {
    mediaKey: 'programSpomove',
    heroSubtitle: '보고, 선택하고, 판단하고, 움직이는 빔 기반 에듀테크 놀이체육',
    whyPoints: [
      '빔·에듀테크로 보고 반응하는 몰입 경험',
      '집중과 움직임을 한 수업 안에서 설계',
      '키움센터·방과후·소그룹까지 응용',
    ],
    activities: [
      { title: '빔 반응 미션', description: '시각 자극에 맞춰 방향·타이밍을 선택합니다.' },
      { title: '회전 스테이션', description: '대기 없이 참여 밀도를 유지합니다.' },
      { title: '난이도 단계화', description: '연령·수준에 맞춰 미션을 조절합니다.' },
    ],
    targets: ['키움센터·방과후', '개인·소그룹 응용', '혼합 연령 기관 수업'],
    caseSlugs: ['yangcheon-spomove', 'dongjak-rhythm'],
    finalCtaTitle: 'SPOMOVE 도입 상담',
    finalCtaSub: '공간·인원·일정을 확인한 뒤 맞는 운영안을 안내합니다.',
    primaryCta: {
      label: 'SPOMOVE 수업 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=private`,
      trackLabel: 'program-spomove-private',
    },
    secondaryCta: {
      label: '기관 도입 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-spomove-dispatch',
    },
  },
  paps: {
    mediaKey: 'programPaps',
    heroSubtitle: '초등 기초체력 요소를 놀이로 경험하는 프로그램',
    whyPoints: [
      '평가 부담 없이 체력 요소를 놀이로 경험',
      '심폐·근력·유연성·순발력을 스테이션으로 분리',
      '기록보다 참여와 움직임 감각에 집중',
    ],
    activities: [
      { title: '체력 놀이 모듈', description: '요소별 미니 게임으로 구성합니다.' },
      { title: '순환 스테이션', description: '짧은 회전으로 참여율을 높입니다.' },
      { title: '협동 챌린지', description: '팀 미션으로 재미와 몰입을 더합니다.' },
    ],
    targets: ['초등 저·고학년', '기관 정규수업', '체력 경험형 프로그램'],
    caseSlugs: ['yangcheon-spomove'],
    finalCtaTitle: 'PAPS 도입 상담',
    finalCtaSub: '대상 연령과 운영 목적에 맞춰 구성안을 제안합니다.',
    primaryCta: {
      label: 'PAPS 놀이체육 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-paps-inquiry',
    },
    secondaryCta: {
      label: '기관 수업 제안',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-paps-dispatch',
    },
  },
  'oneday-event': {
    mediaKey: 'programOneday',
    heroSubtitle: '기관 행사와 특별활동에 맞춘 체육 기반 원데이 프로그램',
    whyPoints: [
      '행사 일정·공간에 맞춘 단기 몰입 설계',
      '협동과 체험을 동시에 만드는 팀 미션',
      '안전 동선과 회전 운영으로 현장 밀도 관리',
    ],
    activities: [
      { title: '스테이션 체험', description: '짧은 순환으로 많은 아이가 참여합니다.' },
      { title: '팀 협동 게임', description: '행사 목적에 맞는 미션을 구성합니다.' },
      { title: '현장 회전 운영', description: '공간·인원에 맞춰 동선을 설계합니다.' },
    ],
    targets: ['지역아동센터 행사', '어린이날·시즌 이벤트', '기관 특별활동'],
    caseSlugs: ['dasarang-oneday', 'seodaemun-event-booth'],
    finalCtaTitle: '원데이 행사 상담',
    finalCtaSub: '행사 일정과 공간을 알려주시면 프로그램안을 제안합니다.',
    primaryCta: {
      label: '원데이 행사 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-oneday-inquiry',
    },
    secondaryCta: {
      label: '제안서 요청',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-oneday-proposal',
    },
  },
  camp: {
    mediaKey: 'programCamp',
    heroSubtitle: '체육과 예체능을 결합한 방학 시즌 집중 프로그램',
    whyPoints: [
      '방학 일정에 맞춘 종일·반일 블록 운영',
      '체육과 예체능을 한 캠프 안에서 연결',
      '기관·공간 파트너와 함께 설계 가능',
    ],
    activities: [
      { title: '오전·오후 블록', description: '집중형 일과로 에너지를 관리합니다.' },
      { title: '체육·예체능 결합', description: '움직임과 표현 활동을 번갈아 구성합니다.' },
      { title: '캠프 피드백', description: '하루 단위 목표와 회고를 포함합니다.' },
    ],
    targets: ['방학 집중 프로그램', '키즈 복합공간', '기관·공간 연계 캠프'],
    caseSlugs: ['playz-camp'],
    finalCtaTitle: '방학캠프 상담',
    finalCtaSub: '운영 기간과 공간 조건에 맞춰 캠프안을 제안합니다.',
    primaryCta: {
      label: '방학캠프 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-camp-inquiry',
    },
    secondaryCta: {
      label: '공간 제휴 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-camp-partnership',
    },
  },
};
