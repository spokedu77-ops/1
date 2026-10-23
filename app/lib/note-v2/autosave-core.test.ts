import { describe, expect, it, vi } from 'vitest';
import { NoteV2Autosave, type AutosaveStatus } from './autosave-core';

describe('NoteV2Autosave', () => {
  it('advances the confirmed version only after a successful compare-and-swap', async () => {
    const statuses: AutosaveStatus[] = [];
    const send = vi.fn().mockResolvedValue({ ok: true, version: 4 });
    const machine = new NoteV2Autosave({
      initialContent: ['old'], initialVersion: 3, send,
      onStatus: (status) => statuses.push(status), debounceMs: 60_000,
    });

    machine.edit(['new']);
    await machine.flush();

    expect(send).toHaveBeenCalledWith(['new'], 3);
    expect(machine.baseVersion).toBe(4);
    expect(machine.hasPending).toBe(false);
    expect(statuses.at(-1)).toBe('saved');
    machine.dispose();
  });

  it('stops on a version conflict without acknowledging the draft', async () => {
    const statuses: AutosaveStatus[] = [];
    const machine = new NoteV2Autosave({
      initialContent: ['old'], initialVersion: 7,
      send: async () => ({ ok: false, kind: 'conflict' }),
      onStatus: (status) => statuses.push(status), debounceMs: 60_000,
    });

    machine.edit(['draft']);
    await machine.flush();

    expect(machine.baseVersion).toBe(7);
    expect(machine.hasPending).toBe(true);
    expect(statuses.at(-1)).toBe('conflict');
    machine.dispose();
  });
});
