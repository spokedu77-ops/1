/**
 * SPOMOVE MASTER 공개 72개 공식 카탈로그 순서 (SSOT).
 *
 * Core/Expansion 선언 위치·개별 sortOrder·CMS contentOverride.sortOrder·
 * 제목 가나다·인지축(axis)은 이 순서를 덮어쓰지 않는다.
 *
 * HOLD(3분할·랜덤분할·흰 공 찾기 등)는 이 목록에 포함하지 않는다.
 *
 * Note: 이 파일은 officialSpomovePresets를 import하지 않는다 (순환 참조 방지).
 */

export const SPOMOVE_PUBLIC_PROGRAM_GROUP_ORDER = [
  'reaction-cognition',
  'visual-reaction',
  'simon',
  'flanker',
  'stroop',
  'sequential-memory',
  'dive',
] as const;

export type SpomovePublicProgramGroup = (typeof SPOMOVE_PUBLIC_PROGRAM_GROUP_ORDER)[number];

type CatalogOrderablePreset = {
  id: string;
  programGroup: string;
  sortOrder: number;
};

export const SPOMOVE_PUBLIC_CATALOG_ORDER = {
  'reaction-cognition': [
    // 공간방향 자극
    'reaction-cognition-space-direction-01',
    'reaction-cognition-space-direction-color-01b',
    // 4분할 자극 — 색상→과일→동물→음식→자연→탈 것→믹스
    'reaction-cognition-quad-color-02',
    'reaction-cognition-quad-fruit-10',
    'reaction-cognition-l2-animal-exp',
    'reaction-cognition-l2-food-exp',
    'reaction-cognition-l2-nature-exp',
    'reaction-cognition-l2-vehicle-exp',
    'reaction-cognition-l2-mix-exp',
    // 전면단일 자극
    'reaction-cognition-full-color-03',
    'reaction-cognition-l3-fruit-exp',
    'reaction-cognition-full-animal-18',
    'reaction-cognition-l3-food-exp',
    'reaction-cognition-full-nature-19',
    'reaction-cognition-l3-vehicle-exp',
    'reaction-cognition-l3-mix-exp',
    // 2분할 자극
    'reaction-cognition-split-color-04',
    'reaction-cognition-l4-fruit-exp',
    'reaction-cognition-l4-animal-exp',
    'reaction-cognition-l4-food-exp',
    'reaction-cognition-l4-nature-exp',
    'reaction-cognition-l4-vehicle-exp',
    'reaction-cognition-l4-mix-exp',
  ],
  'visual-reaction': [
    'visual-reaction-flash-33',
    'visual-reaction-rush-39',
    'visual-reaction-flow-2x-31',
    'visual-reaction-mole-l1',
    'visual-reaction-mole-normal-skeleton',
    'visual-reaction-goalkeeper-easy-skeleton',
    'visual-reaction-goalkeeper-42',
    'visual-reaction-hand-foot-easy-skeleton',
    'visual-reaction-hand-foot-normal-skeleton',
    'visual-reaction-hand-foot-hard-skeleton',
  ],
  simon: [
    'simon-pole-arrows-41',
    'simon-arrow-hard-skeleton',
    'simon-pole-shape-06',
    'simon-shape-hard-skeleton',
    'simon-balloon-flash-05',
    'simon-balloon-hard-skeleton',
    'simon-mixed-gallery-exp',
    'simon-random-hard-skeleton',
    'simon-camouflage-center-skeleton',
    'visual-reaction-blackout-37',
  ],
  flanker: [
    // 화살표
    'flanker-uniform-07',
    'flanker-arrow-udlr-exp',
    // 랜덤 자극 — 색상→과일→동물→음식→자연→탈 것→믹스
    'flanker-theme-color-skeleton',
    'flanker-theme-06',
    'flanker-theme-animal-skeleton',
    'flanker-theme-food-skeleton',
    'flanker-theme-nature-skeleton',
    'flanker-theme-vehicle-skeleton',
    'flanker-theme-mix-skeleton',
    // 극단 — 테마 7 + 화살표 어려움
    'flanker-nested-circles-04',
    'flanker-random-43',
    'flanker-5circle-46',
    'flanker-arrow-05',
    'flanker-uniform-number-exp',
    'flanker-random-number-exp',
    'flanker-5circle-number-exp',
    'flanker-extreme-arrow-hard-skeleton',
  ],
  stroop: [
    'stroop-arrow-reverse-08',
    'stroop-arrow-bg-47',
    'stroop-word-reverse-48',
    'stroop-word-bg-49',
  ],
  'sequential-memory': [
    'sequential-memory-3color-09',
    'sequential-memory-5color-51',
    'sequential-memory-10color-52',
    'sequential-memory-custom-10color-exp',
    'sequential-memory-color-number-exp',
    'sequential-memory-full-reveal-54',
  ],
  dive: ['dive-standard', 'dive-color-gate-61'],
} as const satisfies Record<SpomovePublicProgramGroup, readonly string[]>;

