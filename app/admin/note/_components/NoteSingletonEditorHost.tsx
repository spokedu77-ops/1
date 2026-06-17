'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { NoteEditor } from './NoteEditor';
import {
  getActiveEditorBridgeSnapshot,
  subscribeActiveEditorBridge,
} from '../_lib/noteActiveEditorBridge';

/** 문서당 TipTap 인스턴스 1개 — 블록 전환 시 setContent만 갱신 */
export function NoteSingletonEditorHost() {
  const config = useSyncExternalStore(
    subscribeActiveEditorBridge,
    getActiveEditorBridgeSnapshot,
    () => null,
  );

  if (!config?.slotElement) return null;

  const props = config.getProps();

  return createPortal(
    <NoteEditor {...props} editorBlockId={config.blockId} />,
    config.slotElement,
  );
}
