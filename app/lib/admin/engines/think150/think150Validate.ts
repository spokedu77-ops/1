/**
 * validateThinkPlan - lib 분리
 * Overlay는 결과만 렌더
 */

import { PAD_GRID, PAD_POSITIONS, assertPadGridMatch } from '@/app/lib/admin/constants/padGrid';
import type { ThinkTimelineEvent, Think150Config } from './types';

export interface ValidateResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateThinkPlan(timeline: ThinkTimelineEvent[], config: Think150Config): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertPadGridMatch(PAD_POSITIONS);
  } catch (e) {
    errors.push(`PAD mapping: ${(e as Error).message}`);
  }

  const totalDuration = timeline.length > 0 ? Math.max(...timeline.map((e) => e.t1)) : 0;
  if (Math.abs(totalDuration - 150000) > 1) {
    errors.push(`segment duration 합 = ${totalDuration}ms (기대: 150000ms)`);
  }

  const cueEvents = timeline.filter((e) => e.frame === 'cue');
  const blankEvents = timeline.filter((e) => e.frame === 'blank');
  if (cueEvents.length !== blankEvents.length) {
    warnings.push(`cue(${cueEvents.length})/blank(${blankEvents.length}) 쌍 불일치`);
  }

  const stageCEvents = timeline.filter((e) => e.phase === 'stageC' && e.frame === 'cue');
  const setASwitch = stageCEvents.find(
    (e, i) => i > 0 && e.payload?.type === 'stageC' && (e.payload as { set?: string }).set === 'setB'
  );
  if (setASwitch) {
    const t = setASwitch.t0 - 76000;
    if (Math.abs(t - 30000) > 5000) {
      warnings.push(`setA/setB 전환 시점: elapsedInStageC=${t}ms (기대: ~30000ms)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
