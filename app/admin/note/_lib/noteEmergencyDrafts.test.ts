import { describe, expect, it, vi } from 'vitest';

import {
  applyNoteEmergencyDrafts,
  clearNoteEmergencyDraft,
  listNoteEmergencyDrafts,
  saveNoteEmergencyDraft,
} from './noteEmergencyDrafts';
import type { NoteBlock } from './types';

describe('noteEmergencyDrafts', () => {
  it('saves and clears drafts by document and block', () => {
    const storage = new MemoryStorage();
    saveNoteEmergencyDraft('doc-1', 'a', { text: 'unsent' }, storage);
    saveNoteEmergencyDraft('doc-2', 'b', { text: 'other' }, storage);

    expect(listNoteEmergencyDrafts('doc-1', storage)).toMatchObject([
      { documentId: 'doc-1', blockId: 'a', content: { text: 'unsent' } },
    ]);

    clearNoteEmergencyDraft('doc-1', 'a', storage);

    expect(listNoteEmergencyDrafts('doc-1', storage)).toEqual([]);
    expect(listNoteEmergencyDrafts('doc-2', storage)).toHaveLength(1);
  });

  it('applies newer emergency drafts over stale server content', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-17T10:00:00.000Z'));
    const storage = new MemoryStorage();
    saveNoteEmergencyDraft('doc-1', 'a', { text: 'local typed' }, storage);

    const result = applyNoteEmergencyDrafts('doc-1', [
      block('a', { text: 'server old' }, '2026-07-17T09:59:00.000Z'),
    ], storage);

    expect(result.recovered.map((draft) => draft.blockId)).toEqual(['a']);
    expect(result.blocks[0].content).toMatchObject({ text: 'local typed' });
  });

  it('does not overwrite content that is newer than the emergency draft', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-17T10:00:00.000Z'));
    const storage = new MemoryStorage();
    saveNoteEmergencyDraft('doc-1', 'a', { text: 'local old' }, storage);

    const result = applyNoteEmergencyDrafts('doc-1', [
      block('a', { text: 'server newer' }, '2026-07-17T10:01:00.000Z'),
    ], storage);

    expect(result.recovered).toEqual([]);
    expect(result.blocks[0].content).toMatchObject({ text: 'server newer' });
  });
});

function block(id: string, content: Record<string, unknown>, updatedAt: string): NoteBlock {
  return {
    id,
    document_id: 'doc-1',
    parent_block_id: null,
    type: 'text',
    order_index: 0,
    content,
    created_at: '2026-07-17T09:00:00.000Z',
    updated_at: updatedAt,
    version: 1,
  };
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
