import { describe, expect, it } from 'vitest';
import { readAllRecordPages } from './recordPagination';

const makeRows = (count: number) => Array.from({ length: count }, (_, id) => ({ id: String(id), value: id }));

describe('readAllRecordPages', () => {
  it.each([0, 1, 500, 1001, 2500])('returns all %i rows in stable order', async (count) => {
    const source = makeRows(count);
    const result = await readAllRecordPages(async (from, to) => ({
      data: source.slice(from, to + 1),
      count,
      error: null,
    }));
    expect(result).toEqual(source);
  });

  it('fails closed if a later page is missing', async () => {
    const source = makeRows(1200);
    await expect(readAllRecordPages(async (from, to) => ({
      data: from === 500 ? [] : source.slice(from, to + 1),
      count: source.length,
      error: null,
    }))).rejects.toThrow(/incomplete page/);
  });

  it('fails closed if collection count changes', async () => {
    await expect(readAllRecordPages(async (from, to) => ({
      data: makeRows(1100).slice(from, to + 1),
      count: from ? 1099 : 1100,
      error: null,
    }))).rejects.toThrow(/changed/);
  });

  it('fails closed on duplicate IDs across pages', async () => {
    await expect(readAllRecordPages(async (from, to) => ({
      data: Array.from({ length: Math.min(500, 1001 - from) }, (_, index) => ({ id: String(index) })),
      count: 1001,
      error: null,
    }))).rejects.toThrow(/Duplicate/);
  });

  it('fails closed on query errors', async () => {
    await expect(readAllRecordPages(async () => ({
      data: null,
      count: null,
      error: new Error('database unavailable'),
    }))).rejects.toThrow('database unavailable');
  });
});
