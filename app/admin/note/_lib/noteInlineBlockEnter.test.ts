import { describe, expect, it } from 'vitest';
import { createInlineBlockEnterHandler } from './noteInlineBlockEnter';
import { setNoteMergeSplitHint } from './noteMergeSplitHint';
import type { NoteBlock } from './types';

const block = (id: string, type: NoteBlock['type'] = 'text'): NoteBlock => ({
  id,
  document_id: 'doc',
  parent_block_id: null,
  type,
  order_index: 0,
  content: { text: 'hello world' },
  created_at: '',
  updated_at: '',
});

describe('createInlineBlockEnterHandler', () => {
  it('restores list type when Enter splits text at a merge hint offset', () => {
    const added: Array<{ type?: NoteBlock['type']; content?: Record<string, unknown> }> = [];
    setNoteMergeSplitHint({
      blockId: 'a',
      offset: 6,
      blockType: 'numberedList',
    });

    const handler = createInlineBlockEnterHandler({
      block: block('a'),
      followType: 'text',
      text: 'hello world',
      onAddBelow: (type, content) => added.push({ type, content }),
    });

    handler({
      isEmpty: false,
      split: {
        beforeText: 'hello ',
        beforeHtml: '<p>hello </p>',
        afterText: 'world',
        afterHtml: '<p>world</p>',
      },
    });

    expect(added).toEqual([{
      type: 'numberedList',
      content: {
        text: 'world',
        html: '<p>world</p>',
      },
    }]);
  });
});
