import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyNoteBlockOpPayload,
  filterTransactionPatchesByDocument,
  filterTransactionPatchesByExistingIds,
  pushNoteBlockOps,
  shouldIgnoreRegressiveContentPatch,
} from './noteOpLogService';
import { commitNoteBlockOp } from './noteCommitBlockOp';

vi.mock('./noteCommitBlockOp', () => ({
  commitNoteBlockOp: vi.fn(),
}));

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
    expect(shouldIgnoreRegressiveContentPatch(
      { text: '7.20 월요일 12시 송예원T OT' },
      { text: '7.20 월요일 13시 송예원T OT' },
    )).toBe(false);
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
    expect(touchedTables).not.toContain('note_blocks');
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
});
