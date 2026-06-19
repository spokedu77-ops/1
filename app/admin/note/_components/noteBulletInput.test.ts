import { describe, expect, it } from 'vitest';
import {
  normalizeListBlockContentRecord,
  normalizeLoadedNoteBlocks,
  stripListItemMarkerPrefix,
} from './noteBulletInput';
import type { NoteBlock } from '../_lib/types';

const listBlock = (id: string, text: string, documentId = 'doc'): NoteBlock => ({
  id,
  document_id: documentId,
  type: 'bulletList',
  content: { text },
  order_index: 0,
  parent_block_id: null,
  created_at: '',
  updated_at: '',
});

describe('stripListItemMarkerPrefix', () => {
  it('removes lone - or * trigger characters', () => {
    expect(stripListItemMarkerPrefix('-')).toBe('');
    expect(stripListItemMarkerPrefix('*')).toBe('');
  });

  it('removes - prefix before body text', () => {
    expect(stripListItemMarkerPrefix('- hello')).toBe('hello');
    expect(stripListItemMarkerPrefix('* item')).toBe('item');
  });

  it('removes bullet glyph prefixes from stored content', () => {
    expect(stripListItemMarkerPrefix('• item')).toBe('item');
    expect(stripListItemMarkerPrefix('◦ nested')).toBe('nested');
  });
});

describe('normalizeListBlockContentRecord', () => {
  it('strips marker text and drops stale html fields', () => {
    const next = normalizeListBlockContentRecord({
      text: '-',
      html: '<p>-</p>',
      bodyHtml: '<p>-</p>',
    });
    expect(next.text).toBe('');
    expect(next.html).toBeUndefined();
    expect(next.bodyHtml).toBeUndefined();
  });

  it('drops html when text is already clean but html still has markers', () => {
    const next = normalizeListBlockContentRecord({
      text: '',
      html: '<p>*</p>',
    });
    expect(next.text).toBe('');
    expect(next.html).toBeUndefined();
  });

  it('leaves clean content unchanged', () => {
    const input = { text: 'hello', number: 1 };
    expect(normalizeListBlockContentRecord(input)).toBe(input);
  });
});

describe('normalizeLoadedNoteBlocks', () => {
  it('normalizes list blocks on document load (parent and child)', () => {
    const parent = listBlock('a', '-', 'parent-doc');
    const child = listBlock('b', '* item', 'child-doc');
    const normalized = normalizeLoadedNoteBlocks([parent, child]);
    expect(normalized[0].content?.text).toBe('');
    expect(normalized[1].content?.text).toBe('item');
  });
});
