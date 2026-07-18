import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MASTER_DATA_DELETE_CONFIRMATION } from '@/app/spokedu-master/profile/masterDataDeletion';

const { getServiceSupabase, requireSpokeduMasterSession, reportError } = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  requireSpokeduMasterSession: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterSession,
}));

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  reportError,
}));

import { DELETE } from './route';

const routeSource = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/operational-data/route.ts'),
  'utf8',
);
const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260626120000_spokedu_master_delete_operational_data.sql'),
  'utf8',
);
const profileSource = readFileSync(
  join(process.cwd(), 'app/spokedu-master/profile/page.tsx'),
  'utf8',
);
const storeSource = readFileSync(
  join(process.cwd(), 'app/spokedu-master/store/index.ts'),
  'utf8',
);

function deleteRequest(body: unknown = { confirmation: MASTER_DATA_DELETE_CONFIRMATION }) {
  return new Request('http://local/api/spokedu-master/operational-data', {
    body: JSON.stringify(body),
    method: 'DELETE',
  });
}

function createSupabaseRpcMock(options: {
  data?: unknown;
  error?: { code?: string; message?: string };
} = {}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const supabase = {
    async rpc(name: string, args: Record<string, unknown>) {
      calls.push({ args, name });
      return {
        data: options.data ?? {
          classRecords: 2,
          explanations: 1,
          recordStudents: 3,
          students: 4,
          total: 10,
        },
        error: options.error ?? null,
      };
    },
    from: vi.fn(() => {
      throw new Error('sequential delete must not be used');
    }),
  };

  return { calls, supabase };
}