/** Flat public catalog: group order × within-group order (72 IDs). */
export const SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER: readonly string[] =
  SPOMOVE_PUBLIC_PROGRAM_GROUP_ORDER.flatMap((group) => [...SPOMOVE_PUBLIC_CATALOG_ORDER[group]]);

const PUBLIC_CATALOG_RANK = new Map<string, number>(
  SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER.map((id, index) => [id, index]),
);

const PROGRAM_GROUP_RANK = new Map<string, number>(
  SPOMOVE_PUBLIC_PROGRAM_GROUP_ORDER.map((group, index) => [group, index]),
);

export function getPublicCatalogRank(presetId: string): number | null {
  const rank = PUBLIC_CATALOG_RANK.get(presetId);
  return rank === undefined ? null : rank;
}

export function comparePresetsByPublicCatalogOrder(
  a: CatalogOrderablePreset,
  b: CatalogOrderablePreset,
): number {
  const rankA = getPublicCatalogRank(a.id);
  const rankB = getPublicCatalogRank(b.id);
  if (rankA !== null && rankB !== null) return rankA - rankB;
  if (rankA !== null) return -1;
  if (rankB !== null) return 1;

  const groupA = PROGRAM_GROUP_RANK.get(a.programGroup) ?? 999;
  const groupB = PROGRAM_GROUP_RANK.get(b.programGroup) ?? 999;
  if (groupA !== groupB) return groupA - groupB;
  return a.sortOrder - b.sortOrder || a.id.localeCompare(b.id);
}

export function sortPresetsByPublicCatalogOrder<T extends CatalogOrderablePreset>(
  presets: readonly T[],
): T[] {
  return [...presets].sort(comparePresetsByPublicCatalogOrder);
}

/**
 * Rebuild library array so public presets follow SPOMOVE_PUBLIC_CATALOG_ORDER.
 * HOLD / unmatched presets stay after their program group's public slots (stable relative order).
 */
export function withPublicCatalogOrder<T extends CatalogOrderablePreset>(presets: T[]): T[] {
  const byId = new Map(presets.map((preset) => [preset.id, preset]));
  const used = new Set<string>();
  const result: T[] = [];

  for (const group of SPOMOVE_PUBLIC_PROGRAM_GROUP_ORDER) {
    for (const id of SPOMOVE_PUBLIC_CATALOG_ORDER[group]) {
      const preset = byId.get(id);
      if (!preset) continue;
      result.push(preset);
      used.add(id);
    }
    for (const preset of presets) {
      if (preset.programGroup !== group || used.has(preset.id)) continue;
      result.push(preset);
      used.add(preset.id);
    }
  }

  for (const preset of presets) {
    if (used.has(preset.id)) continue;
    result.push(preset);
  }

  return result;
}
