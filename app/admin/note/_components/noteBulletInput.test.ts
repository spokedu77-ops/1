import { describe, expect, it } from 'vitest';
import {
  normalizeListBlockContentRecord,
  normalizeLoadedNoteBlocks,
  resolveMarkdownBlockTriggerFromTextBeforeCursor,
  stripListItemMarkerFromHtml,
  stripListItemMarkerPrefix,
  stripMarkdownTriggerForTypeChange,
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

  it('preserves dates and decimals that only resemble numbered markers', () => {
    expect(stripListItemMarkerPrefix('6.25 목요일')).toBe('6.25 목요일');
    expect(stripListItemMarkerPrefix('3.14')).toBe('3.14');
    expect(stripListItemMarkerPrefix('2026.06.25 일정')).toBe('2026.06.25 일정');
    expect(stripListItemMarkerPrefix('1.item')).toBe('1.item');
  });

  it('removes a numbered marker only when whitespace follows the dot', () => {
    expect(stripListItemMarkerPrefix('1. item')).toBe('item');
    expect(stripListItemMarkerPrefix('25. 목요일')).toBe('목요일');
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

  it('preserves date-like text in html', () => {
    expect(stripListItemMarkerFromHtml('<p>6.25 목요일</p>')).toBe('<p>6.25 목요일</p>');
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

  it('keeps date text intact during legacy normalization', () => {
    const input = { text: '6.25 목요일', html: '<p>6.25 목요일</p>' };
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

describe('markdown block shortcuts', () => {
  it('recognizes Notion-style block triggers before Space', () => {
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('-')).toBe('bulletList');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('*')).toBe('bulletList');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('1.')).toBe('numberedList');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('[]')).toBe('todo');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('[ ]')).toBe('todo');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('>')).toBe('toggle');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('#')).toBe('heading');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('##')).toBe('heading2');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('###')).toBe('heading3');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('---')).toBe('divider');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('!!')).toBe('callout');
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('```')).toBe('code');
  });

  it('does not treat indented text as a root block shortcut', () => {
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('\t-')).toBeNull();
    expect(resolveMarkdownBlockTriggerFromTextBeforeCursor('    #')).toBeNull();
  });

  it('strips trigger text when converting to block types', () => {
    expect(stripMarkdownTriggerForTypeChange('- ', 'bulletList')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('* ', 'bulletList')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('1. ', 'numberedList')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('[] ', 'todo')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('[ ] ', 'todo')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('> ', 'toggle')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('# ', 'heading')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('## ', 'heading2')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('### ', 'heading3')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('--- ', 'divider')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('!! ', 'callout')).toBe('');
    expect(stripMarkdownTriggerForTypeChange('``` ', 'code')).toBe('');
  });
});
