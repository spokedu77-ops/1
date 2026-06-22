import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MASTER_DATA_DELETE_CONFIRMATION } from '@/app/spokedu-master/profile/masterDataDeletion';

const { getServiceSupabase, requireSpokeduMasterAccess, reportError } = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  requireSpokeduMasterAccess: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterAccess,
}));

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  reportError,
}));

import { DELETE } from './route';

type DeleteCall = {
  column: string;
  table: string;
  value: string;
};

const OPERATIONAL_TABLES = [
  'spokedu_master_explanations',
  'spokedu_master_class_records',
  'spokedu_master_class_record_students',
  'spokedu_master_students',
] as const;

function deleteRequest(body: unknown = { confirmation: MASTER_DATA_DELETE_CONFIRMATION }) {
  return new Request('http://local/api/spokedu-master/operational-data', {
    body: JSON.stringify(body),
    method: 'DELETE',
  });
}

function createSupabaseDeleteMock(options: { failTable?: string } = {}) {
  const calls: DeleteCall[] = [];
  const touchedTables: string[] = [];

  const supabase = {
    from(table: string) {
      touchedTables.push(table);
      return {
        delete() {
          return {
            async eq(column: string, value: string) {
              calls.push({ column, table, value });
              if (table === options.failTable) {
                return { error: new Error('raw private db failure with student memo details') };
              }
              return { error: null };
            },
          };
        },
      };
    },
  };

  return { calls, supabase, touchedTables };
}

describe('SPOKEDU MASTER operational data deletion route', () => {
  beforeEach(() => {
    getServiceSupabase.mockReset();
    requireSpokeduMasterAccess.mockReset();
    reportError.mockReset();
    reportError.mockResolvedValue(undefined);
    requireSpokeduMasterAccess.mockResolvedValue({
      ok: true,
      userId: 'owner-a',
      isAdmin: false,
      plan: 'pro',
    });
  });

  it('returns 401 for unauthenticated requests and does not touch data', async () => {
    const { supabase, touchedTables } = createSupabaseDeleteMock();
    getServiceSupabase.mockReturnValue(supabase);
    requireSpokeduMasterAccess.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(401);
    expect(touchedTables).toEqual([]);
  });

  it('rejects a mismatched confirmation phrase with 400', async () => {
    const { supabase, touchedTables } = createSupabaseDeleteMock();
    getServiceSupabase.mockReturnValue(supabase);

    const response = await DELETE(deleteRequest({ confirmation: '삭제' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '확인 문구가 일치하지 않습니다.' });
    expect(touchedTables).toEqual([]);
  });

  it('deletes only current owner operational rows', async () => {
    const { calls, supabase, touchedTables } = createSupabaseDeleteMock();
    getServiceSupabase.mockReturnValue(supabase);

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(touchedTables).toEqual([...OPERATIONAL_TABLES]);
    expect(calls).toEqual(OPERATIONAL_TABLES.map((table) => ({
      column: 'owner_id',
      table,
      value: 'owner-a',
    })));
  });

  it('does not delete subscription, payment order, or webhook event tables', async () => {
    const { supabase, touchedTables } = createSupabaseDeleteMock();
    getServiceSupabase.mockReturnValue(supabase);

    await DELETE(deleteRequest());

    expect(touchedTables).not.toContain('spokedu_master_subscriptions');
    expect(touchedTables).not.toContain('spokedu_master_payment_orders');
    expect(touchedTables).not.toContain('spokedu_master_payment_webhook_events');
  });

  it('returns sanitized 500 and reports unexpected database failures', async () => {
    const { supabase } = createSupabaseDeleteMock({
      failTable: 'spokedu_master_class_records',
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
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      context: 'spokedu_master.privacy_delete',
      tags: {
        stage: 'delete_owner_rows',
        status: 500,
        table: 'spokedu_master_class_records',
      },
    });
  });
});
