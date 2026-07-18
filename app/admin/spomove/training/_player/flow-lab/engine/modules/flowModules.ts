/**
 * Flow 2.0 — 모듈 정의 SSOT
 */

export type FlowModuleKey = 'jump' | 'faster' | 'punch' | 'duck' | 'reach' | 'kick' | 'colorGate';

export interface FlowModule {
  key: FlowModuleKey;
  label: string;
  tag: string;
  icon: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  cueWord: string;
  shortInstruction: string;
  description: string;
  isBase: boolean;
  hasObstacle: boolean;
}

export const FLOW_MODULES: Record<FlowModuleKey, FlowModule> = {
  jump: {
    key: 'jump',
    label: '점프',
    tag: 'JUMP',
    icon: '🏃',
    color: '#93c5fd',
    colorBg: 'rgba(59,130,246,0.15)',
    colorBorder: 'rgba(147,197,253,0.6)',
    cueWord: '점프!',
    shortInstruction: '다리가 오면\n점프해서 착지하세요',
    description: '기본 점프 — 항상 STAGE 1에 포함',
    isBase: true,
    hasObstacle: false,
  },
  faster: {
    key: 'faster',
    label: '가속',
    tag: 'FASTER',
    icon: '⚡',
    color: '#22d3ee',
    colorBg: 'rgba(34,211,238,0.12)',
    colorBorder: 'rgba(34,211,238,0.7)',
    cueWord: '빨라진다!',
    shortInstruction: '속도가 빨라집니다\n리듬 잃지 말고 계속!',
    description: '다리 이동 속도가 이전 스테이지보다 증가',
    isBase: false,
    hasObstacle: false,
  },
  punch: {
    key: 'punch',
    label: '박스 펀치',
    tag: 'PUNCH',
    icon: '👊',
    color: '#f97316',
    colorBg: 'rgba(249,115,22,0.12)',
    colorBorder: 'rgba(249,115,22,0.7)',
    cueWord: '펀치!',
    shortInstruction: '레인 위 박스가 오면\n주먹으로 치세요',
    description: '허리~가슴 높이 박스 — 정면 주먹으로 파괴',
    isBase: false,
    hasObstacle: true,
  },
  duck: {
    key: 'duck',
    label: 'UFO 숙이기',
    tag: 'DUCK',
    icon: '🛸',
    color: '#fbbf24',
    colorBg: 'rgba(251,191,36,0.12)',
    colorBorder: 'rgba(251,191,36,0.7)',
    cueWord: '숙여!',
    shortInstruction: '우주선이 오면\n몸을 낮게 숙이세요',
    description: '저공 UFO 등장 — 빠르게 몸을 낮춰 회피',
    isBase: false,
    hasObstacle: true,
  },
  reach: {
    key: 'reach',
    label: '펀치 벽',
    tag: 'WALL',
    icon: '🧱',
    color: '#a78bfa',
    colorBg: 'rgba(167,139,250,0.12)',
    colorBorder: 'rgba(167,139,250,0.7)',
    cueWord: '두드려!',
    shortInstruction: '벽을 5번 두드려\n부수세요',
    description: '브릿지를 막는 황금 벽 — 5단 연속으로 두드려 파괴',
    isBase: false,
    hasObstacle: true,
  },
  kick: {
    key: 'kick',
    label: '롤링 배럴 킥',
    tag: 'KICK',
    icon: '🦵',
    color: '#34d399',
    colorBg: 'rgba(52,211,153,0.12)',
    colorBorder: 'rgba(52,211,153,0.7)',
    cueWord: '킥!',
    shortInstruction: '앞에 배럴이 오면\n한쪽 발을 들어 차세요',
    description: '낮은 롤링 배럴 — 앞으로 가볍게 차기',
    isBase: false,
    hasObstacle: true,
  },
  colorGate: {
    key: 'colorGate',
    label: '색 포즈 관문',
    tag: 'GATE',
    icon: '🎯',
    color: '#f472b6',
    colorBg: 'rgba(244,114,182,0.12)',
    colorBorder: 'rgba(244,114,182,0.7)',
    cueWord: '이동!',
    shortInstruction: '색에 맞는 패드로 이동해\n자세를 취하세요',
    description: '빨·노·초·파 배경 — 해당 색 패드로 이동 후 5가지 동작 순차 연습',
    isBase: false,
    hasObstacle: false,
  },
};

/** 사용자가 선택 가능한 장애물·관문 모듈 (faster는 각 스테이지 후반 자동 적용) */
export const SELECTABLE_MODULE_KEYS: FlowModuleKey[] = [
  'punch', 'kick', 'duck', 'reach',
];
