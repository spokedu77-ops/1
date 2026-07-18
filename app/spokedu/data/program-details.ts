import type { HomeMediaKey } from './home-media';
import {
  getProgramRegistryItem,
  PROGRAM_DETAIL_SLUGS,
  type ProgramDetailSlug,
  type ProgramSlug,
} from './programs-catalog';
import { SPOKEDU_BASE_PATH } from './site';

export type { ProgramDetailSlug } from './programs-catalog';
export { PROGRAM_DETAIL_SLUGS } from './programs-catalog';

export type ProgramActivity = {
  title: string;
  description: string;
  mediaKey: HomeMediaKey;
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

/** /spokedu/programs/[slug] 상세 전용 (목록·링크 메타는 programs-catalog) */
export const programDetailBlocks: Record<ProgramDetailSlug, ProgramDetailBlock> = {
  spomove: {
    mediaKey: 'programSpomove',
    heroSubtitle:
      '빔 화면의 색, 위치, 방향, 신호를 보고 몸으로 반응하는 인지·신체 반응형 에듀테크 놀이체육 프로그램입니다.',
    whyPoints: [
      '빔·에듀테크로 보고 반응하는 몰입 경험',
      '집중과 움직임을 한 수업 안에서 설계',
      '키움센터·방과후·소그룹까지 응용',
    ],
    activities: [
      { title: '빔 반응 미션', description: '시각 자극에 맞춰 방향·타이밍을 선택합니다.', mediaKey: 'programSpomove' },
      { title: '회전 스테이션', description: '대기 없이 참여 밀도를 유지합니다.', mediaKey: 'proofClass' },
      { title: '난이도 단계화', description: '연령·수준에 맞춰 미션을 조절합니다.', mediaKey: 'trackDispatch' },
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
    heroSubtitle:
      '학교 체력평가 요소를 놀이형 수업으로 경험하며, 참여와 움직임 이해를 돕는 체력 향상 프로그램입니다.',
    whyPoints: [
      '평가 부담 없이 체력 요소를 놀이로 경험',
      '심폐·근력·유연성·순발력을 스테이션으로 분리',
      '기록보다 참여와 움직임 감각에 집중',
    ],
    activities: [
      { title: '체력 놀이 모듈', description: '요소별 미니 게임으로 구성합니다.', mediaKey: 'programPaps' },
      { title: '순환 스테이션', description: '짧은 회전으로 참여율을 높입니다.', mediaKey: 'programPlay' },
      { title: '협동 챌린지', description: '팀 미션으로 재미와 몰입을 더합니다.', mediaKey: 'trackDispatch' },
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
  'monthly-newsports': {
    mediaKey: 'programMonthlyNewsports',
    heroSubtitle:
      '매월 뉴스포츠 메타 테마를 중심으로 교구·협동 활동을 이어가는 월간형 정규·방과후 체육 프로그램입니다.',
    whyPoints: [
      '월별 테마로 수업 흐름이 이어짐',
      '안전한 교구와 협동 미션 중심',
      '키움·방과후·돌봄 시간표에 맞춰 운영',
    ],
    activities: [
      {
        title: '뉴스포츠 메타 테마',
        description: '그달의 주제와 목표를 한 달 흐름으로 설계합니다.',
        mediaKey: 'programMonthlyNewsports',
      },
      {
        title: '협동·스테이션',
        description: '회전 운영으로 참여 밀도를 유지합니다.',
        mediaKey: 'proofDasarang',
      },
      {
        title: '난이도 변형',
        description: '연령·공간에 맞춰 규칙과 미션을 조절합니다.',
        mediaKey: 'trackDispatch',
      },
    ],
    targets: ['키움·방과후 정규수업', '월 4회 흐름이 필요한 기관', '뉴스포츠·협동 중심 프로그램'],
    caseSlugs: ['dasarang-oneday'],
    finalCtaTitle: '월간 뉴스포츠 도입 상담',
    finalCtaSub: '운영 주기와 공간을 확인한 뒤 월간 테마안을 제안합니다.',
    primaryCta: {
      label: '월간 뉴스포츠 문의',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-monthly-newsports-inquiry',
    },
    secondaryCta: {
      label: '월간 수업 전체 보기',
      href: `${SPOKEDU_BASE_PATH}/monthly`,
      trackLabel: 'program-monthly-newsports-monthly',
    },
  },
  'oneday-event': {
    mediaKey: 'programOneday',
    heroSubtitle:
      '기관 행사·체험일·특별활동 일정에 맞춰 협동 미션형 체육 이벤트를 구성하는 프로그램입니다.',
    whyPoints: [
      '행사 일정·공간에 맞춘 단기 몰입 설계',
      '협동과 체험을 동시에 만드는 팀 미션',
      '안전 동선과 회전 운영으로 현장 밀도 관리',
    ],
    activities: [
      { title: '스테이션 체험', description: '짧은 순환으로 많은 아이가 참여합니다.', mediaKey: 'programOneday' },
      { title: '팀 협동 게임', description: '행사 목적에 맞는 미션을 구성합니다.', mediaKey: 'proofCommunity' },
      { title: '현장 회전 운영', description: '공간·인원에 맞춰 동선을 설계합니다.', mediaKey: 'proofEvent' },
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
      label: '기관 운영 상담',
      href: `${SPOKEDU_BASE_PATH}/contact?type=dispatch`,
      trackLabel: 'program-oneday-proposal',
    },
  },
  camp: {
    mediaKey: 'programCamp',
    heroSubtitle:
      '방학 하루를 체육과 예체능 활동으로 채우는 하루 단위 몰입형 방학캠프 프로그램입니다.',
    whyPoints: [
      '방학 일정에 맞춘 종일·반일 블록 운영',
      '체육과 예체능을 한 캠프 안에서 연결',
      '기관·공간 파트너와 함께 설계 가능',
    ],
    activities: [
      { title: '오전·오후 블록', description: '집중형 일과로 에너지를 관리합니다.', mediaKey: 'programCamp' },
      { title: '체육·예체능 결합', description: '움직임과 표현 활동을 번갈아 구성합니다.', mediaKey: 'proofLounge' },
      { title: '캠프 피드백', description: '하루 단위 목표와 회고를 포함합니다.', mediaKey: 'programPlay' },
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

export function isProgramDetailSlug(slug: ProgramSlug): slug is ProgramDetailSlug {
  return (PROGRAM_DETAIL_SLUGS as readonly string[]).includes(slug);
}

export function getProgramDetailMetadata(slug: ProgramDetailSlug) {
  const item = getProgramRegistryItem(slug);
  const detail = programDetailBlocks[slug];
  if (!item) return null;
  return {
    title: item.title,
    description: item.listDescription,
    detailDescription: detail.heroSubtitle,
    effects: item.effects,
    category: item.category,
    tracks: item.tracks,
  };
}
