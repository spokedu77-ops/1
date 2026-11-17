import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createWorkLogRepository } from './repository';
const row = { id: 'id-1', work_key: 'Task ID', project: '관리자', status: 'reported', summary: '수정', source_type: 'codex', details: null, source_url: null, verification_note: null, occurred_at: '2026-11-17T01:00:00Z', created_at: '2026-11-17T02:00:00Z' };
function database(results: unknown[]) {
  const chains: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const from = vi.fn(() => {
    const result = results.shift();
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ['select', 'order', 'range', 'eq', 'limit', 'insert', 'single']) chain[method] = vi.fn(() => chain);
    chain.then = vi.fn((resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve));
    chains.push(chain);
    return chain;
  });
  return { db: { from } as unknown as SupabaseClient, from, chains };
}
describe('production work log repository', () => {
  it('marks bounded timeline data incomplete only when the sentinel row exists', async () => {
    for (const extra of [[], [row]]) {
      const mock = database([{ data: Array.from({ length: 500 }, () => row), error: null }, { data: extra, error: null }]);
      const result = await createWorkLogRepository(mock.db).list({ maxEvents: 500 });
      expect(result.ok && result.events.length).toBe(500);
      expect(result.ok && result.complete).toBe(extra.length === 0);
      expect(mock.chains[1].range).toHaveBeenCalledWith(500, 500);
    }
  });
  it('reads all pages and preserves event time and nullable fields', async () => {
    const mock = database([{ data: Array.from({ length: 500 }, () => row), error: null }, { data: [row], error: null }]);
    const result = await createWorkLogRepository(mock.db).list({ project: '관리자' });
    expect(result.ok && result.events.length).toBe(501);
    expect(mock.chains[1].range).toHaveBeenCalledWith(500, 999);
    expect(result.ok && result.events[0]).toMatchObject({ workKey: 'Task ID', occurredAt: row.occurred_at, details: '', verificationNote: '' });
  });
  it('returns idempotent duplicate after database unique conflict without overwriting evidence', async () => {
    const mock = database([{ data: [{ project: '관리자' }], error: null }, { data: null, error: { code: '23505' } }, { data: row, error: null }]);
    const result = await createWorkLogRepository(mock.db).append(null, { workKey: 'Task ID', project: '관리자', summary: '수정', status: 'reported' });
    expect(result).toMatchObject({ ok: true, duplicate: true, event: { id: 'id-1' } });
    expect(mock.chains[1].insert).toHaveBeenCalledWith(expect.objectContaining({ work_key: 'Task ID', source_type: 'manual', created_by: null }));
    expect(mock.from).toHaveBeenCalledWith('ai_work_logs');
  });
  it('stops on lookup failure and project conflict', async () => {
    for (const [lookup, status] of [[{ data: null, error: { code: 'timeout' } }, 503], [{ data: [{ project: '다른 프로젝트' }], error: null }, 409]] as const) {
      const mock = database([lookup]);
      expect(await createWorkLogRepository(mock.db).append(null, { workKey: 'Task ID', project: '관리자', summary: '수정', status: 'reported' })).toMatchObject({ ok: false, status });
      expect(mock.from).toHaveBeenCalledTimes(1);
    }
  });
  it('does not touch DB when verified has no evidence', async () => {
    const mock = database([]);
    expect(await createWorkLogRepository(mock.db).append(null, { project: '관리자', summary: '수정', status: 'verified' })).toMatchObject({ ok: false, status: 400 });
    expect(mock.from).not.toHaveBeenCalled();
  });
});
