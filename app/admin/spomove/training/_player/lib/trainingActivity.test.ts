import { describe, expect, it } from 'vitest';
import { catalogTrainingActivity, resolveTrainingActivity, resolveTrainingSelection, resolveCatalogTrainingSelection, TRAINING_ACTIVITIES, trainingActivityForLevelChange, type TrainingActivityId } from './trainingActivity';
import { MODES, normalizeLegacyTrainingMode, resolveTrainingEngine } from '../constants';
import { OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { trainingActivityGuide } from './trainingActivityGuide';
import { settingsToExitResume } from './trainingLaunchSnapshot';
import { resultLevelLabel, settingsToTrainingResultConfig } from './trainingResultSummary';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';

describe('activity identity across legacy and catalog boundaries', () => {
  it.each([7, 8, 9, 10])('preserves legacy basic engine level %s', level => {
    expect(resolveTrainingActivity('basic', level, {})).toBe('hand-foot');
  });

  it.each([
    [7, 'relative-compass'],
    [8, 'shape-completion'],
  ] as const)('keeps catalog activity %s through repeated exit/restart and results', (level, activityId) => {
    let id: TrainingActivityId = catalogTrainingActivity('basic', level);
    for (let cycle = 0; cycle < 3; cycle++) {
      const resume = settingsToExitResume({
        mode: 'basic', level, activityId: id, timeMode: 'reps',
        duration: 60, targetReps: 10, flowFeatures: new Set(), sportsArenaFeatures: new Set(),
        relativeCompassDifficulty: 'hard', relativeCompassStartSeconds: 4, relativeCompassResponseSeconds: 5,
        shapeCompletionDifficulty: 'easy', shapeCompletionResponseSeconds: 6,
      });
      // New callers need only the stable identity, without legacy boolean flags.
      const { relativeCompassEnabled: _relative, shapeCompletionEnabled: _shape, ...launch } = resume.launch;
      id = resolveTrainingActivity('basic', resume.levelId, JSON.parse(JSON.stringify(launch)));
      expect(id).toBe(activityId);
      expect(resultLevelLabel('basic', level, id)).toBe(`${level}번`);
      expect(launch).toMatchObject({
        relativeCompassDifficulty: 'hard', relativeCompassStartSeconds: 4, relativeCompassResponseSeconds: 5,
        shapeCompletionDifficulty: 'easy', shapeCompletionResponseSeconds: 6,
      });
      const result = settingsToTrainingResultConfig({
        mode: 'basic', level, activityId: id, timeMode: 'reps', duration: 60, targetReps: 10,
      });
      const rich = resolveTrainingResultRichContent(result, 12000, null, { programTitle: '교사가 바꾼 이름' });
      expect(rich.programTitle).toBe(activityId === 'relative-compass' ? '내 자리에서 방향 따라가기' : '맞는 조각 찾아가기');
    }
  });

  it('accepts old launch flags only at the compatibility boundary', () => {
    expect(resolveTrainingActivity('basic', 7, { relativeCompassEnabled: true })).toBe('relative-compass');
    expect(resolveTrainingActivity('basic', 8, { shapeCompletionEnabled: true })).toBe('shape-completion');
    expect(resolveTrainingActivity('basic', 8, { relativeCompassEnabled: true, shapeCompletionEnabled: true })).toBe('shape-completion');
    expect(resolveTrainingActivity('basic', 7, { activityId: 'hand-foot', relativeCompassEnabled: true })).toBe('hand-foot');
    expect(resolveTrainingActivity('basic', 7, {}, 'relative-compass')).toBe('relative-compass');
    expect(resolveTrainingActivity('basic', 7, { relativeCompassEnabled: false }, 'relative-compass')).toBe('hand-foot');
  });

  it('does not carry a special activity into another mode or engine level', () => {
    expect(() => resolveTrainingActivity('reactTrain', 7, { activityId: 'relative-compass' })).toThrow();
    expect(() => resolveTrainingActivity('basic', 8, { activityId: 'relative-compass' })).toThrow();
    expect(resolveTrainingActivity('reactTrain', 7)).toBe('wormhole');
    expect(catalogTrainingActivity('basic', 1)).toBe('direction-cue');
  });

  it('does not infer a new activity from a result title on a legacy engine run', () => {
    const rich = resolveTrainingResultRichContent({
      mode: 'basic', level: 7, activityId: 'hand-foot', timeMode: 'reps', duration: 60, targetReps: 10,
    }, 12000, null, { programTitle: '내 자리에서 방향 따라가기' });
    expect(rich.coachTip).not.toContain('돌아오지 않습니다');
  });

  it('snapshots all launch options without sharing mutable collections', () => {
    const settings = {
      mode: 'basic', level: 7, activityId: 'relative-compass' as const, timeMode: 'reps',
      flowFeatures: new Set(['colorGate']), sportsArenaFeatures: new Set<never>(),
      basicNumberOverlay: '3' as const, spatialArrowColorMode: 'color' as const,
      memoryColorSlots: ['red', 'blue'] as ('red' | 'blue')[],
    };
    const resume = settingsToExitResume(settings);
    settings.memoryColorSlots[0] = 'blue';
    settings.flowFeatures.clear();
    expect(resume.launch).toMatchObject({
      activityId: 'relative-compass', relativeCompassEnabled: true, shapeCompletionEnabled: false,
      basicNumberOverlay: '3', spatialArrowColorMode: 'color',
      flowFeatures: ['colorGate'], memoryColorSlots: ['red', 'blue'],
    });
    expect(resume.launch).not.toHaveProperty('mode');
    expect(resume.launch).not.toHaveProperty('level');
  });
});

describe('whole-program identity contract', () => {
  it('has one legacy identity per address, with explicit-only catalog additions isolated', () => {
    const addresses = new Set<string>();
    for (const id of Object.keys(TRAINING_ACTIVITIES) as TrainingActivityId[]) {
      const definition = TRAINING_ACTIVITIES[id];
      if ('explicitOnly' in definition && definition.explicitOnly) continue;
      for (const route of definition.routes) {
        for (const level of route.levels) {
          const key = `${route.mode}:${level}`;
          expect(addresses.has(key)).toBe(false);
          addresses.add(key);
          expect(resolveTrainingActivity(route.mode, level)).toBe(id);
        }
      }
    }
  });
  it('registers every catalog entry and resolves its authored engine address', () => {
    for (const mode of Object.values(MODES)) {
      for (const level of mode.levels) {
        const selected = resolveCatalogTrainingSelection(mode.id, level.id);
        expect(selected.catalogMode).toBe(mode.id);
        expect(selected.catalogLevel).toBe(level.id);
      }
    }
  });

  it('preserves all published preset identities without changing engine semantics', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY.length).toBeGreaterThan(0);
    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      const selection = resolveTrainingSelection(preset.engine.mode, preset.engine.level, { activityId: preset.activityId });
      expect(preset.activityId).toBe(selection.activityId);
      expect({ engineMode: selection.engineMode, engineLevel: selection.engineLevel })
        .toEqual(resolveTrainingEngine(preset.engine.mode, preset.engine.level));
    }
  });

  it('keeps runtime and guides stable when catalog display order changes', () => {
    const original = MODES.reactTrain!.levels;
    const before = original.map(level => resolveCatalogTrainingSelection('reactTrain', level.id));
    try {
      MODES.reactTrain!.levels = [...original].reverse();
      for (const previous of before) {
        const next = resolveCatalogTrainingSelection('reactTrain', previous.catalogLevel!);
        expect(next.activityId).toBe(previous.activityId);
        expect(next.runtime).toBe(previous.runtime);
        expect({ engineMode: next.engineMode, engineLevel: next.engineLevel })
          .toEqual({ engineMode: previous.engineMode, engineLevel: previous.engineLevel });
      }
      expect(trainingActivityGuide('reactTrain', 201)?.name).toBe('손 따로, 발 따로');
    } finally {
      MODES.reactTrain!.levels = original;
    }
  });

  it('round-trips every registered address, including all legacy aliases', () => {
    for (const id of Object.keys(TRAINING_ACTIVITIES) as TrainingActivityId[]) {
      for (const route of TRAINING_ACTIVITIES[id].routes) {
        for (const level of route.levels) {
          let selection = resolveTrainingSelection(route.mode, level, { activityId: id });
          for (let cycle = 0; cycle < 3; cycle++) {
            const resume = settingsToExitResume({
              mode: route.mode, level, activityId: selection.activityId, timeMode: 'reps',
              flowFeatures: new Set(), sportsArenaFeatures: new Set(),
            });
            selection = resolveTrainingSelection(resume.modeId, resume.levelId, JSON.parse(JSON.stringify(resume.launch)));
            expect(selection.activityId).toBe(id);
            expect({ engineMode: selection.engineMode, engineLevel: selection.engineLevel })
              .toEqual(resolveTrainingEngine(route.mode, level));
          }
        }
      }
    }
  });

  it('keeps hand-foot, wormhole and relative compass separate at the same number', () => {
    expect(resolveTrainingSelection('reactTrain', 201).runtime).toBe('signals');
    expect(resolveTrainingSelection('reactTrain', 201).engineMode).toBe('basic');
    expect(resolveTrainingSelection('reactTrain', 7).runtime).toBe('wormhole');
    expect(resolveTrainingSelection('basic', 7, { activityId: 'relative-compass' }).runtime).toBe('relative-compass');
    expect(trainingActivityGuide('reactTrain', 201)?.name).toBe('손 따로, 발 따로');
    expect(trainingActivityGuide('basic', 7, { activityId: 'relative-compass' })?.name).toBe('내 자리에서 방향 따라가기');
    expect(trainingActivityGuide('reactTrain', 7)).toBeUndefined();
  });

  it('preserves memory sublevels and normalizes cross-mode legacy addresses', () => {
    expect(trainingActivityForLevelChange('spatial', 6, 'sequence-memory')).toBe('sequence-memory');
    expect(trainingActivityForLevelChange('spatial', 5, 'color-number-memory')).toBe('color-number-quiz');
    expect(resolveTrainingSelection('reactTrain', 12).activityId).toBe('instant-memory');
    expect(resolveTrainingSelection('executive', 6).activityId).toBe('task-switch-reverse');
    expect(resolveTrainingSelection('dual', 4).activityId).toBe('go-no-go-color');
    expect(normalizeLegacyTrainingMode('reactTrain', 12)).toEqual({ mode: 'spatial', level: 7 });
    expect(resolveTrainingSelection('reactTrain', 71).optionDefaults).toMatchObject({ moleLookMode: 'variant' });
    expect(resolveTrainingSelection('reactTrain', 93).optionDefaults).toMatchObject({ numberCartTier: 3 });
    expect(resolveTrainingSelection('reactTrain', 103).optionDefaults).toMatchObject({ colorTrackerTier: 3 });
    expect(resolveCatalogTrainingSelection('spatial', 2)).toMatchObject({ activityId: 'color-number-memory', level: 4 });
    expect(resolveCatalogTrainingSelection('spatial', 1, { level: 6, activityId: 'sequence-memory' }))
      .toMatchObject({ activityId: 'sequence-memory', level: 6 });
    expect(resolveCatalogTrainingSelection('basic', 5, { level: 6, activityId: 'random-panel-cue' }))
      .toMatchObject({ activityId: 'three-panel-cue', level: 5 });
    const resume = settingsToExitResume({
      mode: 'reactTrain', level: 12, activityId: 'instant-memory', timeMode: 'reps',
      flowFeatures: new Set(), sportsArenaFeatures: new Set(),
    });
    expect(resume).toMatchObject({ modeId: 'spatial', levelId: 7 });
    expect(resolveTrainingSelection(resume.modeId, resume.levelId, resume.launch).activityId).toBe('instant-memory');
  });

  it('rejects unregistered or contradictory addresses instead of playing another program', () => {
    expect(() => resolveTrainingSelection('reactTrain', 999)).toThrow();
    expect(() => resolveTrainingSelection('', 1)).toThrow();
    expect(() => resolveTrainingSelection('basic', 999)).toThrow();
    expect(() => catalogTrainingActivity('reactTrain', 7)).toThrow();
    expect(() => resolveTrainingSelection('reactTrain', 201, { activityId: 'wormhole' })).toThrow();
  });
});
