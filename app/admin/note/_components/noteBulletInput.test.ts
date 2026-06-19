import { describe, expect, it } from 'vitest';
import {
  normalizeListBlockContentRecord,
  normalizeLoadedNoteBlocks,
  stripListItemMarkerFromHtml,
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

describe('stripListItemMarkerFromHtml', () => {
  it('removes bullet glyph from first paragraph in html', () => {
    expect(stripListItemMarkerFromHtml('<p>• hello</p>')).toBe('<p>hello</p>');
    expect(stripListItemMarkerFromHtml('<p>- item</p>')).toBe('<p>item</p>');
  });

  it('removes numbered prefix from first paragraph in html', () => {
    expect(stripListItemMarkerFromHtml('<p>1. item</p>')).toBe('<p>item</p>');
  });
});

describe('normalizeListBlockContentRecord', () => {
  it('strips marker text and drops stale marker-only html', () => {
    const next = normalizeListBlockContentRecord({
      text: '-',
      html: '<p>-</p>',
      bodyHtml: '<p>-</p>',
    });
    expect(next.text).toBe('');
    expect(next.html).toBeUndefined();
    expect(next.bodyHtml).toBeUndefined();
  });

  it('drops html when text is empty but html still has lone markers', () => {
    const next = normalizeListBlockContentRecord({
      text: '',
      html: '<p>*</p>',
    });
    expect(next.text).toBe('');
    expect(next.html).toBeUndefined();
  });

  it('keeps formatted html when text is clean', () => {
    const next = normalizeListBlockContentRecord({
      text: 'hello',
      html: '<p><u>hello</u></p>',
    });
    expect(next.text).toBe('hello');
    expect(next.html).toBe('<p><u>hello</u></p>');
  });

  it('keeps formatted html when only marker prefix is stripped from text', () => {
    const next = normalizeListBlockContentRecord({
      text: '- hello',
      html: '<p><u>hello</u></p>',
    });
    expect(next.text).toBe('hello');
    expect(next.html).toBe('<p><u>hello</u></p>');
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
