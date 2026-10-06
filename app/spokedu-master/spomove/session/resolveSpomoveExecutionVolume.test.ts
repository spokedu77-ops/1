import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COLOR_SEQUENCE_RAMP_ROUNDS, MEMORY_ROUNDS } from '@/app/admin/spomove/training/_player/constants';
import { LEVEL4_QA_COUNT, LEVEL4_TOTAL } from '@/app/admin/spomove/training/_player/lib/resolveColorNumberMemoryMoveTarget';
import { OFFICIAL_SPOMOVE_LIBRARY, standardSpomoveDurationSec } from '../officialSpomovePresets';
import { isHubRunnablePreset } from '../movements/isHubVisiblePreset';
import { getActivityFamily } from '../movements/activityFamilies';
import { resolveOperationEngineCapabilities, resolveOperationLayer } from '../operations/operationResolve';
import {
  resolveSpomoveExecutionVolume,
  type SpomoveExecutionInterval,
  type SpomoveExecutionVolume,
} from './resolveSpomoveExecutionVolume';

function defaultInterval(preset: (typeof OFFICIAL_SPOMOVE_LIBRARY)[number]): SpomoveExecutionInterval | null {
  const family = preset.activityFamilyId ? getActivityFamily(preset.activityFamilyId) : null;
  if (!family) return null;
  const resolved = resolveOperationLayer({
    familyOperationProfileId: family.operationProfileId,
    presetOperationProfileId: preset.operationProfileId,
    recommendedOperation: preset.recommendedOperation,
    capabilities: resolveOperationEngineCapabilities(preset.engine.mode),
    activityFamilyId: preset.activityFamilyId,
  });
  const timing = resolved.effective.timing;
  return timing.pattern === 'interval'
    ? { workSeconds: timing.workSeconds, restSeconds: timing.restSeconds, sets: timing.sets }
    : null;
}

/** Independent of the resolver. Locks the pre-launch audit. */
function expectedVolume(
  preset: (typeof OFFICIAL_SPOMOVE_LIBRARY)[number],
  interval: SpomoveExecutionInterval | null,
): SpomoveExecutionVolume {
  const { mode, level } = preset.engine;
  const cue = preset.cueSeconds;
  const rounds = preset.rounds;
  const intervalApplies = Boolean(
    interval &&
      (mode === 'basic' || mode === 'flanker' || mode === 'stroop' || (mode === 'simon' && level !== 4 && level !== 5)),
  );
  if (interval && intervalApplies) {
    return {
      kind: 'interval',
      label: `${interval.sets}세트 · 운동 ${interval.workSeconds}초 · 휴식 ${interval.restSeconds}초`,
      count: interval.sets,
      durationSec: 0,
      interval,
    };
  }
  if (mode === 'simon' && level === 4) {
    const durationSec = standardSpomoveDurationSec(cue, rounds);
    return { kind: 'time', label: `${durationSec}초`, count: 0, durationSec, interval: null };
  }
  if (mode === 'simon' && level === 5) {
    const durationSec = Math.max(1, rounds) * 3;
    return { kind: 'time', label: `${durationSec}초`, count: 0, durationSec, interval: null };
  }
  if (mode === 'basic' || mode === 'simon' || mode === 'flanker' || mode === 'stroop') {
    return { kind: 'reps', label: `${rounds}회`, count: rounds, durationSec: 0, interval: null };
  }
  if (mode === 'reactTrain' && level === 10) {
    const includeBonus = preset.engine.goalkeeperBonusTimeEnabled ?? false;
    return {
      kind: 'time',
      label: includeBonus ? '60초 + 보너스 15초' : '60초',
      count: 0,
      durationSec: includeBonus ? 75 : 60,
      interval: null,
    };
  }
  if (mode === 'reactTrain') {
    const durationSec = standardSpomoveDurationSec(cue, rounds);
    return { kind: 'time', label: `${durationSec}초`, count: 0, durationSec, interval: null };
  }
  if (mode === 'spatial' && level === 7) {
    return { kind: 'rounds', label: `${rounds}라운드`, count: rounds, durationSec: 0, interval: null };
  }
  if (mode === 'spatial' && level === 4) {
    return {
      kind: 'builtIn',
      label: `색·번호 ${LEVEL4_TOTAL}개 + 퀴즈 ${LEVEL4_QA_COUNT}문항`,
      count: LEVEL4_TOTAL,
      durationSec: 0,
      interval: null,
    };
  }
  if (mode === 'spatial' && level === 3) {
    return { kind: 'rounds', label: `${COLOR_SEQUENCE_RAMP_ROUNDS}라운드`, count: COLOR_SEQUENCE_RAMP_ROUNDS, durationSec: 0, interval: null };
  }
  if (mode === 'spatial') {
    return { kind: 'rounds', label: `${MEMORY_ROUNDS}라운드`, count: MEMORY_ROUNDS, durationSec: 0, interval: null };
  }
  if (preset.id === 'dive-standard') {
    return {
      kind: 'stage',
      label: '5스테이지 · 스테이지당 20초 · 보너스 60초 · 운동 160초',
      count: 6,
      durationSec: 160,
      interval: null,
    };
  }
  if (preset.id === 'dive-color-gate-61') {
    return { kind: 'reps', label: '20회', count: 20, durationSec: 0, interval: null };
  }
  throw new Error(`no expected volume for ${preset.id}`);
}

