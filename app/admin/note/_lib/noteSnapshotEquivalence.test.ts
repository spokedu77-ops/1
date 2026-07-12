import { describe, expect, it } from 'vitest';
import { documentSnapshotsEquivalent } from './noteSnapshotEquivalence';
import type { NoteBlock } from './types';

function block(id: string, text: string, overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content: { text, html: `<p>${text}</p>` },
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
    ...overrides,
  };
}

describe('documentSnapshotsEquivalent', () => {
  it('returns true for identical document snapshots', () => {
    const snapshot = [block('a', 'hello'), block('b', 'world', { order_index: 1 })];
    expect(documentSnapshotsEquivalent(snapshot, [...snapshot], 'doc-1')).toBe(true);
  });

  it('returns false when server adds a block', () => {
    const local = [block('a', 'hello')];
    const server = [block('a', 'hello'), block('b', 'new', { order_index: 1 })];
    expect(documentSnapshotsEquivalent(local, server, 'doc-1')).toBe(false);
  });

  it('returns false when content differs', () => {
    const local = [block('a', 'hello')];
    const server = [block('a', 'changed')];
    expect(documentSnapshotsEquivalent(local, server, 'doc-1')).toBe(false);
  });

  it('returns true when only content key order differs', () => {
    const left = [block('a', 'hi', { content: { text: 'hi', html: '<p>hi</p>' } })];
    const right = [block('a', 'hi', { content: { html: '<p>hi</p>', text: 'hi' } })];
    expect(documentSnapshotsEquivalent(left, right, 'doc-1')).toBe(true);
  });
});
