import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  createGatedTriggerSave,
  registerNoteSaveTrustGate,
  reportNoteDurableSave,
} from './noteSaveTrust';
import { setNoteContentSavePending } from './notePendingSave';

describe('noteSaveTrust', () => {
  beforeEach(() => {
    setNoteContentSavePending(false);
    registerNoteSaveTrustGate(null);
  });

  it('reports saved when nothing is pending', async () => {
    const onSaved = vi.fn();
    const onPending = vi.fn();
    await expect(reportNoteDurableSave({ onSaved, onPending })).resolves.toBe(true);
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onPending).not.toHaveBeenCalled();
  });

  it('blocks saved while content debounce is pending', async () => {
    setNoteContentSavePending(true);
    const onSaved = vi.fn();
    const onPending = vi.fn();
    await expect(reportNoteDurableSave({ onSaved, onPending })).resolves.toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onPending).toHaveBeenCalledOnce();
  });

  it('blocks saved while outbound remains', async () => {
    registerNoteSaveTrustGate({
      hasPendingContent: () => false,
      hasPendingOutbound: async () => true,
    });
    const onSaved = vi.fn();
    const onPending = vi.fn();
    await expect(reportNoteDurableSave({ onSaved, onPending })).resolves.toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onPending).toHaveBeenCalledOnce();
  });

  it('gated triggerSave only marks saved when durable', async () => {
    registerNoteSaveTrustGate({
      hasPendingContent: () => false,
      hasPendingOutbound: async () => false,
    });
    const onSaved = vi.fn();
    const trigger = createGatedTriggerSave({ onSaved });
    trigger();
    await vi.waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
  });
});
