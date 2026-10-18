import { describe, expect, it } from 'vitest';
import { fetchAllClassListSessions } from './fetchAllClassListSessions';

function clientFor(total: number) {
  const source = Array.from({ length: total }, (_, index) => ({
    id: `session-${String(index).padStart(5, '0')}`,
    group_id: `group-${Math.floor(index / 7)}`,
    title: `수업 ${Math.floor(index / 7)}`,
    start_at: new Date(2026, 0, 1 + index).toISOString(),
    end_at: new Date(2026, 0, 1 + index, 1).toISOString(),
    status: index % 3 === 0 ? 'finished' : 'scheduled',
    created_by: '00000000-0000-0000-0000-000000000001',
    round_total: 7,
    round_index: index % 7,
  }));
  const ranges: Array<[number, number]> = [];
  const client = {
    from: () => ({
      select: () => ({
        not: () => ({
          order: () => ({
            range: async (from: number, to: number) => {
              ranges.push([from, to]);
              return { data: source.slice(from, to + 1), error: null };
            },
          }),
        }),
      }),
    }),
  };
  return { client, source, ranges };
}

describe('fetchAllClassListSessions', () => {
  it.each([999, 1000, 1001, 3250])('returns the complete id set for %i rows', async (total) => {
    const { client, source } = clientFor(total);
    const rows = await fetchAllClassListSessions(client as never);
    expect(new Set(rows.map((row) => row.id))).toEqual(new Set(source.map((row) => row.id)));
    expect(rows).toHaveLength(total);
  });

  it('keeps a group complete across page boundaries without duplicates', async () => {
    const { client } = clientFor(3005);
    const rows = await fetchAllClassListSessions(client as never);
    const boundaryGroup = rows.filter((row) => row.group_id === `group-${Math.floor(1000 / 7)}`);
    expect(boundaryGroup).toHaveLength(7);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });
});
