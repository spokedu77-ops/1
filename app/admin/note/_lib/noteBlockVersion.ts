import type { NoteBlock } from './types';

export const DEFAULT_NOTE_BLOCK_VERSION = 1;

export function normalizeNoteBlockVersion(version: unknown): number {
  if (typeof version === 'number' && Number.isFinite(version) && version >= 1) {
    return Math.floor(version);
  }
  return DEFAULT_NOTE_BLOCK_VERSION;
}

export function ensureNoteBlockVersion<T extends NoteBlock>(block: T): T {
  return {
    ...block,
    version: normalizeNoteBlockVersion(block.version),
  };
}

export function withExpectedVersion<T extends { id: string }>(
  patch: T,
  block: Pick<NoteBlock, 'id' | 'version'> | undefined,
): T & { expected_version: number } {
  return {
    ...patch,
    expected_version: normalizeNoteBlockVersion(block?.version),
  };
}
