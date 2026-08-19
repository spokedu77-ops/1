import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyNoteBlockOpPayload,
  filterTransactionPatchesByDocument,
  filterTransactionPatchesByExistingIds,
  normalizeOpTransactionPayloadForInvariants,
  pushNoteBlockOps,
  shouldIgnoreRegressiveContentPatch,
} from './noteOpLogService';
import { commitNoteBlockOp } from './noteCommitBlockOp';

vi.mock('./noteCommitBlockOp', () => ({
  commitNoteBlockOp: vi.fn(),
}));

function block(id: string, overrides = {}) {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: {},
    deleted_at: null,
    version: 1,
    ...overrides,
  };
}

describe('noteOpLogService transaction patch filtering', () => {
  beforeEach(() => {
    vi.mocked(commitNoteBlockOp).mockReset();
  });

  it('drops stale transaction updates for blocks that no longer exist', () => {
    const patches = [
      { id: 'alive', order_index: 0 },
      { id: 'missing', order_index: 1 },
    ];

    expect(
      filterTransactionPatchesByExistingIds(patches, new Set(['alive'])),
    ).toEqual([{ id: 'alive', order_index: 0 }]);
  });

  it('drops transaction patches for blocks owned by another document stream', () => {
    const patches = [
      { id: 'same-doc', order_index: 0 },
      { id: 'other-doc', order_index: 1 },
    ];
    const ownerById = new Map([
      ['same-doc', 'doc-1'],
      ['other-doc', 'doc-2'],
    ]);

    expect(filterTransactionPatchesByDocument(patches, ownerById, 'doc-1')).toEqual([
      { id: 'same-doc', order_index: 0 },
    ]);
  });

  it('keeps C5 transfer companion order shifts on the outbound target', () => {
    const patches = [
      { id: 'moving', document_id: 'doc-2', parent_block_id: null, order_index: 0 },
      { id: 'target-root', order_index: 1 },
      { id: 'unrelated', order_index: 0 },
    ];
    const ownerById = new Map([
      ['moving', 'doc-1'],
      ['target-root', 'doc-2'],
      ['unrelated', 'doc-3'],
    ]);

    expect(filterTransactionPatchesByDocument(patches, ownerById, 'doc-1')).toEqual([
      { id: 'moving', document_id: 'doc-2', parent_block_id: null, order_index: 0 },
      { id: 'target-root', order_index: 1 },
    ]);
  });

  it('keeps reclaim patches that return blocks to this stream document_id', () => {
    const patches = [
      { id: 'returning', document_id: 'doc-1', parent_block_id: null, order_index: 0 },
      { id: 'still-other', order_index: 2 },
    ];
    const ownerById = new Map([
      ['returning', 'doc-2'],
      ['still-other', 'doc-2'],
    ]);

    expect(filterTransactionPatchesByDocument(patches, ownerById, 'doc-1')).toEqual([
      { id: 'returning', document_id: 'doc-1', parent_block_id: null, order_index: 0 },
    ]);
  });

  it('does not densify root orders across document boundaries during transfer projection', () => {
    const result = normalizeOpTransactionPayloadForInvariants({
      documentId: 'doc-1',
      existingBlocks: [
        block('source-a', { document_id: 'doc-1', order_index: 0 }),
        block('source-b', { document_id: 'doc-1', order_index: 1 }),
        block('target-root', { document_id: 'doc-2', order_index: 0 }),
      ],
      updates: [
        { id: 'source-a', document_id: 'doc-2', parent_block_id: null, order_index: 0 },
        { id: 'target-root', order_index: 1 },
      ],
      creates: [],
      deleteIds: [],
    });

    expect(result.updates.find((patch) => patch.id === 'source-a')).toMatchObject({
      document_id: 'doc-2',
      order_index: 0,
    });
    expect(result.updates.find((patch) => patch.id === 'target-root')).toMatchObject({
      order_index: 1,
    });
    expect(result.updates.find((patch) => patch.id === 'source-b')).toBeUndefined();
  });

  it('normalizes op-log transaction payloads before RPC persistence', () => {
    const result = normalizeOpTransactionPayloadForInvariants({
      documentId: 'doc-1',
      existingBlocks: [
        block('todo', { document_id: 'doc-1', type: 'todo', order_index: 0 }),
        block('child', { document_id: 'doc-1', type: 'text', parent_block_id: 'todo', order_index: 0 }),
      ],
      updates: [
        { id: 'child', parent_block_id: 'todo', order_index: 0 },
      ],
      creates: [
        { id: 'toggle-child', document_id: 'doc-1', type: 'toggle', parent_block_id: 'todo', order_index: 1 },
      ],
      deleteIds: [],
    });

    expect(result.updates[0]).toMatchObject({
      id: 'child',
      parent_block_id: null,
      // client가 보낸 order_index는 sanitize compaction으로 덮지 않음
      order_index: 0,
    });
    expect(result.creates[0]).toMatchObject({
      id: 'toggle-child',
      parent_block_id: null,
      order_index: 1,
    });
  });

  it('ignores stale prefix patches that would truncate saved text', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20' },
      { text: '7.20 월요일 12시 송예원T OT' },
    )).toBe(false);
    // 동일 길이 rewrite는 base 없으면 stale로 무시 (1100↔1400 LWW 구멍)
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20 월요일 13시 송예원T OT' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20 월요일 13시 송예원T OT' },
      { text: '7.20 월요일 12시 송예원T OT' },
    )).toBe(false);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '9.1 2차 기성금 요청 (찾동체) : 1400만원' },
      { text: '9.1 2차 기성금 요청 (찾동체) : 1100만원' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '9.1 2차 기성금 요청 (찾동체) : 1100만원' },
      { text: '9.1 2차 기성금 요청 (찾동체) : 1400만원' },
      { text: '9.1 2차 기성금 요청 (찾동체) : 1100만원' },
    )).toBe(false);
  });

  it('ignores non-empty delayed patches when their base no longer matches the server', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'latest checklist text', html: '<p>latest checklist text</p>' },
      { text: 'older delayed edit', html: '<p>older delayed edit</p>' },
      { text: 'old checklist text', html: '<p>old checklist text</p>' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'latest checklist text', html: '<p>latest checklist text</p>' },
      { text: 'latest checklist text', html: '<p>latest checklist text</p>' },
      { text: 'old checklist text', html: '<p>old checklist text</p>' },
    )).toBe(false);
    expect(shouldIgnoreRegressiveContentPatch(
      { title: 'current toggle title', collapsed: false },
      { title: 'old delayed title', collapsed: true },
      { title: 'old toggle title', collapsed: true },
    )).toBe(true);
  });

  it('treats toggle titles and page links as protectable content', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { title: 'P0 핵심 과제', collapsed: true },
      { text: '', html: '<p></p>' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      { title: '' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      { title: '', page_document_id: '' },
      { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
    )).toBe(false);
  });

  it('treats html-only and structured content as protectable content', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { html: '<p>saved callout body</p>', icon: 'i' },
      { text: '', html: '<p></p>' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { rows: [['a1', 'b1']], caption: '' },
      { text: '', html: '<p></p>' },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { rows: [['a1', 'b1']] },
      { rows: [] },
      { rows: [['a1', 'b1']] },
    )).toBe(false);
  });

  it('does not treat callout decoration alone as protectable content', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { icon: 'i', text: '', html: '<p></p>' },
      { text: '', html: '<p></p>' },
    )).toBe(false);
  });

  it('rejects short-prefix false extension without base (shared with passive)', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: 'A' },
      { text: 'A server' },
    )).toBe(true);
  });

  it('rejects silent checklist uncheck without matching base (document-agnostic)', () => {
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '히스토리 항목', checked: true },
      { text: '히스토리 항목', checked: false },
    )).toBe(true);
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '히스토리 항목', checked: false },
      { text: '히스토리 항목', checked: true },
      { text: '히스토리 항목', checked: false },
    )).toBe(false);
  });

  it('does not materialize block data before an op-log seq conflict is committed', async () => {
    vi.mocked(commitNoteBlockOp).mockResolvedValueOnce({ status: 'conflict' });

    const touchedTables: string[] = [];
    const supabase = {
      from(table: string) {
        touchedTables.push(table);
        const calls: string[] = [];
        const chain = {
          select() {
            calls.push('select');
            return chain;
          },
          eq() {
            calls.push('eq');
            return chain;
          },
          in() {
            calls.push('in');
            return chain;
          },
          gt() {
            calls.push('gt');
            return chain;
          },
          order() {
            calls.push('order');
            return chain;
          },
          limit() {
            calls.push('limit');
            return chain;
          },
          maybeSingle() {
            if (table === 'note_document_sync_state') {
              return Promise.resolve({ data: { last_seq: 1 }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
          then(resolve: (value: unknown) => void) {
            if (table === 'note_block_ops') {
              resolve({ data: [], error: null });
              return;
            }
            resolve({ data: null, error: null });
          },
        };
        return chain;
      },
    };

    const result = await pushNoteBlockOps(
      supabase as never,
      'doc-1',
      0,
      [{
        clientOpId: 'op-stale-empty',
        opType: 'patch_content',
        payload: {
          opType: 'patch_content',
          blockId: 'block-1',
          content: { text: '' },
        },
      }],
      'actor-1',
    );

    expect(result).toEqual({
      ok: false,
      error: 'seq_conflict',
      lastSeq: 1,
      ops: [],
    });
    // content authority may SELECT note_blocks before commit; UPDATE/materialize must not run
    expect(touchedTables.filter((table) => table === 'note_blocks').length).toBeLessThanOrEqual(1);
    expect(vi.mocked(commitNoteBlockOp)).toHaveBeenCalled();
  });

  it('does not update a block when patch_content is sent through the wrong document stream', async () => {
    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        const chain = {
          select() {
            calls.push(`${table}.select`);
            return chain;
          },
          update() {
            calls.push(`${table}.update`);
            return chain;
          },
          eq(column: string, value: string) {
            calls.push(`${table}.eq.${column}.${value}`);
            return chain;
          },
          is() {
            calls.push(`${table}.is`);
            return chain;
          },
          maybeSingle() {
            return Promise.resolve({ data: null, error: null });
          },
        };
        return chain;
      },
    };

    const result = await applyNoteBlockOpPayload(
      supabase as never,
      'wrong-doc',
      {
        opType: 'patch_content',
        blockId: 'block-owned-by-other-doc',
        content: { text: 'must not cross documents' },
      },
      'actor-1',
    );

    expect(result).toEqual([]);
    expect(calls).toContain('note_blocks.eq.document_id.wrong-doc');
    expect(calls).not.toContain('note_blocks.update');
  });

  it('does not let an empty stale content patch overwrite saved text', async () => {
    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        const chain = {
          select() {
            calls.push(`${table}.select`);
            return chain;
          },
          update() {
            calls.push(`${table}.update`);
            return chain;
          },
          eq() {
            return chain;
          },
          is() {
            return chain;
          },
          maybeSingle() {
            return Promise.resolve({
              data: { version: 3, content: { text: 'saved admin text', html: '<p>saved admin text</p>' } },
              error: null,
            });
          },
        };
        return chain;
      },
    };

    const result = await applyNoteBlockOpPayload(
      supabase as never,
      'doc-1',
      {
        opType: 'patch_content',
        blockId: 'block-1',
        content: { text: '', html: '<p></p>' },
        baseContent: { text: '', html: '<p></p>' },
      },
      'actor-1',
    );

    expect(result).toEqual([]);
    expect(calls).not.toContain('note_blocks.update');
  });

  it('rejects patch_content when materialize returns empty after commit (ACK≠materialize)', async () => {
    let noteBlocksSelectCount = 0;
    vi.mocked(commitNoteBlockOp).mockResolvedValueOnce({
      status: 'ok',
      assignedSeq: 2,
    });

    const supabase = {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.update = self;
        chain.eq = self;
        chain.in = self;
        chain.gt = self;
        chain.order = self;
        chain.limit = self;
        chain.is = self;
        chain.maybeSingle = () => {
          if (table === 'note_document_sync_state') {
            return Promise.resolve({ data: { last_seq: 2 }, error: null });
          }
          if (table === 'note_blocks') {
            noteBlocksSelectCount += 1;
            // pre-check: allow intentional check
            if (noteBlocksSelectCount === 1) {
              return Promise.resolve({
                data: { content: { text: 'item', checked: false } },
                error: null,
              });
            }
            // apply: server text advanced → regressive ignore → []
            return Promise.resolve({
              data: { version: 2, content: { text: 'item advanced', checked: false } },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        };
        chain.then = (resolve: (value: unknown) => void) => {
          if (table === 'note_block_ops') {
            resolve({ data: [], error: null });
            return undefined;
          }
          resolve({ data: null, error: null });
          return undefined;
        };
        return chain;
      },
    };

    const result = await pushNoteBlockOps(
      supabase as never,
      'doc-1',
      1,
      [{
        clientOpId: 'op-check',
        opType: 'patch_content',
        payload: {
          opType: 'patch_content',
          blockId: 'block-1',
          content: { text: 'item', checked: true },
          baseContent: { text: 'item', checked: false },
        },
      }],
      'actor-1',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appliedClientOpIds).not.toContain('op-check');
    expect(result.rejectedClientOpIds).toContain('op-check');
  });
});

