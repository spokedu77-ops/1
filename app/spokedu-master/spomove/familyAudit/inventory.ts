/**
 * SPOMOVE Family Audit — inventory rows + CSV (Commit B).
 * 사람 판정 열 없음. generated.csv 전용.
 */
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import {
  buildAuditSignatures,
  normalizeEngineOptions,
  resolveAuditTheme,
  type MechanicPolicyWarning,
} from './signatures';

export const GENERATED_CSV_HEADER =
  'sortOrder,presetId,title,programGroup,axis,engineMode,engineLevel,engineOptionsJson,activityFamilyId,movementProfileId,theme,rounds,cueSeconds,isReady,description,recommendedUse,runtimeSignature,mechanicSignature,themeSignature,stageSignature';

export type FamilyAuditRow = {
  sortOrder: number;
  presetId: string;
  title: string;
  programGroup: string;
  axis: string;
  engineMode: string;
  engineLevel: number;
  engineOptionsJson: string;
  activityFamilyId: string;
  movementProfileId: string;
  theme: string;
  rounds: number;
  cueSeconds: number;
  isReady: boolean;
  description: string;
  recommendedUse: string;
  runtimeSignature: string;
  mechanicSignature: string;
  themeSignature: string;
  stageSignature: string;
};

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowToCsvLine(row: FamilyAuditRow): string {
  const cells: string[] = [
    String(row.sortOrder),
    row.presetId,
    row.title,
    row.programGroup,
    row.axis,
    row.engineMode,
    String(row.engineLevel),
    row.engineOptionsJson,
    row.activityFamilyId,
    row.movementProfileId,
    row.theme,
    String(row.rounds),
    String(row.cueSeconds),
    row.isReady ? 'true' : 'false',
    row.description,
    row.recommendedUse,
    row.runtimeSignature,
    row.mechanicSignature,
    row.themeSignature,
    row.stageSignature,
  ];
  return cells.map(csvEscape).join(',');
}

export function rowsToCsv(rows: FamilyAuditRow[]): string {
  const lines = [GENERATED_CSV_HEADER, ...rows.map(rowToCsvLine)];
  return `${lines.join('\n')}\n`;
}

export function presetToAuditRow(
  preset: OfficialSpomovePreset,
  warnings: MechanicPolicyWarning[],
): FamilyAuditRow {
  const options = normalizeEngineOptions(preset.engine);
  const signatures = buildAuditSignatures(preset, warnings);
  return {
    sortOrder: preset.sortOrder,
    presetId: preset.id,
    title: preset.title,
    programGroup: preset.programGroup,
    axis: preset.axis,
    engineMode: preset.engine.mode,
    engineLevel: preset.engine.level,
    engineOptionsJson: JSON.stringify(options),
    activityFamilyId: preset.activityFamilyId ?? '',
    movementProfileId: preset.movementProfileId ?? '',
    theme: resolveAuditTheme(preset),
    rounds: preset.rounds,
    cueSeconds: preset.cueSeconds,
    isReady: preset.isReady,
    description: preset.description,
    recommendedUse: preset.recommendedUse,
    ...signatures,
  };
}

export function buildFamilyAuditRows(
  library: readonly OfficialSpomovePreset[],
  warnings: MechanicPolicyWarning[],
): FamilyAuditRow[] {
  const rows = library.map((preset) => presetToAuditRow(preset, warnings));
  rows.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.presetId.localeCompare(b.presetId);
  });
  return rows;
}
