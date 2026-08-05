import { describe, expect, it } from 'vitest';
import {
  assertMigrationPreservesUserContent,
  findSilentUserPayloadRegressions,
  hasDuplicateSiblingOrders,
  mergePassiveIncomingContent,
  sealPassiveIncomingBlock,
  sealPassiveIncomingBlocks,
  siblingRelativeOrderSignature,
  userContentFingerprint,
} from './noteDataIntegrity';
import type { NoteBlock } from './types';

const block = (
  id: string,
  text: string,
  extra?: Partial<NoteBlock>,
): NoteBlock => ({
  id,
  document_id: 'doc',
  type: 'text',
  content: { text },
  order_index: 0,
  parent_block_id: null,
  created_at: '',
  updated_at: '',
  ...extra,
});

describe('noteDataIntegrity', () => {
  it('fingerprint ignores topology-only fields', () => {
    expect(userContentFingerprint({ text: 'a', listNestLevel: 2 })).toContain('text:a');
    expect(userContentFingerprint({ text: 'a', listNestLevel: 2 })).not.toContain('listNestLevel');
  });

  it('mergePassiveIncomingContent refuses empty wipe of local text', () => {
    const next = mergePassiveIncomingContent({ text: 'keep' }, { text: '' });
    expect(next.text).toBe('keep');
  });

  it('mergePassiveIncomingContent refuses stale prefix truncation', () => {
    const next = mergePassiveIncomingContent({ text: 'hello world' }, { text: 'hello' });
    expect(next.text).toBe('hello world');
  });

  it('mergePassiveIncomingContent rejects non-extension remote rewrite of filled local text', () => {
    const next = mergePassiveIncomingContent({ text: 'old' }, { text: 'brand new' });
    expect(next.text).toBe('old');
  });

  it('mergePassiveIncomingContent accepts strict extension of local text', () => {
    const next = mergePassiveIncomingContent({ text: 'old' }, { text: 'old and more' });
    expect(next.text).toBe('old and more');
  });

  it('mergePassiveIncomingContent rejects short-prefix false extensions like A → A server', () => {
    const next = mergePassiveIncomingContent({ text: 'A' }, { text: 'A server' });
    expect(next.text).toBe('A');
  });

  it('mergePassiveIncomingContent rejects newline paste residue as extension', () => {
    const next = mergePassiveIncomingContent(
      { text: '긴줄넘기' },
      { text: '긴줄넘기\n플로어 컬링' },
    );
    expect(next.text).toBe('긴줄넘기');
  });

  it('mergePassiveIncomingContent rejects equal-length different text', () => {
    const next = mergePassiveIncomingContent({ text: 'typing!!' }, { text: 'previous' });
    expect(next.text).toBe('typing!!');
  });

  it('mergePassiveIncomingContent keeps checked when remote unchecks without text change', () => {
    const next = mergePassiveIncomingContent(
      { text: 'todo', checked: true },
      { text: 'todo', checked: false },
    );
    expect(next.checked).toBe(true);
  });

  it('mergePassiveIncomingContent keeps checked on empty-text todo', () => {
    const next = mergePassiveIncomingContent(
      { text: '', checked: true },
      { text: '', checked: false },
    );
    expect(next.checked).toBe(true);
  });

  it('mergePassiveIncomingContent keeps page_document_id when incoming clears it', () => {
    const next = mergePassiveIncomingContent(
      { title: 'Child', page_document_id: 'child-doc' },
      { title: 'Child', page_document_id: '' },
    );
    expect(next.page_document_id).toBe('child-doc');
  });

  it('mergePassiveIncomingContent keeps local checked when incoming omits it', () => {
    const next = mergePassiveIncomingContent(
      { text: 'todo', checked: true },
      { text: 'todo' },
    );
    expect(next.checked).toBe(true);
  });

  it('findSilentUserPayloadRegressions flags cleared text', () => {
    const before = [block('a', 'mine')];
    const after = [block('a', '')];
    const violations = findSilentUserPayloadRegressions(before, after);
    expect(violations.some((v) => v.kind === 'content_regress')).toBe(true);
  });

  it('findSilentUserPayloadRegressions flags non-extension rewrite and checked clear', () => {
    expect(findSilentUserPayloadRegressions(
      [block('a', 'alpha')],
      [block('a', 'bravo')],
    ).some((v) => v.detail.includes('strict extension'))).toBe(true);

    expect(findSilentUserPayloadRegressions(
      [block('t', 'todo', { type: 'todo', content: { text: 'todo', checked: true } })],
      [block('t', 'todo', { type: 'todo', content: { text: 'todo', checked: false } })],
    ).some((v) => v.detail.includes('checked'))).toBe(true);
  });

  it('siblingRelativeOrderSignature is stable across absolute order gaps', () => {
    const sparse = [
      block('a', 'a', { order_index: 2 }),
      block('b', 'b', { order_index: 10 }),
    ];
    const dense = [
      block('a', 'a', { order_index: 0 }),
      block('b', 'b', { order_index: 1 }),
    ];
    expect(siblingRelativeOrderSignature(sparse, null))
      .toBe(siblingRelativeOrderSignature(dense, null));
  });

  it('hasDuplicateSiblingOrders detects collisions', () => {
    expect(hasDuplicateSiblingOrders([
      block('a', 'a', { order_index: 1 }),
      block('b', 'b', { order_index: 1 }),
    ])).toBe(true);
    expect(hasDuplicateSiblingOrders([
      block('a', 'a', { order_index: 1 }),
      block('b', 'b', { order_index: 2 }),
    ])).toBe(false);
  });

  it('assertMigrationPreservesUserContent allows parent remap without text change', () => {
    const before = [block('child', 'same', { type: 'todo', content: { text: 'same', checked: true } })];
    const after = [block('child', 'same', {
      type: 'todo',
      parent_block_id: 'parent',
      content: { text: 'same', checked: true },
    })];
    expect(assertMigrationPreservesUserContent(before, after)).toEqual([]);
  });

  it('keeps longer local over shorter non-prefix rewrite', () => {
    const next = mergePassiveIncomingContent({ text: 'local typing' }, { text: 'server' });
    expect(next.text).toBe('local typing');
  });

  it('sealPassiveIncomingBlock keeps local text on empty remote patch shell', () => {
    const local = block('a', 'keep me');
    const incoming = block('a', '', { version: 9 });
    const sealed = sealPassiveIncomingBlock(local, incoming);
    expect(sealed.content?.text).toBe('keep me');
    expect(sealed.version).toBe(9);
  });

  it('sealPassiveIncomingBlocks seals only matching ids', () => {
    const sealed = sealPassiveIncomingBlocks(
      [block('a', 'local-a'), block('b', 'local-b')],
      [block('a', ''), block('c', 'new')],
    );
    expect(sealed.find((item) => item.id === 'a')?.content?.text).toBe('local-a');
    expect(sealed.find((item) => item.id === 'c')?.content?.text).toBe('new');
  });
});
