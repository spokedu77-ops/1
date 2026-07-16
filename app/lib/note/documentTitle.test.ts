import { describe, expect, it } from 'vitest';
import {
  enrichDocumentsWithPageBlockTitles,
  isPlaceholderNoteTitle,
  normalizeNoteTitle,
  syncPageBlockTitlesForDocument,
} from './documentTitle';

describe('documentTitle contract', () => {
  it('normalizes blank document titles to the note placeholder', () => {
    expect(normalizeNoteTitle('  ')).toBe('제목 없음');
    expect(normalizeNoteTitle('  Child  ')).toBe('Child');
  });

  it('recognizes placeholder titles only', () => {
    expect(isPlaceholderNoteTitle('')).toBe(true);
    expect(isPlaceholderNoteTitle('Untitled')).toBe(true);
    expect(isPlaceholderNoteTitle('untitled')).toBe(true);
    expect(isPlaceholderNoteTitle('Real title')).toBe(false);
  });

  it('syncs active page block titles without dropping existing page content', async () => {
    const calls: Array<{ table: string; op: string; payload?: unknown; args?: unknown[] }> = [];
    const supabase = {
      from(table: string) {
        calls.push({ table, op: 'from' });
        const query = {
          select(value: string) {
            calls.push({ table, op: 'select', payload: value });
            return query;
          },
          eq(column: string, value: unknown) {
            calls.push({ table, op: 'eq', args: [column, value] });
            return query;
          },
          is(column: string, value: unknown) {
            calls.push({ table, op: 'is', args: [column, value] });
            return query;
          },
          filter(column: string, operator: string, value: unknown) {
            calls.push({ table, op: 'filter', args: [column, operator, value] });
            return Promise.resolve({
              data: [
                {
                  id: 'page-a',
                  content: { page_document_id: 'child', title: 'Old', icon: 'x' },
                },
              ],
              error: null,
            });
          },
          update(payload: unknown) {
            calls.push({ table, op: 'update', payload });
            return {
              eq(column: string, value: unknown) {
                calls.push({ table, op: 'eq', args: [column, value] });
                return Promise.resolve({ error: null });
              },
            };
          },
        };
        return query;
      },
    };

    await syncPageBlockTitlesForDocument(supabase as never, 'child', 'New');

    expect(calls).toEqual(expect.arrayContaining([
      { table: 'note_blocks', op: 'filter', args: ['content->>page_document_id', 'eq', 'child'] },
      expect.objectContaining({
        table: 'note_blocks',
        op: 'update',
        payload: expect.objectContaining({
          content: { page_document_id: 'child', title: 'New', icon: 'x' },
        }),
      }),
      { table: 'note_blocks', op: 'eq', args: ['id', 'page-a'] },
    ]));
  });

  it('enriches only placeholder document titles from page block titles', async () => {
    const supabase = {
      from() {
        const query = {
          select() { return query; },
          eq() { return query; },
          is() { return query; },
          or() {
            return Promise.resolve({
              data: [
                { content: { page_document_id: 'blank', title: 'From page' } },
                { content: { page_document_id: 'real', title: 'Should not override' } },
                { content: { page_document_id: 'untitled', title: 'Untitled' } },
              ],
            });
          },
        };
        return query;
      },
    };

    const documents = await enrichDocumentsWithPageBlockTitles(
      supabase as never,
      [
        { id: 'blank', title: '' },
        { id: 'real', title: 'Real title' },
        { id: 'untitled', title: 'Untitled' },
      ],
    );

    expect(documents).toEqual([
      { id: 'blank', title: 'From page' },
      { id: 'real', title: 'Real title' },
      { id: 'untitled', title: 'Untitled' },
    ]);
  });
});
