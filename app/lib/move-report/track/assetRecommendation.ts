import type { DisplayDirection } from './learningLoop';

export type SpecialPeAssetStage = 'foundation' | 'generalize' | 'challenge' | 'transfer';

export type SpecialPeAsset = {
  map_id: number;
  primary_skill: string;
  stage: SpecialPeAssetStage;
  source_type: 'master' | 'personal';
  level_min: number;
  level_max: number;
  priority: number;
  adaptation_note: string | null;
  title: string;
  url: string | null;
  thumbnail_url: string | null;
  equipment: string[] | null;
  source_label: string | null;
  variation_method: string | null;
  curriculum_id: number | null;
  personal_curriculum_id: number | null;
};

const STAGE_ORDER: Record<DisplayDirection, SpecialPeAssetStage[]> = {
  adjust: ['foundation', 'generalize', 'challenge', 'transfer'],
  generalize: ['generalize', 'foundation', 'challenge', 'transfer'],
  advance: ['challenge', 'generalize', 'transfer', 'foundation'],
  transfer: ['transfer', 'challenge', 'generalize', 'foundation'],
};

export function rankSpecialPeAssets(
  assets: SpecialPeAsset[],
  input: { level: number; direction: DisplayDirection; limit?: number },
): SpecialPeAsset[] {
  const stageOrder = STAGE_ORDER[input.direction];
  const limit = input.limit ?? 3;

  return [...assets]
    .filter((asset) => asset.title && asset.level_min <= asset.level_max)
    .sort((a, b) => {
      const aLevelMatch = input.level >= a.level_min && input.level <= a.level_max ? 0 : 1;
      const bLevelMatch = input.level >= b.level_min && input.level <= b.level_max ? 0 : 1;
      if (aLevelMatch !== bLevelMatch) return aLevelMatch - bLevelMatch;

      const aStage = stageOrder.indexOf(a.stage);
      const bStage = stageOrder.indexOf(b.stage);
      if (aStage !== bStage) return aStage - bStage;

      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.map_id - b.map_id;
    })
    .slice(0, limit);
}