describe('resolveSpomoveExecutionVolume', () => {
  const presets = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubRunnablePreset);

  it('classifies every public preset the same way the engine ends', () => {
    expect(presets).toHaveLength(72);
    const counts = { reps: 0, time: 0, rounds: 0, stage: 0, builtIn: 0, interval: 0 };
    for (const preset of presets) {
      const interval = defaultInterval(preset);
      const expected = expectedVolume(preset, interval);
      const actual = resolveSpomoveExecutionVolume({
        preset,
        cueSeconds: preset.cueSeconds,
        interval,
        diveEnvironmentTheme: 'space',
        flowDurationSec: preset.engine.flowDuration,
        flowIncludeBonus: preset.engine.flowIncludeBonus,
        sportsArenaFeatures: [],
      });
      expect(actual, preset.id).toEqual(expected);
      const startLine = `실행 분량 ${actual.label}`;
      expect(startLine).toContain(expected.label);
      expect(actual.label).toBe(expected.label);
      counts[actual.kind] += 1;
    }
    expect(counts).toEqual({ reps: 53, time: 11, rounds: 5, stage: 1, builtIn: 1, interval: 1 });
    expect(counts.stage + counts.builtIn).toBe(2);
  });

  it('locks the six representative volumes', () => {
    const byId = new Map(presets.map((preset) => [preset.id, preset]));
    const volume = (id: string) => {
      const preset = byId.get(id);
      if (!preset) throw new Error(id);
      return resolveSpomoveExecutionVolume({
        preset,
        cueSeconds: preset.cueSeconds,
        interval: defaultInterval(preset),
        diveEnvironmentTheme: 'space',
        flowDurationSec: preset.engine.flowDuration,
        flowIncludeBonus: preset.engine.flowIncludeBonus,
        sportsArenaFeatures: [],
      }).label;
    };
    expect(volume('reaction-cognition-space-direction-01')).toBe('20회');
    expect(volume('visual-reaction-goalkeeper-42')).toBe('60초 + 보너스 15초');
    expect(volume('visual-reaction-goalkeeper-easy-skeleton')).toBe('60초 + 보너스 15초');
    expect(volume('simon-balloon-hard-skeleton')).toBe('60초');
    expect(volume('sequential-memory-10color-52')).toBe('5라운드');
    expect(volume('sequential-memory-full-reveal-54')).toBe('10라운드');
    expect(volume('dive-standard')).toBe('5스테이지 · 스테이지당 20초 · 보너스 60초 · 운동 160초');
    expect(volume('dive-color-gate-61')).toBe('20회');
  });

  it('wires Start and Result to the same resolver label', () => {
    const page = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/session/page.tsx'), 'utf8');
    const start = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/session/StartBriefing.tsx'), 'utf8');
    const result = readFileSync(join(process.cwd(), 'app/spokedu-master/spomove/session/MasterSessionResult.tsx'), 'utf8');
    expect(page).toContain('resolveSpomoveExecutionVolume');
    expect(page).toContain('executionVolume={executionVolume!}');
    expect(start).toContain('data-spm-execution-volume={executionVolume.label}');
    expect(start).not.toContain('SPOMAT ${matCount}장 · 자극 ${cueSeconds}초');
    expect(result).not.toContain('rounds * cueSeconds');
    expect(result).not.toContain("timeMode: intervalMode ? 'interval' : 'time'");
    expect(result).toContain('volumeLabel={executionVolume.label}');
  });
});
