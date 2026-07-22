import { describe, expect, it } from 'vitest';
import {
  buildBlockForestTransferCommand,
} from './noteBlockTransfer';
import type { NoteBlock } from './types';

describe('buildBlockForestTransferCommand', () => {
  const block = (
    id: string,
    parent_block_id: string | null,
    order_index: number,
  ): NoteBlock => ({
    id,
    document_id: 'source',
    parent_block_id,
    type: 'text',
    order_index,
    content: { text: id },
    created_at: '',
    updated_at: '',
  });

  it('moves complete subtrees and removes nested duplicate selections', () => {
    const blocks = [
      block('root', null, 0),
      block('child', 'root', 0),
      block('grandchild', 'child', 0),
      block('other', null, 1),
    ];

    const command = buildBlockForestTransferCommand(
      blocks,
      ['root', 'child'],
      'target',
    );

    expect(command.rootIds).toEqual(['root']);
    expect(command.movedIds).toEqual(['root', 'child', 'grandchild']);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['other']);
    expect(command.patches).toEqual([
      { id: 'root', document_id: 'target', parent_block_id: null, order_index: 0 },
      { id: 'child', document_id: 'target' },
      { id: 'grandchild', document_id: 'target' },
    ]);
  });

  it('keeps child parent links while changing every moved block document id', () => {
    const blocks = [
      block('root', null, 0),
      block('child-a', 'root', 0),
      block('child-b', 'root', 1),
      block('grandchild', 'child-b', 0),
      block('other', null, 1),
    ];

    const command = buildBlockForestTransferCommand(
      blocks,
      ['child-b', 'root'],
      'target',
    );

    expect(command.rootIds).toEqual(['root']);
    expect(command.movedIds).toEqual(['root', 'child-a', 'child-b', 'grandchild']);
    expect(command.patches).toEqual([
      { id: 'root', document_id: 'target', parent_block_id: null, order_index: 0 },
      { id: 'child-a', document_id: 'target' },
      { id: 'child-b', document_id: 'target' },
      { id: 'grandchild', document_id: 'target' },
    ]);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['other']);
  });

  it('moves collapsed toggle forest without orphaning children', () => {
    const toggle: NoteBlock = {
      ...block('toggle', null, 0),
      type: 'toggle',
      content: { title: 'Section', collapsed: true },
    };
    const child: NoteBlock = {
      ...block('toggle-child', 'toggle', 0),
      content: { text: 'inside', html: '<p>inside</p>' },
    };
    const sibling = block('other', null, 1);

    const command = buildBlockForestTransferCommand(
      [toggle, child, sibling],
      ['toggle'],
      'target',
    );

    expect(command.rootIds).toEqual(['toggle']);
    expect(command.movedIds).toEqual(['toggle', 'toggle-child']);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['other']);
    expect(command.patches).toEqual([
      { id: 'toggle', document_id: 'target', parent_block_id: null, order_index: 0 },
      { id: 'toggle-child', document_id: 'target' },
    ]);
  });

  it('refuses to transfer a page link into the document it points to', () => {
    const page: NoteBlock = {
      ...block('page-link', null, 0),
      type: 'page',
      content: { title: 'Child', page_document_id: 'child-doc' },
    };
    const other = block('other', null, 1);
    const command = buildBlockForestTransferCommand(
      [page, other],
      ['page-link'],
      'child-doc',
    );
    expect(command.movedIds).toEqual([]);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['page-link', 'other']);
  });

  it('refuses to transfer a forest that contains a page link to the target document', () => {
    const parent = block('parent', null, 0);
    const nestedPage: NoteBlock = {
      ...block('nested-page', 'parent', 0),
      type: 'page',
      content: { title: 'Target', page_document_id: 'target' },
    };
    const safe = block('safe', null, 1);

    const command = buildBlockForestTransferCommand(
      [parent, nestedPage, safe],
      ['parent', 'safe'],
      'target',
    );

    expect(command.rootIds).toEqual(['safe']);
    expect(command.movedIds).toEqual(['safe']);
    expect(command.patches).toEqual([
      { id: 'safe', document_id: 'target', parent_block_id: null, order_index: 0 },
    ]);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['parent', 'nested-page']);
  });

  it('moves todo and toggle forests to a subpage while leaving page links in the parent document', () => {
    const todo: NoteBlock = {
      ...block('todo', null, 0),
      type: 'todo',
      content: { text: '7.20 월요일 11시 강승현 면접', checked: false },
    };
    const toggle: NoteBlock = {
      ...block('toggle', null, 1),
      type: 'toggle',
      content: { title: 'P0 핵심 과제', collapsed: true },
    };
    const toggleChild: NoteBlock = {
      ...block('toggle-child', 'toggle', 0),
      content: { text: '토글 자식 내용', html: '<p>토글 자식 내용</p>' },
    };
    const pageLink: NoteBlock = {
      ...block('page-link', null, 2),
      type: 'page',
      content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'target' },
    };

    const command = buildBlockForestTransferCommand(
      [todo, toggle, toggleChild, pageLink],
      ['todo', 'toggle'],
      'target',
    );

    expect(command.rootIds).toEqual(['todo', 'toggle']);
    expect(command.movedIds).toEqual(['todo', 'toggle', 'toggle-child']);
    expect(command.nextBlocks.map((item) => item.id)).toEqual(['page-link']);
    expect(command.patches).toEqual([
      { id: 'todo', document_id: 'target', parent_block_id: null, order_index: 0 },
      { id: 'toggle', document_id: 'target', parent_block_id: null, order_index: 1 },
      { id: 'toggle-child', document_id: 'target' },
    ]);
  });
});
