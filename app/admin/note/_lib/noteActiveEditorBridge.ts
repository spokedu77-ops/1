import type { ComponentProps } from 'react';
import type { NoteEditor } from '../_components/NoteEditor';
import type { NoteActiveEditorField } from '../_store/noteBlockStore';
import { getNoteEditor } from '../_components/noteEditorRegistry';

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

function commitBridgedEditor(config: NoteEditorBridgeConfig): void {
  const editor = getNoteEditor(config.blockId);
  if (!editor || (editor as { isDestroyed?: boolean }).isDestroyed) return;
  try {
    const props = config.getProps();
    props.onChange?.({
      text: editor.getText(),
      html: editor.getHTML(),
    });
  } catch {
    // editor teardown race — 무시
  }
}

export function setActiveEditorBridge(config: NoteEditorBridgeConfig | null) {
  activeConfig = config;
  emit();
}

/** 스토어 content 갱신 시 싱글톤 호스트가 getProps()를 다시 읽도록 */
export function notifyActiveEditorBridgePropsChanged() {
  if (!activeConfig) return;
  emit();
}

/** bridge 해제 — 등록 id와 일치하는 에디터만 커밋 (폴백 없음) */
export function clearActiveEditorBridge(blockId: string, field: NoteActiveEditorField) {
  if (activeConfig?.blockId === blockId && activeConfig?.field === field) {
    commitBridgedEditor(activeConfig);
    activeConfig = null;
    emit();
  }
}
