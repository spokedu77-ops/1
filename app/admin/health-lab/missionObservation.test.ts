import { describe, expect, it } from 'vitest';
import { parseHealthLabStore } from './healthLabStorage';
import { completionSummary, type GuardianObservation, type MissionAssignment } from './missionEngine';
import { acceptedSpecific, feedbackLines, UNANSWERED_SPECIFIC } from './missionObservation';

const base = (participation: GuardianObservation['participation'], movement: GuardianObservation['movement'] = 'independent'): GuardianObservation => ({
  understanding: 'once', movement, participation, memo: '1주차메모', savedAt: '2026-11-19T00:00:00.000Z',
});

const assignment: MissionAssignment = { childId: 'virtual-child-a', programId: 'movement-habit-8w', missionId: 'week1-color-move', required: true };

describe('mission specific observation', () => {
  it('keeps an old completed attempt that has no specific item', () => {
    const raw = JSON.stringify({ schemaVersion: 2, legacyImported: true, attempts: [{ id: 'keep-a-week1', childId: 'virtual-child-a', programId: 'movement-habit-8w', missionId: 'week1-color-move', missionVersion: 1, status: 'done', observation: base('finished'), createdAt: '2026-11-19T00:00:00.000Z' }] });
    const parsed = parseHealthLabStore(raw);
    expect(parsed.corrupted).toBe(false);
    expect(parsed.store.attempts[0].observation?.memo).toBe('1주차메모');
    expect(parsed.store.attempts[0].status).toBe('done');
    expect(feedbackLines('week1-color-move', parsed.store.attempts[0].observation)).toEqual([UNANSWERED_SPECIFIC]);
    expect(completionSummary(parsed.store, 'virtual-child-a', [assignment]).completed).toBe(1);
  });

  it('treats a mismatched item id as unanswered without dropping the attempt', () => {
    const observation = { ...base('finished'), specific: { itemId: 'week2-path-order', itemVersion: 1, choice: 'independent', recordedAt: '2026-11-19T00:00:00.000Z' } };
    const raw = JSON.stringify({ schemaVersion: 2, legacyImported: true, attempts: [{ id: 'mismatch', childId: 'virtual-child-a', programId: 'movement-habit-8w', missionId: 'week1-color-move', missionVersion: 1, status: 'done', observation, createdAt: '2026-11-19T00:00:00.000Z' }] });
    const parsed = parseHealthLabStore(raw);
    expect(parsed.corrupted).toBe(false);
    expect(parsed.store.attempts).toHaveLength(1);
    expect(parsed.store.attempts[0].observation?.specific?.itemId).toBe('week2-path-order');
    expect(acceptedSpecific('week1-color-move', parsed.store.attempts[0].observation?.specific)).toBeNull();
    expect(feedbackLines('week1-color-move', parsed.store.attempts[0].observation)).toEqual([UNANSWERED_SPECIFIC]);
  });

  it('does not count a partial independent attempt as complete', () => {
    const observation: GuardianObservation = { ...base('partial'), specific: { itemId: 'week1-target-color', itemVersion: 1, choice: 'independent', recordedAt: '2026-11-19T00:00:00.000Z' } };
    const store = { schemaVersion: 2 as const, legacyImported: true, attempts: [{ id: 'p', childId: 'virtual-child-a', programId: 'movement-habit-8w', missionId: 'week1-color-move', missionVersion: 1, status: 'partial-closed' as const, observation, createdAt: '2026-11-19T00:00:00.000Z' }], habitLogs: [] };
    expect(completionSummary(store, 'virtual-child-a', [assignment]).completed).toBe(0);
    expect(feedbackLines('week1-color-move', observation)[0]).toContain('같은 조건');
  });

  it('puts the safety line first when the activity stopped, even without a specific answer', () => {
    const lines = feedbackLines('week2-footstep-path', base('stopped'));
    expect(lines[0]).toContain('활동이 중단되었습니다');
    expect(lines[1]).toBe(UNANSWERED_SPECIFIC);
    expect(lines.some((line) => line.includes('간격'))).toBe(false);
  });

  it('keeps not-completed separate from an unanswered item', () => {
    const observation: GuardianObservation = { ...base('finished'), specific: { itemId: 'week2-path-order', itemVersion: 1, choice: 'not-completed', recordedAt: '2026-11-19T00:00:00.000Z' } };
    expect(feedbackLines('week2-footstep-path', observation)[0]).toContain('발자국 수');
    expect(feedbackLines('week2-footstep-path', base('partial'))).toEqual([UNANSWERED_SPECIFIC]);
  });

  it('offers a harder variation only for an independent finished movement', () => {
    const ready: GuardianObservation = { ...base('finished'), specific: { itemId: 'week1-target-color', itemVersion: 1, choice: 'independent', recordedAt: '2026-11-19T00:00:00.000Z' } };
    const hard: GuardianObservation = { ...ready, movement: 'difficult' };
    expect(feedbackLines('week1-color-move', ready)[0]).toContain('카드 위치');
    expect(feedbackLines('week1-color-move', hard)[0]).toContain('같은 조건');
  });
});
