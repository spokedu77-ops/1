import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

/**
 * Layer A — semantic execution contract only (no title/description/BGM/sortOrder).
 */
export type SpomoveGuideSemanticSnapshot = {
  presetId: string;
  programGroup: OfficialSpomovePreset['programGroup'];
  catalogStatus: 'active' | 'hold';
  engine: {
    mode: OfficialSpomovePreset['engine']['mode'];
    level: number;
    variantColorTheme?: string;
    bodyLabelMode?: string;
    hideBodyLabelModeControls?: boolean;
    spatialArrowColorMode?: string;
    spatialArrowColorMapping?: string;
    reactTrainConcurrent?: number;
    moleLookMode?: string;
    numberCartTier?: number;
    colorTrackerTier?: number;
    handFootDifficulty?: string;
    goalkeeperTier?: number;
    simonPoleCount?: number;
    colorTrackerDualPanel?: boolean;
    flowFeatures?: string[];
    flowDuration?: number;
    flowLayout?: string;
    flowIncludeBonus?: boolean;
    flankerStimulusType?: string;
    flankerNestedCircleCount?: number;
    flankerExtremeMode?: string;
    flankerArrowMode?: string;
    camouflagePlacement?: string;
    stroopWordMode?: string;
  };
  cueSeconds: number;
  rounds: number;
  activityFamilyId?: string;
  movementProfileId?: string;
};

export function buildSpomoveGuideSemanticSnapshot(
  preset: OfficialSpomovePreset,
): SpomoveGuideSemanticSnapshot {
  const e = preset.engine;
  const engine: SpomoveGuideSemanticSnapshot['engine'] = {
    mode: e.mode,
    level: e.level,
  };
  if (e.variantColorTheme !== undefined) engine.variantColorTheme = e.variantColorTheme;
  if (e.bodyLabelMode !== undefined) engine.bodyLabelMode = e.bodyLabelMode;
  if (e.hideBodyLabelModeControls !== undefined) {
    engine.hideBodyLabelModeControls = e.hideBodyLabelModeControls;
  }
  if (e.spatialArrowColorMode !== undefined) engine.spatialArrowColorMode = e.spatialArrowColorMode;
  if (e.spatialArrowColorMapping !== undefined) {
    engine.spatialArrowColorMapping = e.spatialArrowColorMapping;
  }
  if (e.reactTrainConcurrent !== undefined) engine.reactTrainConcurrent = e.reactTrainConcurrent;
  if (e.moleLookMode !== undefined) engine.moleLookMode = e.moleLookMode;
  if (e.numberCartTier !== undefined) engine.numberCartTier = e.numberCartTier;
  if (e.colorTrackerTier !== undefined) engine.colorTrackerTier = e.colorTrackerTier;
  if (e.handFootDifficulty !== undefined) engine.handFootDifficulty = e.handFootDifficulty;
  if (e.goalkeeperTier !== undefined) engine.goalkeeperTier = e.goalkeeperTier;
  if (e.simonPoleCount !== undefined) engine.simonPoleCount = e.simonPoleCount;
  if (e.colorTrackerDualPanel !== undefined) engine.colorTrackerDualPanel = e.colorTrackerDualPanel;
  if (e.flowFeatures !== undefined) engine.flowFeatures = [...e.flowFeatures].sort();
  if (e.flowDuration !== undefined) engine.flowDuration = e.flowDuration;
  if (e.flowLayout !== undefined) engine.flowLayout = e.flowLayout;
  if (e.flowIncludeBonus !== undefined) engine.flowIncludeBonus = e.flowIncludeBonus;
  if (e.flankerStimulusType !== undefined) engine.flankerStimulusType = e.flankerStimulusType;
  if (e.flankerNestedCircleCount !== undefined) {
    engine.flankerNestedCircleCount = e.flankerNestedCircleCount;
  }
  if (e.flankerExtremeMode !== undefined) engine.flankerExtremeMode = e.flankerExtremeMode;
  if (e.flankerArrowMode !== undefined) engine.flankerArrowMode = e.flankerArrowMode;
  if (e.camouflagePlacement !== undefined) engine.camouflagePlacement = e.camouflagePlacement;
  if (e.stroopWordMode !== undefined) engine.stroopWordMode = e.stroopWordMode;

  const snap: SpomoveGuideSemanticSnapshot = {
    presetId: preset.id,
    programGroup: preset.programGroup,
    catalogStatus: preset.catalogStatus === 'hold' ? 'hold' : 'active',
    engine,
    cueSeconds: preset.cueSeconds,
    rounds: preset.rounds,
  };
  if (preset.activityFamilyId) snap.activityFamilyId = preset.activityFamilyId;
  if (preset.movementProfileId) snap.movementProfileId = preset.movementProfileId;
  return snap;
}
