import { describe, expect, it } from 'vitest';
import {
  applyDocumentParentPatchesInMemory,
  ensurePageBlockForChildDocument,
  planDocumentParentPatches,
  removePageBlocksForChildDocument,
} from './documentParentSync';

describe('planDocumentParentPatches', () => {
  it('sets parent_id from page block document_id', () => {
    const docs = [
      { id: 'child', parent_id: null },
      { id: 'parent', parent_id: null },
    ];
    const patches = planDocumentParentPatches(docs, [
      { document_id: 'parent', content: { page_document_id: 'child', title: 'Child' } },
    ]);
    expect(patches).toEqual([{ id: 'child', parent_id: 'parent' }]);
  });

  it('clears stale parent_id when page link is missing', () => {
    const docs = [
      { id: 'child', parent_id: 'old-parent' },
      { id: 'old-parent', parent_id: null },
    ];
    const patches = planDocumentParentPatches(docs, []);
    expect(patches).toEqual([{ id: 'child', parent_id: null }]);
  });

  it('corrects wrong parent_id to canonical page block host', () => {
    const docs = [{ id: 'child', parent_id: 'wrong' }];
    const patches = planDocumentParentPatches(docs, [
      { document_id: 'right', content: { page_document_id: 'child' } },
    ]);
    expect(patches).toEqual([{ id: 'child', parent_id: 'right' }]);
  });

  it('uses the newest active page block when duplicate links exist', () => {
    const docs = [
      { id: 'child', parent_id: 'old-parent' },
      { id: 'old-parent', parent_id: null },
      { id: 'new-parent', parent_id: null },
    ];
    const patches = planDocumentParentPatches(docs, [
      {
        id: 'old-link',
        document_id: 'old-parent',
        content: { page_document_id: 'child' },
        order_index: 0,
        updated_at: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'new-link',
        document_id: 'new-parent',
        content: { page_document_id: 'child' },
        order_index: 5,
        updated_at: '2026-07-02T00:00:00.000Z',
      },
    ]);
    expect(patches).toEqual([{ id: 'child', parent_id: 'new-parent' }]);
  });

  it('keeps active page block as canonical parent even when parent_id is stale', () => {
    const docs = [
      { id: 'parent', parent_id: null },
      { id: 'other-parent', parent_id: null },
      { id: 'child', parent_id: 'other-parent' },
    ];
    const patches = planDocumentParentPatches(docs, [
      { document_id: 'parent', content: { page_document_id: 'child', title: 'Child' } },
    ]);
    expect(patches).toEqual([{ id: 'child', parent_id: 'parent' }]);
  });

  it('does not clear parent_id for documents outside the loaded document set', () => {
    const docs = [
      { id: 'child', parent_id: 'missing-parent' },
    ];
    const patches = planDocumentParentPatches(docs, []);
    expect(patches).toEqual([]);
  });

  it('ignores self-referential page blocks and clears parent_id === id', () => {
    const docs = [{ id: 'orphan', parent_id: 'orphan' }];
    const patches = planDocumentParentPatches(docs, [
      { document_id: 'orphan', content: { page_document_id: 'orphan', title: 'Self' } },
    ]);
    expect(patches).toEqual([{ id: 'orphan', parent_id: null }]);
  });

  it('applyDocumentParentPatchesInMemory merges patches', () => {
    const docs = [
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: 'x' },
    ];
    const next = applyDocumentParentPatchesInMemory(docs, [
      { id: 'a', parent_id: 'root' },
      { id: 'b', parent_id: null },
    ]);
    expect(next).toEqual([
      { id: 'a', parent_id: 'root' },
      { id: 'b', parent_id: null },
    ]);
  });
});