describe('SPOKEDU MASTER operational data deletion route', () => {
  beforeEach(() => {
    getServiceSupabase.mockReset();
    requireSpokeduMasterSession.mockReset();
    reportError.mockReset();
    reportError.mockResolvedValue(undefined);
    requireSpokeduMasterSession.mockResolvedValue({
      ok: true,
      userId: 'owner-a',
      isAdmin: false,
    });
  });

  it('returns 401 for unauthenticated requests and does not call the RPC', async () => {
    const { calls, supabase } = createSupabaseRpcMock();
    getServiceSupabase.mockReturnValue(supabase);
    requireSpokeduMasterSession.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('rejects a mismatched confirmation phrase with 400 before calling the RPC', async () => {
    const { calls, supabase } = createSupabaseRpcMock();
    getServiceSupabase.mockReturnValue(supabase);

    const response = await DELETE(deleteRequest({ confirmation: '삭제' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '확인 문구가 일치하지 않습니다.' });
    expect(calls).toEqual([]);
  });

  it('calls the atomic deletion RPC once with only the authenticated owner id', async () => {
    const { calls, supabase } = createSupabaseRpcMock();
    getServiceSupabase.mockReturnValue(supabase);

    const response = await DELETE(deleteRequest({ confirmation: MASTER_DATA_DELETE_CONFIRMATION, ownerId: 'attacker' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deleted: {
        classRecords: 2,
        explanations: 1,
        recordStudents: 3,
        students: 4,
        total: 10,
      },
      ok: true,
    });
    expect(calls).toEqual([{
      args: { p_owner_id: 'owner-a' },
      name: 'spokedu_master_delete_operational_data',
    }]);
  });

  it('succeeds when there is no data to delete and remains repeatable', async () => {
    const { calls, supabase } = createSupabaseRpcMock({
      data: {
        classRecords: 0,
        explanations: 0,
        recordStudents: 0,
        students: 0,
        total: 0,
      },
    });
    getServiceSupabase.mockReturnValue(supabase);

    const first = await DELETE(deleteRequest());
    const second = await DELETE(deleteRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(calls).toHaveLength(2);
  });

  it('returns sanitized 400 for expected RPC input errors', async () => {
    const { supabase } = createSupabaseRpcMock({
      error: { code: '22023', message: 'raw uuid detail' },
    });
    getServiceSupabase.mockReturnValue(supabase);

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({ error: '유효하지 않은 삭제 요청입니다.' });
    expect(JSON.stringify(json)).not.toContain('raw uuid detail');
  });

  it('returns sanitized 500 and keeps local cleanup blocked when the transaction fails', async () => {
    const { supabase } = createSupabaseRpcMock({
      error: { code: '23503', message: 'raw private db failure with student memo details' },
    });
    getServiceSupabase.mockReturnValue(supabase);

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toEqual({
      error: 'MASTER 데이터를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
    expect(JSON.stringify(json)).not.toContain('raw private db failure');
    expect(JSON.stringify(json)).not.toContain('student memo');
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ code: '23503' }), {
      context: 'spokedu_master.privacy_delete',
      tags: {
        code: '23503',
        stage: 'delete_operational_data_rpc',
        status: 500,
      },
    });
  });

  it('does not retain sequential owner row deletes in the route', () => {
    expect(routeSource).not.toContain('OPERATIONAL_DELETE_TABLES');
    expect(routeSource).not.toContain('deleteOwnerRows');
    expect(routeSource).not.toContain(".from(table)");
    expect(routeSource).toContain("supabase.rpc('spokedu_master_delete_operational_data'");
  });

  it('does not delete subscription, payment order, webhook, or public program tables', () => {
    expect(migration).not.toContain('spokedu_master_subscriptions');
    expect(migration).not.toContain('spokedu_master_payment_orders');
    expect(migration).not.toContain('spokedu_master_payment_webhook_events');
    expect(migration).not.toContain('spokedu_master_program_meta');
    expect(migration).not.toContain('spokedu_pro_programs');
  });
});

describe('SPOKEDU MASTER operational data deletion migration contract', () => {
  it('defines a single security-definer RPC with explicit search path', () => {
    expect(migration).toContain('create or replace function public.spokedu_master_delete_operational_data');
    expect(migration).toContain('security definer');
    expect(migration).toContain('set search_path = pg_catalog, public');
    expect(migration).toContain('p_owner_id uuid');
  });

  it('deletes operational tables in FK-safe transaction order, including soft-deleted rows', () => {
    const recordStudents = migration.indexOf('delete from public.spokedu_master_class_record_students');
    const records = migration.indexOf('delete from public.spokedu_master_class_records');
    const explanations = migration.indexOf('delete from public.spokedu_master_explanations');
    const students = migration.indexOf('delete from public.spokedu_master_students');

    expect(recordStudents).toBeGreaterThan(-1);
    expect(records).toBeGreaterThan(recordStudents);
    expect(explanations).toBeGreaterThan(records);
    expect(students).toBeGreaterThan(explanations);
    expect(migration).toContain('where owner_id = p_owner_id');
    expect(migration).not.toContain('deleted_at is null');
  });

  it('keeps middle and final-step failures atomic by avoiding partial-commit handling', () => {
    expect(migration).not.toMatch(/\bcommit\b/i);
    expect(migration).not.toMatch(/\bexception\b[\s\S]*\bwhen\b/i);
    expect(migration).not.toContain('dblink');
  });

  it('revokes execution from public, anon, authenticated and grants only service_role', () => {
    expect(migration).toContain('revoke all on function public.spokedu_master_delete_operational_data(uuid)');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.spokedu_master_delete_operational_data(uuid)');
    expect(migration).toContain('to service_role');
  });

  it('returns table counts and total count for diagnostics', () => {
    expect(migration).toContain("'recordStudents'");
    expect(migration).toContain("'classRecords'");
    expect(migration).toContain("'explanations'");
    expect(migration).toContain("'students'");
    expect(migration).toContain("'total'");
  });

  it('extends privacy delete to program favorites in the later migration', () => {
    const favoritesMigration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260717120000_spokedu_master_program_favorites.sql'),
      'utf8',
    );
    expect(favoritesMigration).toContain('DELETE FROM public.spokedu_master_program_favorites');
    expect(favoritesMigration).toContain("'programFavorites'");
    expect(favoritesMigration).toContain('DROP POLICY IF EXISTS spokedu_master_program_favorites_select_own');
  });
});

describe('profile local cleanup boundary', () => {
  it('clears current owner local data only after server deletion succeeds', () => {
    const deletion = profileSource.slice(
      profileSource.indexOf('const handleDeleteMasterData'),
      profileSource.indexOf('return (', profileSource.indexOf('const handleDeleteMasterData')),
    );
    expect(deletion.indexOf('if (!response.ok)')).toBeGreaterThan(-1);
    expect(deletion.indexOf('clearCurrentOwnerLocalData()'))
      .toBeGreaterThan(deletion.indexOf('if (!response.ok)'));
    expect(deletion).not.toContain('clearCurrentOwnerLocalData();\n    try');
  });

  it('clears only current owner favorites and recent activity, not other owners', () => {
    const cleanup = storeSource.slice(
      storeSource.indexOf('clearCurrentOwnerLocalData'),
      storeSource.indexOf('setProfile:', storeSource.indexOf('clearCurrentOwnerLocalData')),
    );
    expect(cleanup).toContain('delete favoriteProgramIdsByOwner[ownerId]');
    expect(cleanup).toContain('!ownerIds.has(activity.ownerId)');
    expect(cleanup).not.toContain('favoriteProgramIdsByOwner: {}');
    expect(cleanup).not.toContain('recentProgramActivities: []');
  });
});
