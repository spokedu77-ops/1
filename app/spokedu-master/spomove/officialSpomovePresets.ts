import { SPOMOVE_AXIS_META, type SpomoveAxis } from '@/app/lib/spomove/spomoveAxisMeta';

export type OfficialSpomoveAxis = SpomoveAxis;

export type SpomoveAxisTitle = (typeof SPOMOVE_AXIS_META)[OfficialSpomoveAxis]['title'];

export type OfficialSpomoveProgramGroup =
  | 'reaction-cognition'
  | 'visual-reaction'
  | 'simon'
  | 'flanker'
  | 'stroop'
  | 'sequential-memory';

export type OfficialSpomoveEngineMode =
  | 'basic'
  | 'reactTrain'
  | 'simon'
  | 'flanker'
  | 'stroop'
  | 'spatial';

export type OfficialSpomovePreset = {
  id: string;
  title: string;
  en?: string;
  axis: OfficialSpomoveAxis;
  axisTitle: SpomoveAxisTitle;
  programGroup: OfficialSpomoveProgramGroup;
  programTitle: string;
  description: string;
  salesCopy?: string;
  engine: {
    mode: OfficialSpomoveEngineMode;
    level: number;
  };
  cueSeconds: 3;
  rounds: number;
  bgmAutoPlay: true;
  bgmCategory: 'spomove-training';
  recommendedUse: string;
  isReady: boolean;
  readyLabel?: string;
  /** 카드/모달 표시용 실행 조건 요약 문구 */
  settingSummary: string;
  /** 카드 하단 실행 조건 칩 목록 */
  settingChips: string[];
};

export const OFFICIAL_SPOMOVE_LIBRARY: readonly OfficialSpomovePreset[] = [
  {
    id: 'reaction-cognition-space-direction-01',
    title: '반응인지 1번 · 공간 방향',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 1 },
    description: '화면에 제시되는 공간·방향 신호를 보고 빠르게 이동 방향을 선택하는 활동',
    salesCopy: '화면 방향을 보고 빠르게 움직이는 반응력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 방향 인지, 민첩 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
  },
  {
    id: 'reaction-cognition-quad-color-02',
    title: '반응인지 2번 · 사분할 색상 반응',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 2 },
    description: '네 영역에 제시되는 색상 신호를 보고 정해진 색상 또는 위치에 맞춰 반응하는 활동',
    salesCopy: '색과 위치를 함께 보는 선택 반응력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 인지, 위치 선택, 준비운동',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
  },
  {
    id: 'reaction-cognition-full-color-03',
    title: '반응인지 3번 · 전면 색상 반응',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 3 },
    description: '전면에 제시되는 색상 신호를 보고 빠르게 판단하고 움직이는 활동',
    salesCopy: '큰 색 자극에 즉시 반응하는 집중력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 색상 판단, 집중 전환',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
  },
  {
    id: 'reaction-cognition-split-color-04',
    title: '반응인지 4번 · 2분할 색상 반응',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'reaction-cognition',
    programTitle: '반응 인지',
    engine: { mode: 'basic', level: 4 },
    description: '좌우 또는 상하로 나뉜 두 영역의 색상 신호를 보고 빠르게 선택 반응하는 활동',
    salesCopy: '좌우 정보를 빠르게 구분하는 판단력',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '선택 반응, 양측 이동, 난이도 확장',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
  },
  {
    id: 'visual-reaction-flow-05',
    title: '시지각 반응 1번 · FLOW',
    en: 'Visual Reaction',
    axis: 'response',
    axisTitle: SPOMOVE_AXIS_META.response.title,
    programGroup: 'visual-reaction',
    programTitle: '시지각 반응',
    salesCopy: SPOMOVE_AXIS_META.response.salesCopy,
    engine: { mode: 'reactTrain', level: 1 },
    description: '색 자극이 자연스럽게 흘러내릴 때 해당 색 위치로 이동하는 시지각 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 시선 집중, 기본 반응 깨우기',
    isReady: true,
    settingSummary: '3초 간격 · 약 75초 · BGM 자동',
    settingChips: ['3초 간격', '약 75초', 'BGM 자동'],
  },
  {
    id: 'simon-pole-shape-06',
    title: '사이먼 효과 1번 · Pole Shape',
    en: 'Simon Effect',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'simon',
    programTitle: '사이먼 효과',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'simon', level: 1 },
    description: '도형이 나타난 위치에 끌려가지 않고, 도형의 색을 기준으로 반응하는 선택 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '위치 간섭 조절, 선택주의, 집중 반응',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
  },
  {
    id: 'flanker-uniform-07',
    title: '플랭커 1번 · Uniform Flankers',
    en: 'Flanker',
    axis: 'attention',
    axisTitle: SPOMOVE_AXIS_META.attention.title,
    programGroup: 'flanker',
    programTitle: '플랭커',
    salesCopy: SPOMOVE_AXIS_META.attention.salesCopy,
    engine: { mode: 'flanker', level: 1 },
    description: '가로로 나란히 제시되는 다섯 원 중 가운데 목표 색에 반응하는 선택 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '선택주의, 목표 집중, 방해 정보 조절',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
  },
  {
    id: 'stroop-arrow-reverse-08',
    title: '스트룹 과제 1번 · Arrow Reverse',
    en: 'Stroop Task',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'stroop',
    programTitle: '스트룹 과제',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'stroop', level: 1 },
    description: '화살표 방향을 그대로 따라가지 않고, 반대 규칙에 맞춰 반응하는 복합 반응 활동',
    cueSeconds: 3,
    rounds: 20,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '규칙 조절, 충돌 정보 처리, 실행력',
    isReady: true,
    settingSummary: '3초 · 20회 · BGM 자동',
    settingChips: ['3초', '20회', 'BGM 자동'],
  },
  {
    id: 'sequential-memory-3color-09',
    title: '순차 기억 1번 · 3 Color Memory',
    en: 'Sequential Memory',
    axis: 'executive',
    axisTitle: SPOMOVE_AXIS_META.executive.title,
    programGroup: 'sequential-memory',
    programTitle: '순차 기억',
    salesCopy: SPOMOVE_AXIS_META.executive.salesCopy,
    engine: { mode: 'spatial', level: 1 },
    description: '차례로 제시되는 색 3개의 순서를 기억하고 몸으로 재현하는 기억 수행 활동',
    cueSeconds: 3,
    rounds: 10,
    bgmAutoPlay: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '순서 기억, 작업기억, 차분한 마무리 활동',
    isReady: true,
    settingSummary: '3색 기억 · 10라운드 · BGM 자동',
    settingChips: ['3색 기억', '10라운드', 'BGM 자동'],
  },
];

export function findOfficialSpomovePreset(id: string | null | undefined) {
  return OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === id) ?? null;
}

export function officialPresetSessionHref(preset: OfficialSpomovePreset, bgmPath?: string) {
  const params = new URLSearchParams({
    preset: preset.id,
    cueSeconds: String(preset.cueSeconds),
    rounds: String(preset.rounds),
    sound: 'on',
    mode: 'projector',
  });
  if (bgmPath) params.set('bgm', bgmPath);
  return `/spokedu-master/spomove/session?${params.toString()}`;
}

export function bgmDisplayName(path: string) {
  const fileName = path.split('/').pop() ?? path;
  return decodeURIComponent(fileName)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_+/g, ' ')
    .trim();
}
