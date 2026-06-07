export const OFFICIAL_CUE_SECONDS = [2, 3, 4, 5] as const;
export const OFFICIAL_ROUNDS = [10, 20, 30] as const;

export type OfficialCueSeconds = (typeof OFFICIAL_CUE_SECONDS)[number];
export type OfficialRounds = (typeof OFFICIAL_ROUNDS)[number];

export type OfficialSpomovePreset = {
  id: string;
  title: string;
  category: '반응인지';
  type: 'space-direction' | 'quad-color' | 'full-color' | 'split-color';
  engine: {
    mode: 'basic';
    level: 1 | 2 | 3 | 4;
  };
  description: string;
  defaultCueSeconds: OfficialCueSeconds;
  defaultRounds: OfficialRounds;
  allowedCueSeconds: readonly OfficialCueSeconds[];
  allowedRounds: readonly OfficialRounds[];
  bgmEnabled: true;
  bgmCategory: 'spomove-training';
  recommendedUse: string;
};

export const OFFICIAL_SPOMOVE_LIBRARY: readonly OfficialSpomovePreset[] = [
  {
    id: 'reaction-cognition-space-direction-01',
    title: '반응인지 1번 · 공간 방향',
    category: '반응인지',
    type: 'space-direction',
    engine: { mode: 'basic', level: 1 },
    description: '화면에 제시되는 공간·방향 신호를 보고 빠르게 이동 방향을 선택하는 활동',
    defaultCueSeconds: 3,
    defaultRounds: 20,
    allowedCueSeconds: OFFICIAL_CUE_SECONDS,
    allowedRounds: OFFICIAL_ROUNDS,
    bgmEnabled: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '수업 도입, 방향 인지, 민첩 반응',
  },
  {
    id: 'reaction-cognition-quad-color-02',
    title: '반응인지 2번 · 사분할 색상 반응',
    category: '반응인지',
    type: 'quad-color',
    engine: { mode: 'basic', level: 2 },
    description: '네 영역에 제시되는 색상 신호를 보고 정해진 색상 또는 위치에 맞춰 반응하는 활동',
    defaultCueSeconds: 3,
    defaultRounds: 20,
    allowedCueSeconds: OFFICIAL_CUE_SECONDS,
    allowedRounds: OFFICIAL_ROUNDS,
    bgmEnabled: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '색상 인지, 위치 선택, 준비운동',
  },
  {
    id: 'reaction-cognition-full-color-03',
    title: '반응인지 3번 · 전면 색상 반응',
    category: '반응인지',
    type: 'full-color',
    engine: { mode: 'basic', level: 3 },
    description: '전면에 제시되는 색상 신호를 보고 빠르게 판단하고 움직이는 활동',
    defaultCueSeconds: 3,
    defaultRounds: 20,
    allowedCueSeconds: OFFICIAL_CUE_SECONDS,
    allowedRounds: OFFICIAL_ROUNDS,
    bgmEnabled: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '전신 반응, 색상 판단, 집중 전환',
  },
  {
    id: 'reaction-cognition-split-color-04',
    title: '반응인지 4번 · 2분할 색상 반응',
    category: '반응인지',
    type: 'split-color',
    engine: { mode: 'basic', level: 4 },
    description: '좌우 또는 상하로 나뉜 두 영역의 색상 신호를 보고 빠르게 선택 반응하는 활동',
    defaultCueSeconds: 3,
    defaultRounds: 20,
    allowedCueSeconds: OFFICIAL_CUE_SECONDS,
    allowedRounds: OFFICIAL_ROUNDS,
    bgmEnabled: true,
    bgmCategory: 'spomove-training',
    recommendedUse: '선택 반응, 양측 이동, 난이도 확장',
  },
] as const;

export function findOfficialSpomovePreset(id: string | null | undefined) {
  return OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === id) ?? null;
}

export function resolveCueSeconds(
  preset: OfficialSpomovePreset,
  value: string | null | undefined,
): OfficialCueSeconds {
  const parsed = Number(value);
  return preset.allowedCueSeconds.includes(parsed as OfficialCueSeconds)
    ? (parsed as OfficialCueSeconds)
    : preset.defaultCueSeconds;
}

export function resolveRounds(
  preset: OfficialSpomovePreset,
  value: string | null | undefined,
): OfficialRounds {
  const parsed = Number(value);
  return preset.allowedRounds.includes(parsed as OfficialRounds)
    ? (parsed as OfficialRounds)
    : preset.defaultRounds;
}

export function officialPresetSessionHref(input: {
  preset: OfficialSpomovePreset;
  cueSeconds: OfficialCueSeconds;
  rounds: OfficialRounds;
  bgmPath?: string;
  soundEnabled: boolean;
}) {
  const params = new URLSearchParams({
    preset: input.preset.id,
    cueSeconds: String(input.cueSeconds),
    rounds: String(input.rounds),
    sound: input.soundEnabled ? 'on' : 'off',
    mode: 'projector',
  });
  if (input.bgmPath) params.set('bgm', input.bgmPath);
  return `/spokedu-master/spomove/session?${params.toString()}`;
}

export function bgmDisplayName(path: string) {
  const fileName = path.split('/').pop() ?? path;
  return decodeURIComponent(fileName)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_+/g, ' ')
    .trim();
}
