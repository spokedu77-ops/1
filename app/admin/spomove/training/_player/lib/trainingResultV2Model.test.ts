import { describe, expect, it } from 'vitest';
import { TRAINING_ACTIVITIES } from './trainingActivity';
import { resolveTrainingResultKind, TRAINING_RESULT_KINDS } from './trainingResultKind';
import { buildTrainingResultV2Model as build, selectV2RecordDetails, validTeacherResult } from './trainingResultV2Model';
import { OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { createGlassBridgeState, advanceGlassBridge, answerGlassBridge, type GlassBridgeResult } from './glassBridgeMemory';
import { resolveResultEducationProfile } from './trainingResultEducation';

const base = { elapsedMs: 5000, colorCounts: null, cfg: { mode: 'spatial', level: 8, activityId: 'glass-bridge-memory' as const, timeMode: 'reps', targetReps: 20, duration: 0 } };
const bridge: GlassBridgeResult = { startLength: 3, lastLength: 4, presentedRounds: 2, successRounds: 1, failureRounds: 1, teacherFailed: false, scoringMode: 'color-choice', completedRounds: 2, correctSteps: 5, incorrectSteps: 1, difficulty: 'hard' };
describe('V2 exhaustive activity and real result semantics', () => {
  it('keeps goalkeeper bonus arrivals out of regular round progress', () => {
    const model = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 11, activityId: 'goalkeeper', targetReps: 5 }, stims: 18,
      goalkeeperRecord: { tier: 2, waveCount: 5, targetWaveCount: 5, stims: 18,
        laneCount: [5, 4, 4, 5], regularLaneCount: [2, 2, 1, 2], bonusLaneCount: [3, 2, 3, 3],
        bonusStarted: true, baseTravelSeconds: 3 } });
    expect(model.metrics[1].value).toBe('5 / 5라운드');
    expect(model.metrics[0].note).toBe('보너스를 포함한 실제 진행 시간');
    expect(model.facts).toContainEqual({ id: 'bonus', label: '보너스 목표 도착', value: '11회' });
  });
  it('does not add bonus mole targets to the regular-round numerator', () => {
    const model = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 6, activityId: 'mole', targetReps: 5 }, stims: 18,
      colorCounts: { red: 5, blue: 4, green: 4, yellow: 5 },
      moleRecord: { regularRounds: 5, bonusRounds: 7, targetRounds: 5, bonusStarted: true, stims: 18,
        laneCount: [5, 4, 4, 5], regularLaneCount: [2, 2, 1, 2], bonusLaneCount: [3, 2, 3, 3] } });
    expect(model.metrics[1].value).toBe('5 / 5라운드');
    expect(model.facts).toContainEqual({ id: 'bonus-targets', label: '보너스 두더지 제시', value: '11마리' });
  });
  it('reports virus completion in rounds and the configured observation time', () => {
    const model = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 13, activityId: 'virus-outbreak', targetReps: 5, speed: 6 }, stims: 5 });
    expect(model.metrics[1].value).toBe('5 / 5라운드');
    expect(model.metrics[2].label).toBe('관찰 시간');
    expect(model.metrics[2].value).toBe('6초');
  });
  it('keeps unique SPOMAT settings while removing only the stimulus time already shown above', () => {
    const model = build({ ...base, cfg: { ...base.cfg, mode: 'basic', level: 4, activityId: 'two-panel-cue', speed: 5 }, sessionSettings: { title: '실행 설정', primary: 'SPOMAT 1장 · 자극 5초' } });
    const original = structuredClone(model.settings);
    expect(model.note).toBe('');
    expect(selectV2RecordDetails(model).settings).toContainEqual({ id: 'session', label: '사용한 SPOMAT', value: '1장' });
    expect(model.settings).toEqual(original);
    model.settings.push({ id: 'session-detail', label: '추가 설정', value: 'SPOMAT 2장 · 자극 3초 · 고유 설정' });
    expect(selectV2RecordDetails(model).settings.find(item => item.id === 'session-detail')?.value).toBe('SPOMAT 2장 · 자극 3초 · 고유 설정');
  });
  it('removes duplicate displays without deleting teacher judgments or changing the source model', () => {
    const model = build({ ...base, glassBridge: bridge });
    const before = structuredClone(model.facts);
    const details = selectV2RecordDetails(model);
    expect(details.facts).toEqual(model.facts);
    expect(details.facts.map(item=>item.id)).toEqual(expect.arrayContaining(['presented','success','failure','length','correct','incorrect']));
    expect(model.facts).toEqual(before);
    const direction = build({...base,cfg:{...base.cfg,mode:'basic',level:1,activityId:'direction-cue'},stims:4,directionRecord:{directions:['up','down','left','right'],counts:{up:2,down:1,left:0,right:2},signals:4,presented:5}});
    expect(direction.metrics[1].value).toBe('4 / 20회');
    expect(selectV2RecordDetails(direction).facts).toEqual([{id:'arrows',label:'목표 화살표 제시',value:'5개'}]);
    expect(direction.facts.some(item=>item.id==='progress')).toBe(true);
  });
  it('preserves educational copy variants and deterministic V2 selection for every activity', () => {
    for (const [activityId, definition] of Object.entries(TRAINING_ACTIVITIES)) {
      const route = definition.routes[0]!;
      const input = { ...base, cfg: { ...base.cfg, mode: route.mode, level: route.levels[0]!, activityId: activityId as keyof typeof TRAINING_ACTIVITIES } };
      const profile = resolveResultEducationProfile(input);
      expect(new Set(profile.descriptions).size).toBeGreaterThanOrEqual(4);
      expect(new Set(profile.tips).size).toBeGreaterThanOrEqual(4);
      for (const concept of profile.concepts) expect(new Set(concept.descriptions).size).toBeGreaterThanOrEqual(4);
      for (const seed of [0, 4, 64, 128, 440, 1023]) {
        const model = build(input, seed);
        expect(model.education.experiences).toHaveLength(3);
        expect(model.education).toEqual(build(input, seed).education);
        expect(model.reflection).toEqual(build(input, seed).reflection);
      }
    }
  });
  it('maps all 100 official presets and 50 admin activity identities without changing publication state', () => {
    expect(OFFICIAL_SPOMOVE_LIBRARY).toHaveLength(100);
    expect(Object.keys(TRAINING_ACTIVITIES)).toHaveLength(50);
    expect(Object.keys(TRAINING_RESULT_KINDS).sort()).toEqual(Object.keys(TRAINING_ACTIVITIES).sort());
    for (const preset of OFFICIAL_SPOMOVE_LIBRARY) {
      expect(resolveTrainingResultKind({ ...preset.engine, activityId: preset.activityId, timeMode: 'reps', targetReps: preset.rounds, duration: 0 })).toBeTruthy();
    }
    for (const [activityId, definition] of Object.entries(TRAINING_ACTIVITIES)) for (const route of definition.routes) for (const level of route.levels) {
      const cfg = { mode: route.mode, level, activityId: activityId as keyof typeof TRAINING_ACTIVITIES, timeMode: 'reps', targetReps: 20, duration: 0 };
      const model = build({ ...base, cfg });
      expect(model.education.experiences).toHaveLength(3);
      expect(model.reflection.question.length).toBeGreaterThan(5);
    }
  });
  it('chooses actual arrow rules before the default extreme-color report', () => {
    expect(resolveTrainingResultKind({ ...base.cfg, mode: 'flanker', level: 3, activityId: 'flanker-extreme', flankerExtremeMode: 'arrow' })).toBe('direction');
  });
  it('maps number 2 to yellow storage, not generic lane index 1 (blue)', () => {
    const model = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 15, activityId: 'moving-number-reader' }, colorCounts: { red: 1, yellow: 7, green: 3, blue: 2 }, stims: 13 });
    expect(model.distribution.map(item => item.count)).toEqual([1, 7, 3, 2]);
  });
  it('restores raw quadrant order for tracker but displays train doors horizontally', () => {
    const counts = { red: 1, blue: 2, green: 3, yellow: 4 };
    const tracker = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 9, activityId: 'color-tracker' }, colorCounts: counts, stims: 2 });
    expect(tracker.zones.map(item => item.count)).toEqual([1, 2, 3, 4]);
    expect(tracker.metrics[1].value).toBe('2라운드');
    const train = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 8, activityId: 'number-cart' }, colorCounts: counts });
    expect(train.horizontalZones).toBe(true);
    expect(train.zones[0].label).toBe('좌측 끝 문');
  });
  it('does not turn memory settings or natural completion into observed rounds', () => {
    const cfg = { ...base.cfg, mode: 'spatial', level: 1, activityId: 'sequence-memory' as const };
    expect(build({ ...base, cfg }).metrics[1].value).toBe('기록 없음');
    expect(build({ ...base, cfg, stims: 0 }).metrics[1].value).toBe('0라운드');
    expect(build({ ...base, cfg, stims: 3 }).metrics[1].value).toBe('3라운드');
  });
  it('keeps completed shape/tracking tasks separate from unrecorded target positions', () => {
    const model = build({ ...base, cfg: { ...base.cfg, mode: 'basic', level: 8, activityId: 'shape-completion' }, stims: 4, colorCounts: { red: 0, blue: 0, green: 0, yellow: 0 } });
    expect(model.zones).toEqual([]);
    expect(model.metrics[1]).toMatchObject({ label: '완료된 과제', value: '4라운드' });
  });
  it('does not use instant-memory lane colors as performance or unknown grid dimensions', () => {
    const model = build({ ...base, cfg: { ...base.cfg, level: 7, activityId: 'instant-memory' }, colorCounts: { red: 7, blue: 0, green: 0, yellow: 0 }, stims: 0 });
    expect(model.metrics[1].value).toBe('0라운드');
    expect(model.metrics[2].value).toBe('기록 없음');
    expect(model.distribution).toEqual([]);
  });
  it('accepts an actual engine color-choice result including a wrong step followed by continued answers', () => {
    let state = createGlassBridgeState(3, 1, 10, 0, () => 0.43, 'hard');
    state = advanceGlassBridge(state, 3000); state = advanceGlassBridge(state, 6500);
    state = answerGlassBridge(state, state.pattern[0] === 'red' ? 'blue' : 'red', 6500);
    state = advanceGlassBridge(state, 11500);
    state = answerGlassBridge(state, state.pattern[1]!, 11500); state = advanceGlassBridge(state, 13500);
    state = answerGlassBridge(state, state.pattern[2]!, 13500); state = advanceGlassBridge(state, 15500);
    expect(validTeacherResult(state.result)).toBe(true);
    const model = build({ ...base, glassBridge: state.result });
    expect(model.teacher?.failureRounds).toBe(1);
    expect(model.teacher?.completedRounds).toBe(1);
    expect(model.teacher?.correctSteps).toBe(2);
    expect(model.teacher?.incorrectSteps).toBe(1);
  });
  it.each([
    { ...bridge, completedRounds: 3 }, { ...bridge, correctSteps: Number.NaN }, { ...bridge, incorrectSteps: -1 },
    { ...bridge, completedRounds: 1 }, { ...bridge, lastLength: 99 }, { ...bridge, correctSteps: 100 },
  ])('rejects inconsistent teacher data without inventing zero values', input => {
    expect(validTeacherResult(input)).toBe(false);
    expect(build({ ...base, glassBridge: input }).teacher).toBeUndefined();
  });
  it('keeps historical manual failure retries separate from presented rounds', () => {
    const manual = { startLength: 3 as const, lastLength: 4, presentedRounds: 5, successRounds: 2, failureRounds: 3, teacherFailed: true };
    expect(validTeacherResult(manual)).toBe(true);
    const model = build({ ...base, glassBridge: manual });
    expect(model.note).toContain('교사가 수동');
    expect(model.facts.find(item => item.id === 'failure')?.value).toBe('3회');
  });
  it('uses time and authored motions for DIVE, not fictitious signal counts', () => {
    const model = build({ ...base, cfg: { ...base.cfg, mode: 'flow', level: 1, activityId: 'action-move' }, stims: 99, diveActionMove: { completed: false, stageDurationSec: 20, flowFeatures: ['punch', 'duck'], flowIncludeBonus: true } });
    expect(model.kind).toBe('time');
    expect(model.metrics[1].label).toBe('선택한 동작');
    expect(model.facts.map(item => item.id)).not.toContain('progress');
  });
});
