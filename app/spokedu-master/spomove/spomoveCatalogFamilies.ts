import type { OfficialSpomovePreset, OfficialSpomoveProgramGroup } from './officialSpomovePresets';

export type SpomoveCatalogFamilyId =
  | 'signal-response'
  | 'conflict-choice'
  | 'sequence-memory'
  | 'dive-flow';

export type SpomoveCatalogFamily = {
  id: SpomoveCatalogFamilyId;
  name: string;
  description: string;
  programGroups: readonly OfficialSpomoveProgramGroup[];
};

export const SPOMOVE_CATALOG_FAMILIES: readonly SpomoveCatalogFamily[] = [
  {
    id: 'signal-response',
    name: '신호 반응',
    description: '화면에 나타난 색과 위치를 보고 정해진 방향으로 빠르게 움직이는 활동',
    programGroups: ['reaction-cognition', 'visual-reaction'],
  },
  {
    id: 'conflict-choice',
    name: '선택과 억제',
    description: '서로 다른 신호 사이에서 필요한 규칙을 골라 움직이는 활동',
    programGroups: ['simon', 'flanker', 'stroop'],
  },
  {
    id: 'sequence-memory',
    name: '순서 기억',
    description: '차례로 나타난 위치와 순서를 기억해 몸으로 다시 표현하는 활동',
    programGroups: ['sequential-memory'],
  },
  {
    id: 'dive-flow',
    name: 'DIVE',
    description: '연속해서 변하는 화면 신호를 따라 몸의 방향과 자세를 전환하는 활동',
    programGroups: ['dive', 'bonus'],
  },
] as const;

export function getSpomoveCatalogFamily(id: SpomoveCatalogFamilyId): SpomoveCatalogFamily {
  return SPOMOVE_CATALOG_FAMILIES.find((family) => family.id === id)!;
}

export function resolveSpomoveCatalogFamily(
  preset: Pick<OfficialSpomovePreset, 'programGroup'>,
): SpomoveCatalogFamily {
  return SPOMOVE_CATALOG_FAMILIES.find((family) => family.programGroups.includes(preset.programGroup))!;
}

export function filterPresetsByCatalogFamily(
  presets: readonly OfficialSpomovePreset[],
  familyId: SpomoveCatalogFamilyId | null,
): OfficialSpomovePreset[] {
  if (!familyId) return [...presets];
  const family = getSpomoveCatalogFamily(familyId);
  return presets.filter((preset) => family.programGroups.includes(preset.programGroup));
}
