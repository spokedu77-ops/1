/**
 * 스크린 플레이 72개 카탈로그 (하드코딩 + 엑셀→CSV→JSON 연동용).
 * 구독자 ScreenplayView는 이 목록을 읽어 카드 그리드로 표시.
 */

export interface ScreenplayCatalogItem {
  id: string | number;
  modeId: string;
  title: string;
  subtitle?: string;
  description?: string;
  sortOrder: number;
  presetRef?: string;
  thumbnailUrl?: string;
}

export type ScreenplayCatalog = ScreenplayCatalogItem[];

/** modeId → 카드 스타일 메타 (아이콘, 그라디언트, 태그 색 등) */
export const MODE_ID_TO_META: Record<
  string,
  { tag: string; tagColor: string; gradient: string; border: string; icon: string }
> = {
  CHALLENGE: {
    tag: '순발력 및 신체 통제',
    tagColor: 'bg-orange-500',
    gradient: 'from-orange-600/20 to-red-600/10',
    border: 'border-orange-500/30',
    icon: '🎯',
  },
  FLOW: {
    tag: '동작 연결 및 신체 협응',
    tagColor: 'bg-blue-500',
    gradient: 'from-blue-600/20 to-indigo-600/10',
    border: 'border-blue-500/30',
    icon: '🌊',
  },
  반응인지: {
    tag: '시각 반응 및 인지',
    tagColor: 'bg-yellow-500',
    gradient: 'from-yellow-600/20 to-amber-600/10',
    border: 'border-yellow-500/30',
    icon: '⚡',
  },
  순차기억: {
    tag: '기억력 및 순서 처리',
    tagColor: 'bg-purple-500',
    gradient: 'from-purple-600/20 to-violet-600/10',
    border: 'border-purple-500/30',
    icon: '🧠',
  },
  스트룹: {
    tag: '인지 억제 및 집중력',
    tagColor: 'bg-pink-500',
    gradient: 'from-pink-600/20 to-rose-600/10',
    border: 'border-pink-500/30',
    icon: '🎨',
  },
  이중과제: {
    tag: '분리 주의 및 협응',
    tagColor: 'bg-teal-500',
    gradient: 'from-teal-600/20 to-cyan-600/10',
    border: 'border-teal-500/30',
    icon: '🔀',
  },
};

/** 스크린 플레이 카탈로그 (초기 6개 = 기존 모드. 72개 확장 시 엑셀→CSV→스크립트로 갱신) */
export const SCREENPLAY_CATALOG: ScreenplayCatalog = [
  {
    id: 1,
    modeId: 'CHALLENGE',
    title: 'CHALLENGE 모드',
    subtitle: '순발력 & 신체 통제',
    description:
      '화면에 무작위로 뜨는 목표 타겟을 가장 빠르게 터치하고 돌아오는 한계 돌파 챌린지입니다.',
    sortOrder: 1,
  },
  {
    id: 2,
    modeId: 'FLOW',
    title: 'FLOW 모드',
    subtitle: '동작 연결 & 신체 협응',
    description:
      '화면에 제시되는 동작 시퀀스를 끊김 없이 부드럽게 연결하며 수행하는 모빌리티 프로그램입니다.',
    sortOrder: 2,
  },
  {
    id: 3,
    modeId: '반응인지',
    title: '반응인지 모드',
    subtitle: '시각 자극 반응 훈련',
    description:
      '다양한 색상과 신호에 맞춰 즉각 반응하는 시각-운동 통합 훈련입니다. 신체 반응 속도를 높입니다.',
    sortOrder: 3,
  },
  {
    id: 4,
    modeId: '순차기억',
    title: '순차기억 모드',
    subtitle: '동작 순서 기억 훈련',
    description:
      '화면이 보여주는 동작 순서를 기억하고 그대로 재현하는 작업 기억력 강화 훈련입니다.',
    sortOrder: 4,
  },
  {
    id: 5,
    modeId: '스트룹',
    title: '스트룹 모드',
    subtitle: '인지 억제 & 집중력',
    description:
      '색상 이름과 실제 색상이 불일치하는 자극 속에서 올바른 반응을 선택하는 인지 억제 훈련입니다.',
    sortOrder: 5,
  },
  {
    id: 6,
    modeId: '이중과제',
    title: '이중과제 모드',
    subtitle: '분리 주의 & 협응',
    description:
      '두 가지 다른 과제를 동시에 수행하는 분리 주의 훈련으로 고급 신체-인지 협응 능력을 개발합니다.',
    sortOrder: 6,
  },
].sort((a, b) => a.sortOrder - b.sortOrder);
