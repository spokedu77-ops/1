import type { HomeMediaKey } from './home-media';
import { SPOKEDU_BASE_PATH } from './site';

export type ProgramSystemItem = {
  id: string;
  name: string;
  description: string;
  mediaKey: HomeMediaKey;
  href: string;
  trackLabel: string;
  featured?: boolean;
};

/** 홈 외 dispatch·프로그램 안내 등에서 재사용 가능한 프로그램 목록 */
export const programSystemItems = [
  {
    id: 'spomove',
    featured: true,
    name: 'SPOMOVE',
    description: '시각 자극을 보고 몸으로 반응하는 스크린 기반 에듀테크 놀이체육입니다.',
    mediaKey: 'programSpomove',
    href: `${SPOKEDU_BASE_PATH}/programs/spomove`,
    trackLabel: 'cta-home-system-spomove',
  },
  {
    id: 'paps',
    name: 'PAPS 놀이체육',
    description: '학교 체력평가 요소를 놀이형 수업으로 경험하며 참여와 움직임을 돕는 프로그램입니다.',
    mediaKey: 'programPaps',
    href: `${SPOKEDU_BASE_PATH}/programs/paps`,
    trackLabel: 'cta-home-system-paps',
  },
  {
    id: 'monthly-newsports',
    name: '월간 뉴스포츠',
    description: '매월 뉴스포츠 테마를 중심으로 교구·협동 활동을 이어가는 월간형 체육 프로그램입니다.',
    mediaKey: 'programMonthlyNewsports',
    href: `${SPOKEDU_BASE_PATH}/programs/monthly-newsports`,
    trackLabel: 'cta-home-system-monthly',
  },
  {
    id: 'camp',
    name: '방학캠프',
    description: '방학 기간 동안 체육과 예체능 활동을 결합해 하루 단위 몰입 프로그램으로 운영합니다.',
    mediaKey: 'programCamp',
    href: `${SPOKEDU_BASE_PATH}/programs/camp`,
    trackLabel: 'cta-home-system-camp',
  },
  {
    id: 'oneday',
    name: '원데이 스페셜 이벤트',
    description: '기관 행사나 특별활동 일정에 맞춰 짧고 몰입감 있는 체육 경험을 제공합니다.',
    mediaKey: 'programOneday',
    href: `${SPOKEDU_BASE_PATH}/programs/oneday-event`,
    trackLabel: 'cta-home-system-oneday',
  },
  {
    id: 'custom-sports',
    name: '맞춤 스포츠 특강',
    description: '기관 목적과 대상에 맞춰 종목·난이도·운영 형태를 조정하는 맞춤형 스포츠 특강입니다.',
    mediaKey: 'programPlay',
    href: `${SPOKEDU_BASE_PATH}/dispatch`,
    trackLabel: 'cta-home-system-custom',
  },
] satisfies ProgramSystemItem[];
