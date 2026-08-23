import type { OfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import type { SpomovePresetContentOverride } from './spomoveOfficialAssets';
import {
  resolveSpomoveBriefingReadiness,
  type SpomoveBriefingReadiness,
} from './spomoveBriefingReadiness';

export type SpomoveBriefingCoverageRow = {
  presetId: string;
  displayTitle: string;
  programGroup: OfficialSpomovePreset['programGroup'];
  readiness: SpomoveBriefingReadiness;
  hasObjective: boolean;
  teachingPointsCount: number;
  hasInstruction: boolean;
  hasCoachScript: boolean;
  hasFocusTags: boolean;
  hasEasier: boolean;
  hasHarder: boolean;
  hasSuccessCriteria: boolean;
  hasCommonMistake: boolean;
};

export type SpomoveBriefingCoverageSummary = {
  activeCount: number;
  byReadiness: Record<SpomoveBriefingReadiness, number>;
  byProgramGroup: Record<string, Record<SpomoveBriefingReadiness, number>>;
  rows: SpomoveBriefingCoverageRow[];
};

function emptyReadinessCounts(): Record<SpomoveBriefingReadiness, number> {
  return { ready: 0, needsEditorial: 0, legacy: 0, missing: 0 };
}

/** Active catalog only (isHubListedPreset). Hold presets are excluded from the denominator. */
export function listActiveSpomoveCatalog(): OfficialSpomovePreset[] {
  return OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset);
}

export function buildSpomoveBriefingCoverage(
  contentMap: Record<string, SpomovePresetContentOverride | undefined>,
): SpomoveBriefingCoverageSummary {
  const active = listActiveSpomoveCatalog();
  const byReadiness = emptyReadinessCounts();
  const byProgramGroup: Record<string, Record<SpomoveBriefingReadiness, number>> = {};
  const rows: SpomoveBriefingCoverageRow[] = [];

  for (const preset of active) {
    const contentOverride = contentMap[preset.id];
    const { readiness } = resolveSpomoveBriefingReadiness({ preset, contentOverride });
    const guide = contentOverride?.movementGuide;
    byReadiness[readiness] += 1;
    if (!byProgramGroup[preset.programGroup]) {
      byProgramGroup[preset.programGroup] = emptyReadinessCounts();
    }
    byProgramGroup[preset.programGroup]![readiness] += 1;

    rows.push({
      presetId: preset.id,
      displayTitle: contentOverride?.displayTitle?.trim() || preset.title,
      programGroup: preset.programGroup,
      readiness,
      hasObjective: Boolean(guide?.objective?.trim()),
      teachingPointsCount: guide?.teachingPoints?.length ?? 0,
      hasInstruction: Boolean(guide?.instruction?.trim() || contentOverride?.activityMethod?.trim()),
      hasCoachScript: Boolean(guide?.coachScript?.trim()),
      hasFocusTags: Boolean(guide?.focusTags?.length),
      hasEasier: Boolean(guide?.easier?.trim()),
      hasHarder: Boolean(guide?.harder?.trim()),
      hasSuccessCriteria: Boolean(guide?.successCriteria?.trim()),
      hasCommonMistake: Boolean(guide?.commonMistake?.trim()),
    });
  }

  return {
    activeCount: active.length,
    byReadiness,
    byProgramGroup,
    rows,
  };
}
