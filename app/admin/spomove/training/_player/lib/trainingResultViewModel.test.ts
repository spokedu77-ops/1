import { describe, expect, it } from 'vitest';
import { buildTrainingResultViewModel as build, type TrainingResultViewInput } from './trainingResultViewModel';
import { resolveTrainingResultRichContent } from './trainingResultRichContent';

const base: TrainingResultViewInput = {
  cfg: { mode: 'basic', level: 2, timeMode: 'reps', targetReps: 20, duration: 0 },
  elapsedMs: 12000, colorCounts: null,
};
const search: TrainingResultViewInput = {
  ...base, cfg: { ...base.cfg, mode: 'flanker', level: 7, activityId: 'visual-search', visualSearchStage: 2, visualSearchTargetCount: 2 },
  stims: 3, colorCounts: { red: 2, yellow: 1, green: 1, blue: 2 },
};

describe('result feedback units and evidence', () => {
  it.each([undefined, 'balloon-pop'] as const)('shows recorded balloon colors for legacy and canonical activity identity: %s', activityId => {
    const colorCounts = { red: 2, blue: 1, green: 0, yellow: 2 };
    const vm = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 3, activityId, adminRounds: true, targetReps: 5 }, stims: 5, colorCounts });
    expect(vm.activityTitle).toBe('풍선 터뜨리기');
    expect(vm.distribution.map(row => [row.id, row.count])).toEqual([
      ['red', 2], ['yellow', 2], ['green', 0], ['blue', 1],
    ]);
    expect(vm.distributionKind).toBe('color');
    expect(vm.progress).toBe('5회 제시');
    expect(vm.recordNote).not.toContain('자동 측정하지 않음');
  });
  it.each([
    ['natural_complete', '오늘의 미션을 마쳤어요!', true],
    ['stopped_early', '오늘은 여기까지!', true],
    ['cancelled', '이번 미션은 취소되었어요.', false],
    ['failed', '미션 실행에 문제가 생겼어요.', false],
  ] as const)('keeps %s separate from performance and preserves the objective', (completionReason, title, showFeeling) => {
    const vm = build({ ...search, completionReason });
    expect(vm).toMatchObject({ reason: completionReason, title, showFeeling });
    expect(vm.objective).toContain('설계된 활동');
    expect(vm.facts).toContainEqual({ id: 'tasks', label: '제시된 탐색 과제', value: '3회' });
  });

  it('separates configured volume, tasks and targets with two targets', () => {
    const vm = build(search);
    expect(vm.volume).toBe('20회');
    expect(vm.progress).toBe('3과제 제시');
    expect(vm.facts.map(f => f.value)).toEqual(['3회', '6개']);
    expect(vm.distribution.reduce((sum, row) => sum + row.count, 0)).toBe(6);
    expect(vm.distribution.every(row => row.label.endsWith('구역'))).toBe(true);
  });

  it('distinguishes unrecorded zero, missing data and unmeasured performance', () => {
    const missing = build({ ...search, stims: undefined, colorCounts: null });
    expect(missing.facts).toEqual([]);
    expect(missing.progress).toContain('미전달');
    expect(missing.limitations.join()).toContain('자동 측정하지 않습니다');
    const zero = build({ ...search, stims: 0, colorCounts: { red: 0, yellow: 0, blue: 0, green: 0 } });
    expect(zero.facts.map(f => f.value)).toEqual(['0회', '0개']);
    expect(zero.recordNote).toContain('실제 기록 없음');
    expect(zero.distribution.map(row => [row.id, row.count, row.width])).toEqual([
      ['red', 0, 0], ['yellow', 0, 0], ['green', 0, 0], ['blue', 0, 0],
    ]);
  });

  it('does not accept negative, fractional or non-finite counters', () => {
    const vm = build({ ...search, stims: NaN, colorCounts: { red: -1, yellow: 1, blue: 1, green: 1 } });
    expect(vm.facts).toEqual([]);
    expect(vm.distribution).toEqual([]);
  });

  it('shows color-choice bridge results without inventing legacy retry or success-target rules', () => {
    const vm = build({ ...base, completionReason: 'natural_complete', cfg: { ...base.cfg, mode: 'spatial', level: 8, activityId: 'glass-bridge-memory', speed: 2, targetReps: 5 },
      glassBridge: { startLength: 3, lastLength: 7, presentedRounds: 5, completedRounds: 5, correctSteps: 20, incorrectSteps: 5, successRounds: 0, failureRounds: 5, teacherFailed: false, scoringMode: 'color-choice', difficulty: 'easy' } });
    expect(vm.reason).toBe('natural_complete');
    expect(vm.progress).toBe('5라운드 공개 완료');
    expect(vm.facts).toContainEqual({ id: 'incorrect', label: '틀린 발판', value: '5개' });
    expect(vm.settings).toContainEqual({ id: 'cue', label: '설정 제시 방식', value: '쉬움 · 전체 패턴 20초' });
    expect(JSON.stringify(vm)).not.toMatch(/성공 목표|같은 단계 재도전|성공률/);
  });

  it('keeps historical teacher failure independent of terminal error status', () => {
    const vm = build({ ...base, completionReason: 'failed', cfg: { ...base.cfg, mode: 'spatial', level: 8, activityId: 'glass-bridge-memory' },
      glassBridge: { startLength: 6, lastLength: 7, presentedRounds: 2, successRounds: 1, failureRounds: 1, teacherFailed: true } });
    expect(vm.status).toBe('실행 오류');
    expect(vm.facts).toContainEqual({ id: 'failure', label: '교사 실패 판정', value: '1회' });
    expect(vm.facts.some(f => f.id === 'correct')).toBe(false);
  });

  it('does not expose internal directional flanker colors', () => {
    for (const cfg of [
      { ...base.cfg, mode: 'flanker', level: 1, activityId: 'flanker-arrow' as const },
      { ...base.cfg, mode: 'flanker', level: 3, activityId: 'flanker-extreme' as const, flankerExtremeMode: 'arrow' as const },
    ]) expect(build({ ...search, cfg }).distribution).toEqual([]);
  });

  it('maps number-reader bins to numbers rather than capsule color', () => {
    const vm = build({ ...search, cfg: { ...base.cfg, mode: 'reactTrain', level: 15, activityId: 'moving-number-reader' } });
    expect(vm.distribution.map(row => row.label)).toEqual(['숫자 1', '숫자 2', '숫자 3', '숫자 4']);
  });

  it('shows configured reaction repetitions separately from an irrelevant time default', () => {
    const vm = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 3, targetReps: 15, duration: 60 } });
    expect(vm.volume).toBe('15회');
    expect(vm.progress).toBe('제시 기록 미전달');
  });

  it('restores legacy door/zone counter ordering without changing persisted counts', () => {
    const counts = { red: 1, blue: 2, green: 3, yellow: 4 };
    const vm = build({ ...base, cfg: { ...base.cfg, mode: 'reactTrain', level: 8, activityId: 'number-cart' }, colorCounts: counts, stims: 10 });
    expect(vm.distribution.map(row => [row.label, row.count])).toEqual([
      ['빨강 구역', 1], ['노랑 구역', 2], ['초록 구역', 3], ['파랑 구역', 4],
    ]);
    expect(counts).toEqual({ red: 1, blue: 2, green: 3, yellow: 4 });
  });

  it('preserves the distinct public and Admin sequence timing without fabricating completed rounds', () => {
    const cfg = { ...base.cfg, mode: 'spatial', level: 1, activityId: 'sequence-memory' as const };
    const admin = build({ ...search, cfg: { ...cfg, adminSequenceTiming: true } });
    const master = build({ ...search, cfg });
    expect(admin.settings.find(s => s.id === 'timing')?.value).toBe('1~2.5초 랜덤');
    expect(master.settings.find(s => s.id === 'timing')?.value).toBe('1~3초 랜덤');
    expect(admin.distribution).toEqual([]);
    expect(admin.facts.every(f => f.id === 'elapsed')).toBe(true);
  });

  it('preserves DIVE configuration and observed elapsed time, without counted actions', () => {
    const vm = build({ ...base, cfg: { ...base.cfg, mode: 'flow', level: 1 }, volumeLabel: '100초 + 보너스 60초',
      diveActionMove: { completed: false, stageDurationSec: 20, flowFeatures: ['punch', 'kick', 'duck'], flowIncludeBonus: true }, completionReason: 'stopped_early' });
    expect(vm.volume).toBe('100초 + 보너스 60초');
    expect(vm.facts).toEqual([{ id: 'elapsed', label: '실제 진행 시간', value: '12초' }]);
    expect(vm.settings.find(s => s.id === 'stage')?.value).toBe('20초');
    expect(vm.meaning).toContain('설정된 액션 구성');
    expect(vm.distribution).toEqual([]);
  });

  it('keeps activity-specific educational copy when terminal truth is applied', () => {
    const cfg = { ...base.cfg, mode: 'flanker', level: 1 };
    const original = resolveTrainingResultRichContent(cfg, 12000, null);
    const stopped = resolveTrainingResultRichContent(cfg, 12000, null, { completionReason: 'stopped_early' });
    expect(stopped.programSummary).toBe(original.programSummary);
    expect(stopped.benefitTags).toEqual(original.benefitTags);
  });
});
