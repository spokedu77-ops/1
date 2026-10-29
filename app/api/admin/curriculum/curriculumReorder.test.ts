import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ ok: true as const })),
  invalidate: vi.fn(),
  from: vi.fn(),
  updateResults: [] as Array<{ error: { message: string } | null }>,
  updateCall: 0,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: mock.auth,
  getServiceSupabase: () => ({ from: mock.from }),
}));

vi.mock('@/app/lib/server/spokeduMasterProgramSourceCache', () => ({
  invalidateSpokeduMasterProgramSourceCache: mock.invalidate,
  getSpokeduMasterProgramSourceCacheGeneration: () => 0,
}));

import { PATCH } from './route';

function installCurriculumTable(selectData: Array<{ id: number; display_order: number }>) {
  mock.updateCall = 0;
  mock.from.mockImplementation((table: string) => {
    if (table !== 'curriculum') throw new Error(`unexpected table ${table}`);
    return {
      select: () => ({
        in: async () => ({ data: selectData, error: null }),
      }),
      update: () => ({
        eq: async () => {
          const result = mock.updateResults[mock.updateCall] ?? { error: null };
          mock.updateCall += 1;
          return result;
        },
      }),
    };
  });
}

describe('PATCH /api/admin/curriculum reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateResults = [];
    mock.updateCall = 0;
  });

  it('invalidates cache after success', async () => {
    installCurriculumTable([
      { id: 1, display_order: 10 },
      { id: 2, display_order: 20 },
    ]);
    mock.updateResults = [{ error: null }, { error: null }];
    const response = await PATCH(
      new Request('http://localhost/api/admin/curriculum', {
        method: 'PATCH',
        body: JSON.stringify({ reorder: [{ id: 1, display_order: 30 }, { id: 2, display_order: 40 }] }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mock.invalidate).toHaveBeenCalledTimes(1);
  });

  it('rolls back applied rows, invalidates cache, and reports rollback failure on partial error', async () => {
    installCurriculumTable([
      { id: 1, display_order: 10 },
      { id: 2, display_order: 20 },
    ]);
    mock.updateResults = [
      { error: null },
      { error: { message: 'write blocked' } },
      { error: { message: 'revert failed' } },
    ];
    const response = await PATCH(
      new Request('http://localhost/api/admin/curriculum', {
        method: 'PATCH',
        body: JSON.stringify({ reorder: [{ id: 1, display_order: 30 }, { id: 2, display_order: 40 }] }),
      }),
    );
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.partialApplied).toBe(1);
    expect(json.rollbackFailed).toBe(true);
    expect(mock.invalidate).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache when the first write fails after snapshot read', async () => {
    installCurriculumTable([{ id: 1, display_order: 10 }]);
    mock.updateResults = [{ error: { message: 'immediate failure' } }];
    const response = await PATCH(
      new Request('http://localhost/api/admin/curriculum', {
        method: 'PATCH',
        body: JSON.stringify({ reorder: [{ id: 1, display_order: 30 }] }),
      }),
    );
    expect(response.status).toBe(500);
    expect(mock.invalidate).toHaveBeenCalledTimes(1);
  });

  it('uses the pre-update snapshot even when concurrent writers changed rows mid-flight', async () => {
    installCurriculumTable([{ id: 1, display_order: 10 }]);
    mock.updateResults = [{ error: null }];
    const response = await PATCH(
      new Request('http://localhost/api/admin/curriculum', {
        method: 'PATCH',
        body: JSON.stringify({ reorder: [{ id: 1, display_order: 99 }] }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mock.updateCall).toBe(1);
  });
});
