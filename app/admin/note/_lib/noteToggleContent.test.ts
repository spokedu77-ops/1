import { describe, expect, it } from 'vitest';
import { buildDeleteBlockForestCommand } from './noteBlockCommands';
import {
  buildToggleLegacyCleanupPatches,
  migrateToggleLegacyToChildBlocks,
  stripToggleLegacyContentFields,
  toggleBodyHasLegacyContent,
} from './noteToggleContent';
import type { NoteBlock } from './types';

const toggle = (id: string, content: Record<string, unknown>, document_id = 'doc'): NoteBlock => ({
  id,
  document_id,
  type: 'toggle',
  content,
  order_index: 0,
  parent_block_id: null,
  created_at: '',
  updated_at: '',
});

describe('toggle body migration', () => {
  it('detects legacy toggle body fields', () => {
    expect(toggleBodyHasLegacyContent({ title: 'T', body: 'hello' })).toBe(true);
    expect(toggleBodyHasLegacyContent({ title: 'T', body: '  ' })).toBe(false);
  });

  it('does not create a child text block from legacy body when toggle has no children', () => {
    const blocks = [toggle('t1', { title: 'Section', body: 'legacy body', bodyHtml: '<p>legacy</p>' })];
    const result = migrateToggleLegacyToChildBlocks(blocks);

    expect(result.created).toHaveLength(0);
    expect(result.updatedChildPatches).toHaveLength(0);
    const migratedToggle = result.blocks.find((block) => block.id === 't1');
    expect(migratedToggle?.content?.body).toBe('legacy body');
    expect(migratedToggle?.content?.bodyHtml).toBe('<p>legacy</p>');
    expect(result.updatedToggleIds).toEqual([]);
  });

  it('strips orphaned legacyBody when bodyMigrated but child was deleted — no zombie recreate', () => {
    const blocks = [toggle('t1', {
      title: '체육관 이용방법',
      body: '',
      legacyBody: '이용 안내 본문',
      bodyMigrated: true,
    })];
    const result = migrateToggleLegacyToChildBlocks(blocks);

    expect(result.created).toHaveLength(0);
    const migratedToggle = result.blocks.find((block) => block.id === 't1');
    expect(migratedToggle?.content?.legacyBody).toBeUndefined();
    expect(migratedToggle?.content?.bodyMigrated).toBe(true);
    expect(result.updatedToggleIds).toEqual(['t1']);
  });

  it('skips migration when toggle already has children', () => {
    const blocks = [
      toggle('t1', { title: 'T', body: 'legacy' }),
      {
        ...toggle('c1', { text: 'child' }),
        type: 'text',
        parent_block_id: 't1',
        order_index: 0,
      },
    ];
    const result = migrateToggleLegacyToChildBlocks(blocks);
    expect(result.created).toHaveLength(0);
    expect(result.blocks.find((block) => block.id === 't1')?.content?.body).toBe('legacy');
  });

  it('migrates legacy body into an existing empty child instead of creating a duplicate child', () => {
    const blocks = [
      toggle('t1', { title: 'T', body: 'legacy body', bodyHtml: '<p>legacy body</p>' }),
      {
        ...toggle('empty-child', { text: '', html: '' }),
        type: 'text' as const,
        parent_block_id: 't1',
        order_index: 0,
      },
    ];

    const result = migrateToggleLegacyToChildBlocks(blocks);

    expect(result.created).toHaveLength(0);
    expect(result.updatedChildPatches).toEqual([
      {
        id: 'empty-child',
        content: {
          text: 'legacy body',
          html: '<p>legacy body</p>',
          placedInToggle: true,
          migratedFromToggleBody: true,
        },
      },
    ]);
    const migratedToggle = result.blocks.find((block) => block.id === 't1');
    expect(migratedToggle?.content).toEqual({ title: 'T' });
  });

  it('does not cleanup toggle legacy archive while another displayable child remains', () => {
    const toggleBlock = toggle('t1', {
      title: 'Section',
      legacyBody: 'archive until every display child is gone',
      bodyMigrated: true,
    });
    const removedChild = {
      ...toggle('c1', { text: 'migrated', migratedFromToggleBody: true }),
      type: 'text' as const,
      parent_block_id: 't1',
      order_index: 0,
    };
    const remainingChild = {
      ...toggle('c2', { text: 'remaining child' }),
      type: 'text' as const,
      parent_block_id: 't1',
      order_index: 1,
    };

    const patches = buildToggleLegacyCleanupPatches(
      [removedChild],
      [toggleBlock, remainingChild],
    );

    expect(patches).toEqual([]);
  });

  it('strips legacy body keys', () => {
    expect(stripToggleLegacyContentFields({
      title: 'T',
      body: 'x',
      bodyHtml: '<p>x</p>',
      legacyBody: 'y',
      images: ['https://example.com/a.png'],
    })).toEqual({ title: 'T' });
  });

  it('cleans up toggle legacy archive when last child is deleted', () => {
    const toggleBlock = toggle('t1', {
      title: 'Section',
      legacyBody: 'zombie source',
      bodyMigrated: true,
    });
    const child = {
      ...toggle('c1', { text: 'child', migratedFromToggleBody: true }),
      type: 'text' as const,
      parent_block_id: 't1',
      order_index: 0,
    };
    const patches = buildToggleLegacyCleanupPatches(
      [child],
      [toggleBlock],
    );
    expect(patches).toHaveLength(1);
    expect(patches[0].id).toBe('t1');
    expect(patches[0].content.legacyBody).toBeUndefined();
    expect(patches[0].content.bodyMigrated).toBe(true);
  });

  it('does not create child image blocks from legacy images on load', () => {
    const blocks = [toggle('t1', { title: 'T', images: ['https://example.com/a.png', ''] })];
    const result = migrateToggleLegacyToChildBlocks(blocks);

    expect(result.created).toHaveLength(0);
    expect(result.blocks.find((block) => block.id === 't1')?.content?.images).toEqual(['https://example.com/a.png', '']);
  });

  it('invariant: delete last toggle child + reload must not zombie-recreate from legacyBody', () => {
    const parent = toggle('t1', {
      title: 'Section',
      legacyBody: '좀비방지본문',
      bodyMigrated: true,
    });
    const child = {
      ...toggle('c1', { text: 'child', migratedFromToggleBody: true }),
      type: 'text' as const,
      parent_block_id: 't1',
      order_index: 0,
    };
    const deleted = buildDeleteBlockForestCommand([parent, child], [child.id]);
    const patches = buildToggleLegacyCleanupPatches(deleted.removedBlocks, deleted.nextBlocks);
    const patchById = new Map(patches.map((patch) => [patch.id, patch.content]));
    const afterDelete = deleted.nextBlocks.map((block) => {
      const patch = patchById.get(block.id);
      return patch ? { ...block, content: patch } : block;
    });

    const reloaded = migrateToggleLegacyToChildBlocks(afterDelete);
    expect(reloaded.created).toHaveLength(0);
    expect(reloaded.blocks.filter((b) => b.parent_block_id === 't1')).toHaveLength(0);
    const toggleAfter = reloaded.blocks.find((b) => b.id === 't1');
    expect(toggleAfter?.content?.legacyBody).toBeUndefined();
    expect(toggleAfter?.content?.bodyMigrated).toBe(true);
  });
});
