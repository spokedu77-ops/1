import { describe, expect, it } from 'vitest';
import type { NoteBlock } from './types';
import {
  buildBlockClipboardPayload,
  clipboardPayloadToPasteSpecs,
  parseBlockClipboardText,
  serializeBlockClipboardPayload,
} from './noteBlockClipboard';

function block(
  id: string,
  type: NoteBlock['type'],
  order: number,
  parentId: string | null = null,
  content: Record<string, unknown> = {},
): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    type,
    order_index: order,
    parent_block_id: parentId,
    content,
    created_at: '',
    updated_at: '',
    version: 1,
  };
}

describe('noteBlockClipboard', () => {
  it('serializes and parses selected block forest', () => {
    const blocks: NoteBlock[] = [
      block('a', 'page', 0, null, { title: 'Root', page_document_id: 'page-a' }),
      block('b', 'bulletList', 1, 'a', { text: 'Child' }),
      block('c', 'text', 2, null, { text: 'Sibling' }),
    ];
    const payload = buildBlockClipboardPayload(blocks, ['a', 'b']);
    expect(payload?.blocks).toHaveLength(1);
    expect(payload?.blocks[0].children).toHaveLength(1);

    const serialized = serializeBlockClipboardPayload(payload!);
    const parsed = parseBlockClipboardText(serialized);
    expect(parsed).toEqual(payload);

    const specs = clipboardPayloadToPasteSpecs(parsed!);
    expect(specs[0]).toMatchObject({ type: 'page', text: 'Root' });
    expect(specs[0].children?.[0]).toMatchObject({ type: 'bulletList', text: 'Child' });
  });

  it('maps toggle and table nodes to paste specs', () => {
    const payload = {
      version: 1 as const,
      blocks: [{
        type: 'toggle' as const,
        content: { title: 'Toggle title', collapsed: true },
        children: [{ type: 'text' as const, content: { text: 'Inside' } }],
      }, {
        type: 'table' as const,
        content: {
          rows: [['A', 'B']],
          hasHeaderRow: true,
          columnCount: 2,
        },
      }],
    };
    const specs = clipboardPayloadToPasteSpecs(payload);
    expect(specs[0]).toMatchObject({
      type: 'toggle',
      text: 'Toggle title',
      collapsed: true,
    });
    expect(specs[0].children?.[0]).toMatchObject({ type: 'text', text: 'Inside' });
    expect(specs[1]).toMatchObject({
      type: 'table',
      tableContent: {
        rows: [['A', 'B']],
        hasHeaderRow: true,
        columnCount: 2,
      },
    });
  });
});