describe('resolveIntentSoftDeleteIds', () => {
  it('deletes even when updated_at OCC mismatches (intent wins)', async () => {
    const { resolveIntentSoftDeleteIds } = await import('./noteOpLogService');
    expect(resolveIntentSoftDeleteIds({
      requestedIds: ['a'],
      rows: [{
        id: 'a',
        deleted_at: null,
        updated_at: '2026-08-04T01:00:00.000Z',
        content: { text: 'live', html: '<p>live</p>' },
      }],
      deleteMeta: [{ id: 'a', updated_at: '2026-08-04T00:00:00.000Z' }],
    })).toEqual(['a']);
  });

  it('deletes when deleteMeta lists the id even if updated_at is null', async () => {
    const { resolveIntentSoftDeleteIds } = await import('./noteOpLogService');
    expect(resolveIntentSoftDeleteIds({
      requestedIds: ['a'],
      rows: [{
        id: 'a',
        deleted_at: null,
        updated_at: '2026-08-04T01:00:00.000Z',
        content: { text: 'live', html: '<p>live</p>' },
      }],
      deleteMeta: [{ id: 'a', updated_at: null }],
    })).toEqual(['a']);
  });

  it('blocks structured content only when deleteMeta omits the id', async () => {
    const { resolveIntentSoftDeleteIds, assertSoftDeleteFullyApplied } = await import('./noteOpLogService');
    const rows = [{
      id: 'a',
      deleted_at: null,
      updated_at: '2026-08-04T01:00:00.000Z',
      content: { text: 'live', html: '<p>live</p>' },
    }];
    expect(resolveIntentSoftDeleteIds({
      requestedIds: ['a'],
      rows,
      deleteMeta: undefined,
    })).toEqual([]);
    expect(() => assertSoftDeleteFullyApplied({
      requestedIds: ['a'],
      rows,
      appliedIds: [],
    })).toThrow(/soft_delete_not_applied:a/);
  });
});
