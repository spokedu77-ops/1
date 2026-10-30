import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getServiceSupabase: vi.fn(),
  removePageBlocks: vi.fn(async () => undefined),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: mocks.requireAdmin,
  getServiceSupabase: mocks.getServiceSupabase,
}));
vi.mock('@/app/lib/note/documentParentSync', () => ({
  reconcileDocumentParents: vi.fn(),
  removePageBlocksForChildDocument: mocks.removePageBlocks,
}));

import { DELETE } from './route';

describe('Note document deletion lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an unauthorized request before accessing storage', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    const response = await DELETE(new NextRequest('http://localhost/api/admin/note/documents?id=doc-1', { method: 'DELETE' }));
    expect(response.status).toBe(403);
    expect(mocks.getServiceSupabase).not.toHaveBeenCalled();
    expect(mocks.removePageBlocks).not.toHaveBeenCalled();
  });

  it('preserves soft deletion, actor attribution, block count and audit record', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' });
    const documentUpdates: Record<string, unknown>[] = [];
    const blockUpdates: Record<string, unknown>[] = [];
    const filters: unknown[] = [];
    const audit: Record<string, unknown>[] = [];
    const service = {
      from(table: string) {
        if (table === 'note_audit_logs') return {
          insert: async (row: Record<string, unknown>) => { audit.push(row); return { error: null }; },
        };
        const query = {
          select: () => table === 'note_blocks'
            ? Promise.resolve({ data: [{ id: 'block-1' }], error: null }) : query,
          update: (row: Record<string, unknown>) => {
            (table === 'note_documents' ? documentUpdates : blockUpdates).push(row);
            return query;
          },
          eq: (key: string, value: unknown) => { filters.push([table, key, value]); return query; },
          is: (key: string, value: unknown) => {
            filters.push([table, key, value]);
            return table === 'note_documents' ? Promise.resolve({ error: null }) : query;
          },
          maybeSingle: async () => ({ data: { id: 'doc-1', title: 'Preserved title' }, error: null }),
        };
        return query;
      },
    };
    mocks.getServiceSupabase.mockReturnValue(service);
    const response = await DELETE(new NextRequest('http://localhost/api/admin/note/documents?id=doc-1', { method: 'DELETE' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, softDeleted: true, deletedBlocks: 1 });
    expect(mocks.removePageBlocks).toHaveBeenCalledWith(service, 'doc-1', 'admin-1');
    expect(documentUpdates).toHaveLength(1);
    expect(blockUpdates).toEqual(documentUpdates);
    expect(documentUpdates[0]).toEqual({
      deleted_at: expect.any(String), deleted_by: 'admin-1',
      updated_at: documentUpdates[0].deleted_at, updated_by: 'admin-1',
    });
    expect(filters).toContainEqual(['note_blocks', 'document_id', 'doc-1']);
    expect(filters).toContainEqual(['note_blocks', 'deleted_at', null]);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      document_id: 'doc-1', actor_id: 'admin-1', action: 'delete_document',
      diff: { before: { id: 'doc-1', title: 'Preserved title' }, after: { deleted_by: 'admin-1', deleted_blocks: 1 } },
    });
  });
});
