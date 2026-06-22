import type { ComponentProps } from 'react';
import type { NoteEditor } from '../_components/NoteEditor';
import type { NoteActiveEditorField } from '../_store/noteBlockStore';

export type NoteEditorBridgeConfig = {
  blockId: string;
  field: NoteActiveEditorField;
  slotElement: HTMLElement;
  getProps: () => ComponentProps<typeof NoteEditor>;
};

let activeConfig: NoteEditorBridgeConfig | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeActiveEditorBridge(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveEditorBridgeSnapshot(): NoteEditorBridgeConfig | null {
  return activeConfig;
}

export function setActiveEditorBridge(config: NoteEditorBridgeConfig | null) {
  activeConfig = config;
  emit();
}

/** bridge 해제 — 커밋은 commitActiveNoteEditorToStore() 단일 경로에서만 */
export function clearActiveEditorBridge(blockId: string, field: NoteActiveEditorField) {
  if (activeConfig?.blockId === blockId && activeConfig?.field === field) {
    activeConfig = null;
    emit();
  }
}
