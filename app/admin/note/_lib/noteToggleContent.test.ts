import { describe, expect, it } from 'vitest';
import {
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

  it('migrates body to a child text block when toggle has no children', () => {
    const blocks = [toggle('t1', { title: 'Section', body: 'legacy body', bodyHtml: '<p>legacy</p>' })];
    const result = migrateToggleLegacyToChildBlocks(blocks);

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toMatchObject({
      type: 'text',
      parent_block_id: 't1',
      order_index: 0,
      content: expect.objectContaining({
        text: 'legacy body',
        html: '<p>legacy</p>',
        placedInToggle: true,
      }),
    });
    const migratedToggle = result.blocks.find((block) => block.id === 't1');
    expect(migratedToggle?.content?.body).toBeUndefined();
    expect(migratedToggle?.content?.bodyHtml).toBeUndefined();
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

  it('strips legacy body keys', () => {
    expect(stripToggleLegacyContentFields({
      title: 'T',
      body: 'x',
      bodyHtml: '<p>x</p>',
      legacyBody: 'y',
      images: ['https://example.com/a.png'],
    })).toEqual({ title: 'T' });
  });

  it('migrates legacy images to child image blocks', () => {
    const blocks = [toggle('t1', { title: 'T', images: ['https://example.com/a.png', ''] })];
    const result = migrateToggleLegacyToChildBlocks(blocks);

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toMatchObject({
      type: 'image',
      parent_block_id: 't1',
      content: expect.objectContaining({
        url: 'https://example.com/a.png',
        migratedFromToggleImages: true,
      }),
    });
    expect(result.blocks.find((block) => block.id === 't1')?.content?.images).toBeUndefined();
  });
});