describe('removePageBlocksForChildDocument', () => {
  it('soft-deletes active page blocks that point to the child document', async () => {
    const calls: Array<{ table: string; op: string; payload?: unknown; args?: unknown[] }> = [];
    const supabase = {
      from(table: string) {
        calls.push({ table, op: 'from' });
        const query = {
          select(value: string) {
            calls.push({ table, op: 'select', payload: value });
            return query;
          },
          eq(column: string, value: unknown) {
            calls.push({ table, op: 'eq', args: [column, value] });
            return query;
          },
          is(column: string, value: unknown) {
            calls.push({ table, op: 'is', args: [column, value] });
            return query;
          },
          filter(column: string, operator: string, value: unknown) {
            calls.push({ table, op: 'filter', args: [column, operator, value] });
            return Promise.resolve({
              data: [{ id: 'page-a' }, { id: 'page-b' }],
              error: null,
            });
          },
          update(payload: unknown) {
            calls.push({ table, op: 'update', payload });
            return {
              in(column: string, value: unknown) {
                calls.push({ table, op: 'in', args: [column, value] });
                return Promise.resolve({ error: null });
              },
            };
          },
        };
        return query;
      },
    };

    await removePageBlocksForChildDocument(
      supabase as never,
      'child-doc',
      'actor-1',
    );

    expect(calls).toEqual(expect.arrayContaining([
      { table: 'note_blocks', op: 'filter', args: ['content->>page_document_id', 'eq', 'child-doc'] },
      expect.objectContaining({
        table: 'note_blocks',
        op: 'update',
        payload: expect.objectContaining({
          deleted_by: 'actor-1',
        }),
      }),
      { table: 'note_blocks', op: 'in', args: ['id', ['page-a', 'page-b']] },
    ]));
  });
});

describe('ensurePageBlockForChildDocument', () => {
  it('creates a parent page block when restoring a child with a live parent', async () => {
    const calls: Array<{ table: string; op: string; payload?: unknown; args?: unknown[] }> = [];
    let selectCount = 0;
    const supabase = {
      from(table: string) {
        calls.push({ table, op: 'from' });
        const query = {
          select(value: string) {
            selectCount += 1;
            calls.push({ table, op: 'select', payload: value });
            return query;
          },
          eq(column: string, value: unknown) {
            calls.push({ table, op: 'eq', args: [column, value] });
            return query;
          },
          is(column: string, value: unknown) {
            calls.push({ table, op: 'is', args: [column, value] });
            return query;
          },
          filter(column: string, operator: string, value: unknown) {
            calls.push({ table, op: 'filter', args: [column, operator, value] });
            return query;
          },
          order(column: string, options: unknown) {
            calls.push({ table, op: 'order', args: [column, options] });
            return query;
          },
          limit(value: number) {
            calls.push({ table, op: 'limit', args: [value] });
            if (selectCount === 1) {
              return Promise.resolve({ data: [], error: null });
            }
            return Promise.resolve({ data: [{ order_index: 4 }], error: null });
          },
          insert(payload: unknown) {
            calls.push({ table, op: 'insert', payload });
            return Promise.resolve({ error: null });
          },
        };
        return query;
      },
    };

    await ensurePageBlockForChildDocument(
      supabase as never,
      {
        childDocumentId: 'child-doc',
        childTitle: 'Child',
        parentDocumentId: 'parent-doc',
        actorId: 'actor-1',
      },
    );

    expect(calls).toEqual(expect.arrayContaining([
      { table: 'note_blocks', op: 'filter', args: ['content->>page_document_id', 'eq', 'child-doc'] },
      expect.objectContaining({
        table: 'note_blocks',
        op: 'insert',
        payload: expect.objectContaining({
          document_id: 'parent-doc',
          parent_block_id: null,
          type: 'page',
          order_index: 5,
          content: {
            page_document_id: 'child-doc',
            title: 'Child',
          },
          created_by: 'actor-1',
          updated_by: 'actor-1',
        }),
      }),
    ]));
  });

  it('does not create a duplicate page block when an active link already exists', async () => {
    const calls: Array<{ op: string; payload?: unknown }> = [];
    const supabase = {
      from() {
        const query = {
          select() { return query; },
          eq() { return query; },
          is() { return query; },
          filter() { return query; },
          limit() {
            return Promise.resolve({ data: [{ id: 'existing-page' }], error: null });
          },
          insert(payload: unknown) {
            calls.push({ op: 'insert', payload });
            return Promise.resolve({ error: null });
          },
        };
        return query;
      },
    };

    await ensurePageBlockForChildDocument(
      supabase as never,
      {
        childDocumentId: 'child-doc',
        childTitle: 'Child',
        parentDocumentId: 'parent-doc',
      },
    );

    expect(calls).toEqual([]);
  });
});
