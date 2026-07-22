/**
 * SPOMOVE Family Audit — Signature helpers (Commit B).
 * Signature = 후보 그룹 보조값. 최종 Catalog Family 판정 아님.
 */
import type { OfficialSpomoveEngineMode, OfficialSpomovePreset } from '../officialSpomovePresets';

export const SIGNATURE_VERSION = 'v1' as const;

/** mode·level 제외 Engine option 키 (전체 목록 — runtime options JSON용) */
const ENGINE_OPTION_KEYS = [
  'variantColorTheme',
  'bodyLabelMode',
  'hideBodyLabelModeControls',
  'spatialArrowColorMode',
  'spatialArrowColorMapping',
  'reactTrainConcurrent',
  'moleLookMode',
  'numberCartTier',
  'colorTrackerTier',
  'goalkeeperTier',
  'colorTrackerDualPanel',
  'flowFeatures',
  'flowDuration',
  'flowLayout',
  'flowIncludeBonus',
  'flankerStimulusType',
  'flankerNestedCircleCount',
  'camouflagePlacement',
] as const;

/**
 * Mechanic: Theme·cue·rounds·순수 자산 표현 제외.
 * mode별 판단 규칙에 영향을 주는 키만.
 */
export const MECHANIC_KEYS_BY_MODE: Record<OfficialSpomoveEngineMode, readonly string[]> = {
  basic: ['spatialArrowColorMode', 'spatialArrowColorMapping', 'bodyLabelMode', 'hideBodyLabelModeControls'],
  reactTrain: [
    'reactTrainConcurrent',
    'moleLookMode',
    'numberCartTier',
    'colorTrackerTier',
    'goalkeeperTier',
    'colorTrackerDualPanel',
    'camouflagePlacement',
  ],
  simon: [],
  flanker: ['flankerStimulusType', 'flankerNestedCircleCount'],
  stroop: [],
  spatial: [],
  flow: ['flowFeatures', 'flowLayout', 'flowIncludeBonus', 'flowDuration'],
};

export type AuditSignatures = {
  runtimeSignature: string;
  mechanicSignature: string;
  themeSignature: string;
  stageSignature: string;
};

export type MechanicPolicyWarning = {
  mode: string;
  message: string;
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

export function normalizeEngineOptions(engine: OfficialSpomovePreset['engine']): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ENGINE_OPTION_KEYS) {
    const raw = engine[key as keyof typeof engine];
    if (raw === undefined || raw === null) continue;
    out[key] = raw;
  }
  return out;
}

export function resolveAuditTheme(preset: OfficialSpomovePreset): string {
  return preset.engine.variantColorTheme ?? 'none';
}

export function buildRuntimeSignature(preset: OfficialSpomovePreset): string {
  const options = normalizeEngineOptions(preset.engine);
  const theme = resolveAuditTheme(preset);
  const payload = {
    mode: preset.engine.mode,
    level: preset.engine.level,
    options,
    theme,
    rounds: preset.rounds,
    cueSeconds: preset.cueSeconds,
  };
  return `${SIGNATURE_VERSION}|${stableStringify(payload)}`;
}

export function pickMechanicOptions(
  engine: OfficialSpomovePreset['engine'],
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = engine[key as keyof typeof engine];
    if (raw === undefined || raw === null) continue;
    out[key] = raw;
  }
  return out;
}

export function buildMechanicSignature(
  preset: OfficialSpomovePreset,
  warnings: MechanicPolicyWarning[],
): string {
  const mode = preset.engine.mode;
  const keys = MECHANIC_KEYS_BY_MODE[mode];
  if (keys === undefined) {
    warnings.push({
      mode,
      message: `[WARN] mechanic key policy missing: mode=${mode}`,
    });
    return `${SIGNATURE_VERSION}|mode=${mode}|policy=missing`;
  }
  const options = pickMechanicOptions(preset.engine, keys);
  const payload = {
    mode,
    // level은 Stage 후보에도 들어가지만, 일부 mode는 level이 판단 규칙 자체를 바꿈 → mechanic에 포함
    level: preset.engine.level,
    options,
  };
  return `${SIGNATURE_VERSION}|${stableStringify(payload)}`;
}

export function buildThemeSignature(preset: OfficialSpomovePreset): string {
  return `${SIGNATURE_VERSION}|theme=${resolveAuditTheme(preset)}`;
}

export function buildStageSignature(preset: OfficialSpomovePreset): string {
  const engine = preset.engine;
  const payload: Record<string, unknown> = {
    level: engine.level,
    rounds: preset.rounds,
    cueSeconds: preset.cueSeconds,
  };
  if (engine.reactTrainConcurrent !== undefined) payload.reactTrainConcurrent = engine.reactTrainConcurrent;
  if (engine.numberCartTier !== undefined) payload.numberCartTier = engine.numberCartTier;
  if (engine.colorTrackerTier !== undefined) payload.colorTrackerTier = engine.colorTrackerTier;
  if (engine.goalkeeperTier !== undefined) payload.goalkeeperTier = engine.goalkeeperTier;
  if (engine.flowDuration !== undefined) payload.flowDuration = engine.flowDuration;
  if (engine.flowIncludeBonus !== undefined) payload.flowIncludeBonus = engine.flowIncludeBonus;
  if (engine.bodyLabelMode !== undefined) payload.bodyLabelMode = engine.bodyLabelMode;
  return `${SIGNATURE_VERSION}|${stableStringify(payload)}`;
}

export function buildAuditSignatures(
  preset: OfficialSpomovePreset,
  warnings: MechanicPolicyWarning[],
): AuditSignatures {
  return {
    runtimeSignature: buildRuntimeSignature(preset),
    mechanicSignature: buildMechanicSignature(preset, warnings),
    themeSignature: buildThemeSignature(preset),
    stageSignature: buildStageSignature(preset),
  };
}
