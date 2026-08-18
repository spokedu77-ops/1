import { describe, expect, it } from 'vitest';

import { planGroupRoundIndexes, occupyingRoundCount, type SessionRowForReindex } from './reindexGroupRounds';

function row(
  partial: Pick<SessionRowForReindex, 'id' | 'start_at' | 'status'> &
    Partial<Pick<SessionRowForReindex, 'round_index' | 'round_total'>>
): SessionRowForReindex {
  return {
    round_index: null,
    round_total: 8,
    ...partial,
  };
}

describe('planGroupRoundIndexes', () => {
  it('3/8 취소 칸을 유지한다: 다음은 4/8, 마지막은 8/8', () => {
    const sessions: SessionRowForReindex[] = [
      row({ id: '1', start_at: '2026-08-01T01:00:00.000Z', status: 'opened', round_index: 1 }),
      row({ id: '2', start_at: '2026-08-03T01:00:00.000Z', status: 'opened', round_index: 2 }),
      row({ id: '3', start_at: '2026-08-05T01:00:00.000Z', status: 'cancelled', round_index: 3 }),
      row({ id: '4', start_at: '2026-08-07T01:00:00.000Z', status: 'opened', round_index: 4 }),
      row({ id: '5', start_at: '2026-08-10T01:00:00.000Z', status: 'opened', round_index: 5 }),
      row({ id: '6', start_at: '2026-08-12T01:00:00.000Z', status: 'opened', round_index: 6 }),
      row({ id: '7', start_at: '2026-08-14T01:00:00.000Z', status: 'opened', round_index: 7 }),
      row({ id: '8', start_at: '2026-08-17T01:00:00.000Z', status: 'opened', round_index: 8 }),
    ];

    const byId = Object.fromEntries(planGroupRoundIndexes(sessions).map((p) => [p.id, p]));

    expect(byId['3']).toMatchObject({ round_index: 3, round_total: 8, round_display: '3/8' });
    expect(byId['4']).toMatchObject({ round_index: 4, round_total: 8, round_display: '4/8' });
    expect(byId['8']).toMatchObject({ round_index: 8, round_total: 8, round_display: '8/8' });
    expect(Object.keys(byId)).toHaveLength(8);
  });

  it('postponed 고스트는 번호에서 빼고, deleted도 뺀다', () => {
    const sessions: SessionRowForReindex[] = [
      row({ id: '1', start_at: '2026-08-01T01:00:00.000Z', status: 'opened', round_index: 1 }),
      row({ id: 'p', start_at: '2026-08-03T01:00:00.000Z', status: 'postponed', round_index: 2 }),
      row({ id: '2', start_at: '2026-08-10T01:00:00.000Z', status: 'opened', round_index: 2 }),
      row({ id: 'd', start_at: '2026-08-12T01:00:00.000Z', status: 'deleted', round_index: 3 }),
    ];

    const patches = planGroupRoundIndexes(sessions);
    const ids = patches.map((p) => p.id);

    expect(ids).toEqual(['1', '2']);
    expect(patches[0]).toMatchObject({ round_index: 1, round_display: '1/8' });
    expect(patches[1]).toMatchObject({ round_index: 2, round_display: '2/8' });
  });

  it('회차가 1개이면 패치하지 않는다', () => {
    expect(
      planGroupRoundIndexes([
        row({ id: '1', start_at: '2026-08-01T01:00:00.000Z', status: 'opened', round_index: 1 }),
      ])
    ).toEqual([]);
  });

  it('사이클 합치기: 취소 칸을 포함한 칸 수가 분모 (활성만 세면 15가 됨)', () => {
    const a: SessionRowForReindex[] = [
      row({ id: 'a1', start_at: '2026-07-01T01:00:00.000Z', status: 'opened', round_index: 1 }),
      row({ id: 'a2', start_at: '2026-07-03T01:00:00.000Z', status: 'cancelled', round_index: 2 }),
      row({ id: 'a3', start_at: '2026-07-05T01:00:00.000Z', status: 'opened', round_index: 3 }),
    ];
    const b: SessionRowForReindex[] = [
      row({ id: 'b1', start_at: '2026-08-01T01:00:00.000Z', status: 'opened', round_index: 1 }),
      row({ id: 'b2', start_at: '2026-08-03T01:00:00.000Z', status: 'opened', round_index: 2 }),
    ];
    const merged = [...a, ...b];
    const total = occupyingRoundCount(merged);
    expect(total).toBe(5);

    const byId = Object.fromEntries(
      planGroupRoundIndexes(merged, { total }).map((p) => [p.id, p])
    );
    expect(byId['a2']).toMatchObject({ round_index: 2, round_total: 5, round_display: '2/5' });
    expect(byId['a3']).toMatchObject({ round_index: 3, round_total: 5, round_display: '3/5' });
    expect(byId['b1']).toMatchObject({ round_index: 4, round_total: 5, round_display: '4/5' });
    expect(Object.keys(byId)).toHaveLength(5);
  });
});
