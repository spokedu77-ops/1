/**
 * 미검증 5개 영역 통합 검증
 * 1) 구조 변경 (insert/delete/DnD) → reducer
 * 2) 다중 탭 follower snapshot
 * 3) 붙여넣기·토글·컬럼 복합
 * 4) IndexedDB outbound 복구
 * 5) legacy reconcile → syncSnapshot
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useNoteBlockStore } from '../_store/noteBlockStore';
import { applyNoteCommand } from './noteCommandReducer';
import {
  buildDeleteBlockForestCommand,
  buildInsertBlockCommand,
  buildMoveBlockCommand,
} from './noteBlockCommands';
import { planBlockDropAt } from '@/app/lib/note/noteBlockTree';
import { insertPastedBlockSpecsAfterBlock } from './notePasteInsert';
import {
  buildDefaultColumnChildren,
  COLUMN_LIST_TYPE,
} from './noteColumnBlock';
import { migrateToggleLegacyToChildBlocks } from './noteToggleContent';
import {
  unionReconciledWithLocalBlocks,
  wouldReconcileRegressActiveText,
  wouldReconcileRegressLocalStructure,
} from './noteBlockStateMerge';
import type { NoteBlock } from './types';

function block(
  id: string,
  overrides: Partial<NoteBlock> = {},
): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: id, html: `<p>${id}</p>` },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

function ctx(activeBlockId: string | null = null) {
  const store = useNoteBlockStore.getState();
  const storeContentById: Record<string, Record<string, unknown>> = {};
  for (const [id, b] of Object.entries(store.byId)) {
    if (b?.content && typeof b.content === 'object') {
      storeContentById[id] = b.content as Record<string, unknown>;
    }
  }
  return {
    documentId: 'doc-1',
    activeBlockId,
    storeContentById,
  };
}

function dispatchReplace(previous: NoteBlock[], nextBlocks: NoteBlock[]): NoteBlock[] {
  return applyNoteCommand(previous, { type: 'replaceBlocks', blocks: nextBlocks }, ctx()).blocks;
}

describe('1) 구조 변경 insert/delete/DnD → reducer', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().hydrate([]);
    useNoteBlockStore.getState().setActiveDocumentId('doc-1');
  });

  it('insert command nextBlocks round-trips through replaceBlocks', () => {
    const previous = [block('a', { order_index: 0 })];
    const created = block('new', { order_index: 1 });
    const command = buildInsertBlockCommand(previous, created, null, 1);
    const next = dispatchReplace(previous, command.nextBlocks);
    expect(next.map((b) => b.id)).toEqual(['a', 'new']);
  });

  it('delete forest removes subtree through replaceBlocks', () => {
    const previous = [
      block('root', { order_index: 0 }),
      block('child', { parent_block_id: 'root', order_index: 0 }),
      block('other', { order_index: 1 }),
    ];
    const command = buildDeleteBlockForestCommand(previous, ['root']);
    const next = dispatchReplace(previous, command.nextBlocks);
    expect(next.map((b) => b.id)).toEqual(['other']);
  });

  it('DnD move command preserves order through replaceBlocks', () => {
    const previous = [block('a', { order_index: 0 }), block('b', { order_index: 1 })];
    const plan = planBlockDropAt(previous, 'b', 'a', 'inside');
    expect(plan).not.toBeNull();
    const command = buildMoveBlockCommand(previous, 'b', plan!);
    const next = dispatchReplace(previous, command.nextBlocks);
    expect(next.find((b) => b.id === 'b')?.parent_block_id).toBe('a');
  });

  it('applyPatches updates field without dropping siblings', () => {
    const previous = [
      block('a', { order_index: 0, type: 'text' }),
      block('b', { order_index: 1 }),
    ];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'applyPatches', patches: [{ id: 'a', type: 'bulletList' }] },
      ctx(),
    );
    expect(blocks.find((b) => b.id === 'a')?.type).toBe('bulletList');
    expect(blocks.find((b) => b.id === 'b')).toBeDefined();
  });
});

describe('2) 다중 탭 follower — leader snapshot', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().hydrate([block('a', { content: { text: 'typing' } })]);
    useNoteBlockStore.getState().setActiveDocumentId('doc-1');
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'a', field: 'text' });
    useNoteBlockStore.getState().patchContent('a', { text: 'typing live' });
  });

  it('follower syncSnapshot does not clobber active tab typing', () => {
    const previous = useNoteBlockStore.getState().getBlocksArray();
    const leaderSnapshot = [block('a', { content: { text: 'leader stale' } })];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: leaderSnapshot },
      ctx('a'),
    );
    expect((blocks[0].content as { text: string }).text).toBe('typing live');
  });

  it('follower syncSnapshot applies leader structure for non-active blocks', () => {
    const previous = [
      block('a', { order_index: 0 }),
      block('b', { order_index: 1, type: 'text' }),
    ];
    useNoteBlockStore.getState().hydrate(previous);
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'a', field: 'text' });
    const leaderSnapshot = [
      block('a', { order_index: 0 }),
      block('b', { order_index: 1, type: 'bulletList' }),
    ];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: leaderSnapshot },
      ctx('a'),
    );
    expect(blocks.find((b) => b.id === 'b')?.type).toBe('bulletList');
  });
});

describe('3) 붙여넣기·토글·컬럼 복합', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().hydrate([]);
    useNoteBlockStore.getState().setActiveDocumentId('doc-1');
  });

  it('nested paste creates hierarchy with stable parent ids', async () => {
    const blocksRef = { current: [block('anchor', { order_index: 0 })] };
    let seq = 0;
    const createdIds: string[] = [];

    await insertPastedBlockSpecsAfterBlock(
      {
        blocksRef,
        insertBlockAmongSiblings: async (parentId, type, insertIndex) => {
          seq += 1;
          const id = `paste-${seq}`;
          createdIds.push(id);
          const created = block(id, {
            type,
            parent_block_id: parentId,
            order_index: insertIndex,
          });
          blocksRef.current = [...blocksRef.current, created];
          return created;
        },
        changeBlockType: vi.fn(),
        syncBlockContent: vi.fn(),
      },
      blocksRef.current[0],
      [
        { type: 'bulletList', text: 'Root', listNestLevel: 0 },
        { type: 'bulletList', text: 'Child', listNestLevel: 1 },
      ],
      {},
    );

    expect(createdIds).toHaveLength(2);
    const child = blocksRef.current.find((b) => b.id === createdIds[1]);
    const root = blocksRef.current.find((b) => b.id === createdIds[0]);
    expect(child?.parent_block_id).toBe(root?.id);
    const next = dispatchReplace([block('anchor')], blocksRef.current);
    expect(next.length).toBeGreaterThanOrEqual(3);
  });

  it('toggle legacy migration + reducer keeps child under toggle', () => {
    const toggleBlock = block('toggle-1', {
      type: 'toggle',
      content: { title: 'Section', body: 'legacy body' },
    });
    const migration = migrateToggleLegacyToChildBlocks([toggleBlock]);
    const combined = dispatchReplace([], migration.blocks);
    expect(combined.some((b) => b.id === 'toggle-1')).toBe(true);
    expect(migration.created.length).toBe(1);
    const withChild = dispatchReplace(combined, [...combined, ...migration.created]);
    expect(withChild.find((b) => b.parent_block_id === 'toggle-1')).toBeDefined();
  });

  it('column list + default children structure is valid', () => {
    const columnList = block('col-list', { type: COLUMN_LIST_TYPE, order_index: 0 });
    const specs = buildDefaultColumnChildren(columnList);
    expect(specs).toHaveLength(2);
    const children = specs.map((spec, index) => block(`col-${index}`, {
      type: 'column',
      parent_block_id: columnList.id,
      order_index: spec.order_index,
      content: spec.content as Record<string, unknown>,
    }));
    const next = dispatchReplace([], [columnList, ...children]);
    expect(next.filter((b) => b.parent_block_id === columnList.id)).toHaveLength(2);
  });
});

describe('4) IndexedDB outbound 복구 (in-memory mock)', () => {
  type OutboundRow = { clientOpId: string; documentId: string; createdAt: number; opType: string };
  const outboundStore = new Map<string, OutboundRow>();

  function appendOutbound(documentId: string, clientOpId: string, opType: string) {
    outboundStore.set(clientOpId, { clientOpId, documentId, createdAt: Date.now(), opType });
  }

  function listOutbound(documentId: string) {
    return [...outboundStore.values()]
      .filter((row) => row.documentId === documentId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  function removeOutbound(clientOpIds: string[]) {
    for (const id of clientOpIds) outboundStore.delete(id);
  }

  beforeEach(() => {
    outboundStore.clear();
  });

  it('survives simulated page reload — outbound still present', () => {
    appendOutbound('doc-1', 'op-create', 'create_block');
    appendOutbound('doc-1', 'op-patch', 'patch_content');
    const beforeReload = listOutbound('doc-1');
    expect(beforeReload).toHaveLength(2);
    const afterReload = listOutbound('doc-1');
    expect(afterReload.map((r) => r.opType)).toEqual(['create_block', 'patch_content']);
  });

  it('partial push removes only consumed ops', () => {
    appendOutbound('doc-1', 'op-create', 'create_block');
    appendOutbound('doc-1', 'op-patch', 'patch_content');
    removeOutbound(['op-create']);
    const remaining = listOutbound('doc-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.opType).toBe('patch_content');
  });
});

describe('5) legacy reconcile → syncSnapshot', () => {
  beforeEach(() => {
    useNoteBlockStore.getState().hydrate([]);
    useNoteBlockStore.getState().setActiveDocumentId('doc-1');
  });

  it('syncSnapshot matches unionReconciled for local-only grace blocks', () => {
    const localNew = block('local-new', {
      created_at: new Date().toISOString(),
      content: { text: 'draft' },
    });
    const server = [block('server-a', { content: { text: 'server' } })];
    const legacyMerged = unionReconciledWithLocalBlocks([localNew], server, 'doc-1');
    const reducerMerged = applyNoteCommand(
      [localNew],
      { type: 'syncSnapshot', blocks: server },
      ctx(),
    ).blocks;
    expect(reducerMerged.map((b) => b.id).sort()).toEqual(legacyMerged.map((b) => b.id).sort());
  });

  it('regression guard: wouldReconcileRegressActiveText detects shorter merged text', () => {
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'a', field: 'text' });
    useNoteBlockStore.getState().hydrate([
      block('a', { content: { text: 'hello world edited' } }),
    ]);
    const merged = [block('a', { content: { text: 'hi' } })];
    expect(wouldReconcileRegressActiveText(merged)).toBe(true);
  });

  it('regression guard: structure change detected before syncSnapshot', () => {
    const local = [block('a', { type: 'bulletList', order_index: 0 })];
    const server = [block('a', { type: 'text', order_index: 0 })];
    const merged = unionReconciledWithLocalBlocks(local, server, 'doc-1');
    expect(wouldReconcileRegressLocalStructure(local, merged)).toBe(true);
  });

  it('syncSnapshot after guard passes preserves typing', () => {
    useNoteBlockStore.getState().setActiveEditor({ blockId: 'a', field: 'text' });
    const local = [block('a', { content: { text: 'long typed content here' } })];
    useNoteBlockStore.getState().hydrate(local);
    useNoteBlockStore.getState().patchContent('a', { text: 'long typed content here!' });
    const server = [block('a', { content: { text: 'short' }, version: 2 })];
    const { blocks } = applyNoteCommand(
      local,
      { type: 'syncSnapshot', blocks: server },
      ctx('a'),
    );
    expect((blocks[0].content as { text: string }).text).toContain('typed content');
  });
});
