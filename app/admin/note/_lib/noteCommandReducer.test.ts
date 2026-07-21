import { describe, expect, it } from 'vitest';
import { applyNoteCommand } from './noteCommandReducer';
import type { NoteBlock } from './types';

function block(id: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text: '', html: '<p></p>' },
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
    version: 1,
    ...overrides,
  };
}

function snapshot(item: NoteBlock) {
  return {
    id: item.id,
    document_id: item.document_id,
    parent_block_id: item.parent_block_id ?? null,
    type: item.type,
    order_index: item.order_index,
    content: item.content as Record<string, unknown>,
    version: item.version ?? 1,
    updated_at: item.updated_at ?? '2026-07-09T00:00:00Z',
    deleted_at: item.deleted_at ?? null,
  };
}

const ctx = {
  documentId: 'doc-1',
  activeBlockId: null,
  storeContentById: {},
};

describe('applyNoteCommand', () => {
  it('hydrate replaces document blocks', () => {
    const previous = [block('old')];
    const incoming = [block('new')];
    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'hydrate', blocks: incoming },
      ctx,
    );
    expect(structural).toBe(true);
    expect(blocks.map((b) => b.id)).toEqual(['new']);
  });

  it('syncSnapshot keeps local-only blocks within grace period', () => {
    const recent = block('local-only', {
      created_at: new Date().toISOString(),
    });
    const previous = [recent];
    const incoming = [block('server')];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: incoming },
      ctx,
    );
    expect(blocks.map((b) => b.id).sort()).toEqual(['local-only', 'server']);
  });

  it('mergeSnapshots preserves local checklist order from stale snapshot', () => {
    const local = [
      block('todo-c', { type: 'todo', order_index: 0, content: { text: 'C', checked: false } }),
      block('todo-a', { type: 'todo', order_index: 1, content: { text: 'A', checked: false } }),
      block('todo-b', { type: 'todo', order_index: 2, content: { text: 'B', checked: false } }),
    ];

    const { blocks } = applyNoteCommand(
      local,
      {
        type: 'mergeSnapshots',
        snapshots: [
          snapshot(block('todo-a', { type: 'todo', order_index: 0, content: { text: 'A server', checked: false }, version: 2 })),
          snapshot(block('todo-b', { type: 'todo', order_index: 1, content: { text: 'B server', checked: false }, version: 2 })),
          snapshot(block('todo-c', { type: 'todo', order_index: 2, content: { text: 'C server', checked: false }, version: 2 })),
        ],
      },
      { ...ctx, hasUnpublishedTopology: true },
    );

    expect(blocks.map((item) => item.id)).toEqual(['todo-c', 'todo-a', 'todo-b']);
    expect(blocks.map((item) => item.order_index)).toEqual([0, 1, 2]);
    expect(blocks.find((item) => item.id === 'todo-a')?.content).toMatchObject({ text: 'A' });
  });

  it('syncSnapshot keeps a just-created child-page todo missing from stale server snapshot', () => {
    const page = block('page', { type: 'page', order_index: 0, content: { title: 'Center', page_document_id: 'child-doc' } });
    const first = block('first', {
      type: 'todo',
      parent_block_id: 'page',
      order_index: 0,
      content: { text: 'first checklist', checked: false },
    });
    const created = block('new-local', {
      type: 'todo',
      parent_block_id: 'page',
      order_index: 1,
      created_at: new Date().toISOString(),
      content: { text: '', html: '<p></p>', checked: false },
    });
    const local = [page, first, created];
    const staleIncoming = [page, first];

    const { blocks } = applyNoteCommand(
      local,
      { type: 'syncSnapshot', blocks: staleIncoming },
      { ...ctx, activeBlockId: 'new-local', hasUnpublishedTopology: true },
    );

    expect(blocks.find((item) => item.id === 'new-local')).toMatchObject({
      type: 'todo',
      parent_block_id: 'page',
      order_index: 1,
    });
  });

  it('patchContent updates a single block', () => {
    const previous = [block('a', { content: { text: 'old' } })];
    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'patchContent', blockId: 'a', content: { text: 'new' } },
      ctx,
    );
    expect(structural).toBe(false);
    expect((blocks[0].content as { text: string }).text).toBe('new');
  });

  it('applyPatches re-sanitizes structure after a parent loses container capability', () => {
    const previous = [
      block('toggle', { type: 'toggle', order_index: 0, content: { title: 'Section' } }),
      block('child', { type: 'todo', parent_block_id: 'toggle', order_index: 0, content: { text: 'child', checked: false } }),
      block('after', { type: 'text', order_index: 1, content: { text: 'after' } }),
    ];

    const { blocks } = applyNoteCommand(
      previous,
      { type: 'applyPatches', patches: [{ id: 'toggle', type: 'text' }] },
      ctx,
    );

    expect(blocks.find((item) => item.id === 'toggle')?.type).toBe('text');
    expect(blocks.find((item) => item.id === 'child')?.parent_block_id).toBeNull();
    expect(blocks.filter((item) => !item.parent_block_id).map((item) => item.order_index)).toEqual([0, 1, 2]);
  });

  it('applyPatches breaks cycles introduced by stale structural patches', () => {
    const previous = [
      block('page-a', { type: 'page', order_index: 0 }),
      block('page-b', { type: 'page', parent_block_id: 'page-a', order_index: 0 }),
    ];

    const { blocks } = applyNoteCommand(
      previous,
      { type: 'applyPatches', patches: [{ id: 'page-a', parent_block_id: 'page-b' }] },
      ctx,
    );

    expect(blocks.every((item) => item.parent_block_id !== item.id)).toBe(true);
    expect(blocks.find((item) => item.id === 'page-a')?.parent_block_id).toBeNull();
    expect(blocks.find((item) => item.id === 'page-b')?.parent_block_id).toBeNull();
    expect(blocks.map((item) => item.order_index)).toEqual([0, 1]);
  });

  it('syncSnapshot does not wipe local blocks when server snapshot is empty', () => {
    const previous = [block('a', { content: { text: '하위타이핑유지', html: '<p>하위타이핑유지</p>' } })];
    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: [] },
      {
        ...ctx,
        storeContentById: { a: { text: '하위타이핑유지', html: '<p>하위타이핑유지</p>' } },
      },
    );
    expect(structural).toBe(false);
    expect((blocks[0].content as { text: string }).text).toBe('하위타이핑유지');
  });

  it('syncSnapshot accepts empty when emptyConfirmed', () => {
    const previous = [block('a', { content: { text: 'gone', html: '<p>gone</p>' } })];
    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: [], emptyConfirmed: true },
      ctx,
    );
    expect(structural).toBe(true);
    expect(blocks).toHaveLength(0);
  });

  it('syncSnapshot accepts empty when pending leave covers all local ids', () => {
    const previous = [block('a', { content: { text: 'gone', html: '<p>gone</p>' } })];
    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: [] },
      { ...ctx, pendingLeaveIds: new Set(['a']) },
    );
    expect(structural).toBe(true);
    expect(blocks).toHaveLength(0);
  });

  it('hydrate preserves store typing over empty server block', () => {
    const previous = [block('a', { content: { text: 'typed', html: '<p>typed</p>' } })];
    const incoming = [block('a', { content: { text: '', html: '<p></p>' } })];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'hydrate', blocks: incoming },
      { ...ctx, storeContentById: { a: { text: 'typed', html: '<p>typed</p>' } } },
    );
    expect((blocks[0].content as { text: string }).text).toBe('typed');
  });

  it('drops inactive empty todo placeholders from structural snapshots', () => {
    const previous = [
      block('heading', { type: 'heading3', content: { text: '총괄 체크', html: '<p>총괄 체크</p>' } }),
      block('empty-todo', { type: 'todo', order_index: 1, content: { text: '', html: '<p></p>', checked: false } }),
      block('todo', { type: 'todo', order_index: 2, content: { text: '마포 연락', html: '<p>마포 연락</p>', checked: false } }),
    ];

    const { blocks } = applyNoteCommand(
      previous,
      { type: 'replaceBlocks', blocks: previous },
      ctx,
    );

    expect(blocks.map((item) => item.id)).toEqual(['heading', 'todo']);
  });

  it('keeps the active empty todo while the user is editing it', () => {
    const previous = [
      block('empty-todo', { type: 'todo', content: { text: '', html: '<p></p>', checked: false } }),
    ];

    const { blocks } = applyNoteCommand(
      previous,
      { type: 'replaceBlocks', blocks: previous },
      { ...ctx, activeBlockId: 'empty-todo' },
    );

    expect(blocks.map((item) => item.id)).toEqual(['empty-todo']);
  });

  it('drops inactive empty text, bullet, and numbered placeholders too', () => {
    const previous = [
      block('text-empty', { type: 'text', order_index: 0, content: { text: '', html: '<p></p>' } }),
      block('bullet-empty', { type: 'bulletList', order_index: 1, content: { text: '', html: '<p></p>' } }),
      block('numbered-empty', { type: 'numberedList', order_index: 2, content: { text: '', html: '<p></p>' } }),
      block('text-live', { type: 'text', order_index: 3, content: { text: 'live', html: '<p>live</p>' } }),
    ];

    const { blocks } = applyNoteCommand(
      previous,
      { type: 'replaceBlocks', blocks: previous },
      ctx,
    );

    expect(blocks.map((item) => item.id)).toEqual(['text-live']);
  });

  it('keeps an active empty bullet while the user is editing it', () => {
    const previous = [
      block('bullet-empty', { type: 'bulletList', order_index: 0, content: { text: '', html: '<p></p>' } }),
      block('todo-empty', { type: 'todo', order_index: 1, content: { text: '', html: '<p></p>', checked: false } }),
      block('todo-live', { type: 'todo', order_index: 2, content: { text: 'live', html: '<p>live</p>', checked: false } }),
    ];

    const { blocks } = applyNoteCommand(
      previous,
      { type: 'replaceBlocks', blocks: previous },
      { ...ctx, activeBlockId: 'bullet-empty' },
    );

    expect(blocks.map((item) => item.id)).toEqual(['bullet-empty', 'todo-live']);
  });

  it('preserves local checklist order from stale syncSnapshot while editing', () => {
    const local = [
      block('todo-c', { type: 'todo', order_index: 0, content: { text: 'C', checked: false } }),
      block('todo-a', { type: 'todo', order_index: 1, content: { text: 'A', checked: false } }),
      block('todo-b', { type: 'todo', order_index: 2, content: { text: 'B', checked: false } }),
    ];
    const staleIncoming = [
      block('todo-a', { type: 'todo', order_index: 0, content: { text: 'A', checked: false } }),
      block('todo-b', { type: 'todo', order_index: 1, content: { text: 'B', checked: false } }),
      block('todo-c', { type: 'todo', order_index: 2, content: { text: 'C', checked: false } }),
    ];

    const { blocks } = applyNoteCommand(
      local,
      { type: 'syncSnapshot', blocks: staleIncoming },
      { ...ctx, activeBlockId: 'todo-a' },
    );

    expect(blocks.map((item) => item.id)).toEqual(['todo-c', 'todo-a', 'todo-b']);
    expect(blocks.map((item) => item.order_index)).toEqual([0, 1, 2]);
  });

  it('preserves existing block positions from syncSnapshot even when no editor is active', () => {
    const local = [
      block('heading', { type: 'heading3', order_index: 0, content: { text: '총괄' } }),
      block('todo-c', { type: 'todo', order_index: 1, content: { text: 'C', checked: false } }),
      block('todo-a', { type: 'todo', order_index: 2, content: { text: 'A edited', checked: false } }),
      block('todo-b', { type: 'todo', order_index: 3, content: { text: 'B', checked: false } }),
    ];
    const staleIncoming = [
      block('heading', { type: 'heading3', order_index: 0, content: { text: '총괄' } }),
      block('todo-a', { type: 'todo', order_index: 1, content: { text: 'A server', checked: false } }),
      block('todo-b', { type: 'todo', order_index: 2, content: { text: 'B server', checked: false } }),
      block('todo-c', { type: 'todo', order_index: 3, content: { text: 'C server', checked: false } }),
    ];

    const { blocks } = applyNoteCommand(
      local,
      { type: 'syncSnapshot', blocks: staleIncoming },
      ctx,
    );

    expect(blocks.map((item) => item.id)).toEqual(['heading', 'todo-c', 'todo-a', 'todo-b']);
    expect(blocks.find((item) => item.id === 'todo-a')?.content).toMatchObject({ text: 'A server' });
  });

  it('syncSnapshot preserves local page-link identity over empty incoming content', () => {
    const previous = [block('page-link', {
      type: 'page',
      content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
    })];
    const incoming = [block('page-link', {
      type: 'page',
      content: { title: '', page_document_id: '' },
    })];
    const { blocks } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: incoming },
      {
        ...ctx,
        storeContentById: {
          'page-link': { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
        },
      },
    );

    expect(blocks[0].content).toMatchObject({
      title: '최지훈 업무노트 하위페이지',
      page_document_id: 'child-doc-1',
    });
  });

  it('syncSnapshot recovers server blocks missing from stale local snapshot', () => {
    const serverBlocks = [
      block('toggle', { type: 'toggle', content: { title: 'Gym' } }),
      block('text-child', { parent_block_id: 'toggle', content: { text: 'content' } }),
      block('img-child', { type: 'image', parent_block_id: 'toggle' }),
    ];
    const staleLocal = [block('toggle', { type: 'toggle', content: { title: 'Gym', bodyMigrated: true } })];
    const { blocks } = applyNoteCommand(
      staleLocal,
      { type: 'syncSnapshot', blocks: serverBlocks },
      ctx,
    );
    expect(blocks.map((b) => b.id).sort()).toEqual(
      ['img-child', 'text-child', 'toggle'].sort(),
    );
  });

  it('rejects an unconfirmed empty syncSnapshot for schedule checklist content', () => {
    const previous = [
      block('interview', {
        type: 'todo',
        content: { text: '7.20 월요일 11시 강승현 면접', checked: false },
        order_index: 0,
      }),
      block('ot-toggle', {
        type: 'toggle',
        content: { title: 'OT 일정', collapsed: false },
        order_index: 1,
      }),
      block('ot-child', {
        type: 'todo',
        parent_block_id: 'ot-toggle',
        content: { text: '면접/OT 자료 확인', checked: false },
        order_index: 0,
      }),
    ];

    const { blocks, structural } = applyNoteCommand(
      previous,
      { type: 'syncSnapshot', blocks: [] },
      {
        ...ctx,
        storeContentById: {
          interview: { text: '7.20 월요일 11시 강승현 면접', checked: false },
          'ot-toggle': { title: 'OT 일정', collapsed: false },
          'ot-child': { text: '면접/OT 자료 확인', checked: false },
        },
      },
    );

    expect(structural).toBe(false);
    expect(blocks.map((item) => item.id)).toEqual(['interview', 'ot-toggle', 'ot-child']);
    expect(blocks.find((item) => item.id === 'interview')?.content).toMatchObject({
      text: '7.20 월요일 11시 강승현 면접',
      checked: false,
    });
  });
});
