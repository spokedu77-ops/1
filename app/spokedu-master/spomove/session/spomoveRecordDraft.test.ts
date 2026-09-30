import { describe, expect, it } from 'vitest';
import { findOfficialSpomovePreset, type OfficialSpomovePreset } from '../officialSpomovePresets';
import {
  buildSpomoveRecordDraft,
  buildSpomoveRecordHref,
  resolveSpomoveDraftFromQuery,
  resolveSpomoveRecordHandoff,
} from './spomoveRecordDraft';

const preset = { id: 'reaction-test', title: '반응 전환 테스트', axisTitle: '반응 전환' } as OfficialSpomovePreset;

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    setItem: (key: string, value: string) => values.set(key, value),
    getItem: (key: string) => values.get(key) ?? null,
  };
}

describe('SPOMOVE record draft', () => {
  it('builds an editable memo with general estimates only', () => {
    const draft = buildSpomoveRecordDraft({ elapsedMs: 125_000, preset, completionReason: 'natural_complete' });
    expect(draft).toContain('2분');
    expect(draft).toContain('6-12kcal');
    expect(draft).toContain('반응 전환');
  });

  it('keeps normal completion program, run, and draft through reload-safe session storage', () => {
    const storage = memoryStorage();
    const draft = buildSpomoveRecordDraft({ elapsedMs: 60_000, preset, completionReason: 'natural_complete' });
    const href = buildSpomoveRecordHref('123', draft, storage, 'run-normal', 'owner-a');
    const params = new URL(href, 'https://example.test').searchParams;
    expect(params.get('program')).toBe('123');
    expect(params.get('spomoveRunId')).toBe('run-normal');
    expect(params.get('spomoveDraftKey')).toBe('spokedu-master:spomove-draft:run-normal');
    expect(resolveSpomoveRecordHandoff(params, 'owner-a', storage)).toEqual({ programId: '123', runId: 'run-normal', draft });
    expect(resolveSpomoveDraftFromQuery(params, storage)).toBe(draft);
  });

  it('keeps stopped-early program, run, and draft through the same handoff', () => {
    const storage = memoryStorage();
    const draft = buildSpomoveRecordDraft({ elapsedMs: 20_000, preset, completionReason: 'stopped_early' });
    const params = new URL(buildSpomoveRecordHref('123', draft, storage, 'run-stop', 'owner-a'), 'https://example.test').searchParams;
    expect(resolveSpomoveRecordHandoff(params, 'owner-a', storage)).toEqual({ programId: '123', runId: 'run-stop', draft });
  });

  it('records movement changes without structured score invention', () => {
    const draft = buildSpomoveRecordDraft({
      elapsedMs: 60_000,
      preset,
      completionReason: 'stopped_early',
      initialMovement: { baseMovement: 'footTap', limbRule: 'free' },
      finalMovement: { baseMovement: 'handTouch', limbRule: 'sameSide' },
      movementChangeCount: 1,
    });
    expect(draft).toContain('1회 변경');
  });

  it('uses the current public title for an applied preset', () => {
    const publicPreset = findOfficialSpomovePreset('reaction-cognition-quad-fruit-10');
    expect(publicPreset).toBeTruthy();
    expect(buildSpomoveRecordDraft({ preset: publicPreset!, completionReason: 'natural_complete' })).toContain(publicPreset!.title);
  });

  it('rejects stale keys, cross-run mixing, and another owner in the same tab', () => {
    const storage = memoryStorage();
    const params = new URL(buildSpomoveRecordHref('123', 'draft-a', storage, 'run-a', 'owner-a'), 'https://example.test').searchParams;
    expect(resolveSpomoveRecordHandoff(params, 'owner-a', storage)?.draft).toBe('draft-a');
    expect(resolveSpomoveRecordHandoff(params, 'owner-b', storage)).toBeNull();
    params.set('spomoveRunId', 'run-b');
    expect(resolveSpomoveRecordHandoff(params, 'owner-a', storage)).toBeNull();
    params.set('spomoveRunId', 'run-a');
    params.set('program', '999');
    expect(resolveSpomoveRecordHandoff(params, 'owner-a', storage)).toBeNull();
  });

  it('uses one stable draft slot when the same run opens twice', () => {
    const storage = memoryStorage();
    buildSpomoveRecordHref('123', 'first', storage, 'run-a', 'owner-a');
    buildSpomoveRecordHref('123', 'second', storage, 'run-a', 'owner-a');
    expect(storage.values.size).toBe(1);
  });
});
