import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isNoteLegacyReconcileEnabled,
  NOTE_LEGACY_RECONCILE_ENABLED,
} from './noteLegacyReconcile';

vi.mock('./noteOplogSync', () => ({
  isNoteOplogSyncEnabled: vi.fn(() => true),
}));

import { isNoteOplogSyncEnabled } from './noteOplogSync';

function mockLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  vi.stubGlobal('window', { localStorage });
  return store;
}

describe('noteLegacyReconcile', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(isNoteOplogSyncEnabled).mockReturnValue(true);
  });

  it('defaults to disabled when op-log sync is on', () => {
    expect(NOTE_LEGACY_RECONCILE_ENABLED).toBe(false);
    expect(isNoteLegacyReconcileEnabled()).toBe(false);
  });

  it('allows emergency enable via localStorage', () => {
    window.localStorage.setItem('spm-note-legacy-reconcile', '1');
    expect(isNoteLegacyReconcileEnabled()).toBe(true);
  });

  it('allows explicit disable via localStorage even when op-log is off', () => {
    vi.mocked(isNoteOplogSyncEnabled).mockReturnValue(false);
    window.localStorage.setItem('spm-note-legacy-reconcile', '0');
    expect(isNoteLegacyReconcileEnabled()).toBe(false);
  });

  it('falls back to legacy reconcile when op-log sync is off', () => {
    vi.mocked(isNoteOplogSyncEnabled).mockReturnValue(false);
    expect(isNoteLegacyReconcileEnabled()).toBe(true);
  });
});
