import { describe, expect, it } from 'vitest';
import {
  buildHistoryPersistSteps,
  buildHistoryTransactionNextBlocks,
  buildHistoryTransactionPlan,
  buildRestoreBlocksFieldPatches,
} from './noteHistoryTransactionPlan';
import type { NoteBlock } from '../_lib/types';

function block(
  id: string,
  overrides: Partial<NoteBlock> = {},
): NoteBlock {
  return {
    id,
    document_id: 'source',
    type: 'text',
    content: { text: id },
    parent_block_id: null,
    order_index: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('buildHistoryTransactionPlan', () => {
  it('plans undo patches that preserve todo, toggle-child, and page-link contracts', () => {
    const current = [
      block('todo', {
        document_id: 'target',
        type: 'todo',
        content: { text: '7.20 월요일 11시 강승현 면접', checked: true },
        order_index: 0,
      }),
      block('toggle', {
        document_id: 'target',
        type: 'toggle',
        content: { title: 'P0 핵심 과제', collapsed: true },
        order_index: 1,
      }),
      block('toggle-child', {
        document_id: 'target',
        parent_block_id: 'toggle',
        content: { text: '토글 자식 내용', html: '<p>토글 자식 내용</p>' },
        order_index: 0,
      }),
      block('page-link', {
        document_id: 'source',
        type: 'page',
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
        order_index: 2,
      }),
    ];
    const target = current.map((item) => ({
      ...item,
      document_id: 'source',
      parent_block_id: item.id === 'toggle-child' ? 'toggle' : null,
    }));

    const plan = buildHistoryTransactionPlan(current, target);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.restoreRoots).toEqual([]);
    expect(plan.fieldPatches).toEqual([
      expect.objectContaining({
        id: 'todo',
        document_id: 'source',
        type: 'todo',
        content: { text: '7.20 월요일 11시 강승현 면접', checked: true },
      }),
      expect.objectContaining({
        id: 'toggle',
        document_id: 'source',
        type: 'toggle',
        content: { title: 'P0 핵심 과제', collapsed: true },
      }),
      expect.objectContaining({
        id: 'toggle-child',
        document_id: 'source',
        parent_block_id: 'toggle',
        content: { text: '토글 자식 내용', html: '<p>토글 자식 내용</p>' },
      }),
      expect.objectContaining({
        id: 'page-link',
        document_id: 'source',
        type: 'page',
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      }),
    ]);
  });

  it('restores only missing forest roots so toggle children are restored with their parent', () => {
    const current = [block('outside')];
    const target = [
      block('outside'),
      block('toggle', { type: 'toggle', content: { title: 'P0' } }),
      block('child', { parent_block_id: 'toggle', content: { text: 'inside' } }),
    ];

    const plan = buildHistoryTransactionPlan(current, target);

    expect(plan.restoreRoots.map((item) => item.id)).toEqual(['toggle']);
    expect(plan.fieldPatches.map((item) => item.id)).toEqual(['outside', 'toggle', 'child']);
  });

  it('builds the next undo snapshot from the plan and absorbed restore versions', () => {
    const current = [
      block('outside'),
      block('remove-me', { order_index: 1 }),
    ];
    const target = [
      block('outside', { order_index: 0 }),
      block('restored', { order_index: 1, version: 1 }),
    ];
    const plan = buildHistoryTransactionPlan(current, target);
    const next = buildHistoryTransactionNextBlocks({
      current,
      target,
      plan,
      restoredById: new Map([
        ['restored', block('restored', { version: 7 })],
      ]),
    });

    expect(next.map((item) => item.id)).toEqual(['outside', 'restored']);
    expect(next.find((item) => item.id === 'restored')?.version).toBe(7);
  });

  it('builds stable history persist steps in delete restore patch order', () => {
    const current = [
      block('delete-me'),
      block('keep', { order_index: 1 }),
    ];
    const target = [
      block('keep', { order_index: 0 }),
      block('restore-me', { order_index: 1 }),
    ];
    const plan = buildHistoryTransactionPlan(current, target);

    expect(buildHistoryPersistSteps(plan).map((step) => step.type)).toEqual([
      'softDelete',
      'restoreRoots',
      'patchFields',
    ]);
  });

  it('builds restore-block patches without dropping structured block content', () => {
    const snapshots = [
      block('callout', {
        type: 'callout',
        content: {
          text: 'line one\nline two',
          html: '<p>line one<br>line two</p>',
          icon: '!',
          blockColor: 'yellow',
        },
      }),
      block('todo', {
        type: 'todo',
        order_index: 1,
        content: { text: '7.20 강승현 면접', checked: false },
      }),
      block('page-link', {
        type: 'page',
        order_index: 2,
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      }),
    ];

    expect(buildRestoreBlocksFieldPatches(snapshots)).toEqual([
      expect.objectContaining({
        id: 'callout',
        type: 'callout',
        content: expect.objectContaining({
          html: '<p>line one<br>line two</p>',
          icon: '!',
          blockColor: 'yellow',
        }),
      }),
      expect.objectContaining({
        id: 'todo',
        type: 'todo',
        content: { text: '7.20 강승현 면접', checked: false },
      }),
      expect.objectContaining({
        id: 'page-link',
        type: 'page',
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      }),
    ]);
  });

  it('deletes removed subtrees as a forest within the transaction scope', () => {
    const current = [
      block('toggle', { type: 'toggle', content: { title: 'remove' } }),
      block('child', { parent_block_id: 'toggle', content: { text: 'remove child' } }),
      block('keep', { order_index: 1 }),
    ];
    const target = [block('keep', { order_index: 0 })];

    const plan = buildHistoryTransactionPlan(current, target);

    expect(plan.deleteIds).toEqual(['toggle', 'child']);
    expect(plan.fieldPatches).toEqual([
      expect.objectContaining({ id: 'keep', order_index: 0 }),
    ]);
  });

  it('deletes a page container with its local child subtree', () => {
    const current = [
      block('page-link', {
        type: 'page',
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      }),
      block('misplaced-child', {
        parent_block_id: 'page-link',
        content: { text: 'must not be deleted through page link deletion' },
      }),
      block('keep', { order_index: 1 }),
    ];
    const target = [block('keep', { order_index: 0 })];

    const plan = buildHistoryTransactionPlan(current, target);

    expect(plan.deleteIds).toEqual(['page-link', 'misplaced-child']);
    expect(plan.fieldPatches.map((patch) => patch.id)).toEqual(['keep']);
  });

  it('plans undo for mixed structural paste without dropping anchor metadata', () => {
    const current = [
      block('anchor', {
        type: 'toggle',
        content: { title: 'P0 핵심 과제', collapsed: true },
      }),
      block('pasted-todo', {
        type: 'todo',
        parent_block_id: 'anchor',
        content: { text: '7.20 강승현 면접', checked: false },
      }),
      block('pasted-page', {
        type: 'page',
        order_index: 1,
        content: { title: '최지훈 업무노트 하위페이지', page_document_id: 'child-doc-1' },
      }),
    ];
    const target = [
      block('anchor', {
        type: 'callout',
        content: {
          text: '원래 콜아웃',
          html: '<p>원래 콜아웃</p>',
          icon: '!',
          blockColor: 'yellow',
        },
      }),
    ];

    const plan = buildHistoryTransactionPlan(current, target);

    expect(plan.deleteIds).toEqual(['pasted-todo', 'pasted-page']);
    expect(plan.restoreRoots).toEqual([]);
    expect(plan.fieldPatches).toEqual([
      expect.objectContaining({
        id: 'anchor',
        type: 'callout',
        content: {
          text: '원래 콜아웃',
          html: '<p>원래 콜아웃</p>',
          icon: '!',
          blockColor: 'yellow',
        },
      }),
    ]);
  });

  it('undoes a deleted schedule checklist forest by restoring only the durable root', () => {
    const current = [
      block('p0-heading', {
        type: 'heading',
        content: { text: 'P0 (핵심 과제 및 일주일 내로 처리 문제)' },
        order_index: 0,
      }),
    ];
    const target = [
      current[0],
      block('interview', {
        type: 'todo',
        content: { text: '7.20 월요일 11시 강승현 면접', checked: false },
        order_index: 1,
      }),
      block('ot-toggle', {
        type: 'toggle',
        content: { title: 'OT 일정', collapsed: false },
        order_index: 2,
      }),
      block('ot-child', {
        type: 'todo',
        parent_block_id: 'ot-toggle',
        content: { text: '면접/OT 자료 확인', checked: false },
        order_index: 0,
      }),
    ];

    const plan = buildHistoryTransactionPlan(current, target);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.restoreRoots.map((item) => item.id)).toEqual(['interview', 'ot-toggle']);
    expect(plan.fieldPatches).toEqual([
      expect.objectContaining({
        id: 'p0-heading',
        content: { text: 'P0 (핵심 과제 및 일주일 내로 처리 문제)' },
      }),
      expect.objectContaining({
        id: 'interview',
        type: 'todo',
        content: { text: '7.20 월요일 11시 강승현 면접', checked: false },
      }),
      expect.objectContaining({
        id: 'ot-toggle',
        type: 'toggle',
        content: { title: 'OT 일정', collapsed: false },
      }),
      expect.objectContaining({
        id: 'ot-child',
        parent_block_id: 'ot-toggle',
        type: 'todo',
        content: { text: '면접/OT 자료 확인', checked: false },
      }),
    ]);
  });

  it('redo after restored schedule deletion removes the whole restored forest again', () => {
    const current = [
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
      block('keep', { order_index: 2 }),
    ];
    const target = [block('keep', { order_index: 0 })];

    const plan = buildHistoryTransactionPlan(current, target);

    expect(plan.deleteIds).toEqual(['interview', 'ot-toggle', 'ot-child']);
    expect(buildHistoryPersistSteps(plan).map((step) => step.type)).toEqual([
      'softDelete',
      'patchFields',
    ]);
  });
});
