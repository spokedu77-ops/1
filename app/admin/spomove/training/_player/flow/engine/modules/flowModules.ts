/**
 * Flow 2.0 — 모듈 정의 SSOT
 * 각 모듈 = 게임에 추가되는 하나의 역학(mechanic)
 */

export type FlowModuleKey =
  | 'jump'
  | 'faster'
  | 'punch'
  | 'duck'
  | 'reach'
  | 'sprint'
  | 'freeze'
  | 'balance'
  | 'bigJump';

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
  /** 설정 화면 설명 */
  description: string;
  /** true = 항상 Stage 1에 포함, 선택 불가 */
  isBase: boolean;
  /** 새 3D 장애물 오브젝트 존재 여부 */
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
    cueWord: 'JUMP!',
    shortInstruction: '다리가 오는 방향으로 점프해서 착지하세요',
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
    cueWord: 'FASTER!',
    shortInstruction: '속도가 빨라집니다 — 리듬 잃지 말고 계속!',
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
    cueWord: 'PUNCH!',
    shortInstruction: '박스가 오면 주먹으로 치세요',
    description: '다리 위에 박스 등장 — 주먹으로 파괴',
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
    cueWord: 'DUCK!',
    shortInstruction: '우주선이 오면 몸을 낮게 숙이세요',
    description: '저공 UFO 등장 — 빠르게 몸을 낮춰 회피',
    isBase: false,
    hasObstacle: true,
  },
  reach: {
    key: 'reach',
    label: '높은 박스',
    tag: 'REACH',
    icon: '🆙',
    color: '#a78bfa',
    colorBg: 'rgba(167,139,250,0.12)',
    colorBorder: 'rgba(167,139,250,0.7)',
    cueWord: 'REACH!',
    shortInstruction: '높은 보라색 박스는 팔을 뻗어 치세요',
    description: '높은 위치의 보라색 박스 추가 — 팔을 뻗어야 파괴',
    isBase: false,
    hasObstacle: true,
  },
  sprint: {
    key: 'sprint',
    label: '속도 폭발',
    tag: 'SPRINT',
    icon: '💨',
    color: '#06b6d4',
    colorBg: 'rgba(6,182,212,0.12)',
    colorBorder: 'rgba(6,182,212,0.7)',
    cueWord: 'FASTER!',
    shortInstruction: '스프린트 링을 통과하면 속도가 폭발합니다',
    description: '주기적으로 속도 폭발 구간 등장 — 청록 링 통과 시 가속',
    isBase: false,
    hasObstacle: true,
  },
  freeze: {
    key: 'freeze',
    label: '정지 신호',
    tag: 'FREEZE',
    icon: '❄️',
    color: '#7dd3fc',
    colorBg: 'rgba(125,211,252,0.12)',
    colorBorder: 'rgba(125,211,252,0.7)',
    cueWord: 'FREEZE!',
    shortInstruction: '얼음 벽이 보이면 즉시 멈추세요',
    description: '얼음 벽 신호 등장 — 즉시 정지 억제 훈련',
    isBase: false,
    hasObstacle: true,
  },
  balance: {
    key: 'balance',
    label: '한 발 착지',
    tag: 'BALANCE',
    icon: '🦶',
    color: '#86efac',
    colorBg: 'rgba(134,239,172,0.12)',
    colorBorder: 'rgba(134,239,172,0.7)',
    cueWord: 'BALANCE!',
    shortInstruction: '큐가 뜨면 한 발로 착지하세요',
    description: '한 발 착지 큐 주기적 등장 — 균형 훈련',
    isBase: false,
    hasObstacle: false,
  },
  bigJump: {
    key: 'bigJump',
    label: '넓은 점프',
    tag: 'BIG JUMP',
    icon: '🏔️',
    color: '#fb923c',
    colorBg: 'rgba(251,146,60,0.12)',
    colorBorder: 'rgba(251,146,60,0.7)',
    cueWord: 'BIG JUMP!',
    shortInstruction: '다리 간격이 넓습니다. 더 멀리 점프하세요',
    description: '다리 간격 확대 + 점프 높이 증가',
    isBase: false,
    hasObstacle: false,
  },
};

/** 선택 가능한 모듈 (base 제외), UI 표시 순서 */
export const SELECTABLE_MODULE_KEYS: FlowModuleKey[] = [
  'faster', 'punch', 'duck', 'reach',
  'sprint', 'freeze', 'balance', 'bigJump',
];
