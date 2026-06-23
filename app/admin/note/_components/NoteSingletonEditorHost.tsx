'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentProps } from 'react';
import { NoteEditor } from './NoteEditor';
import {
  getActiveEditorBridgeSnapshot,
  subscribeActiveEditorBridge,
} from '../_lib/noteActiveEditorBridge';
import {
  clearAllCrossSelectState,
  hasActiveMultiCrossSelect,
  reapplyActiveCrossSelectDecorations,
} from './noteCrossSelect';
import {
  clearActiveListCrossSelectState,
  hasActiveMultiListCrossSelect,
  reapplyActiveListCrossDecorations,
} from './noteListCrossSelect';
import { clearAllDocumentPreviewCrossHighlights } from './noteBlockPreviewCrossSelect';

/** 문서당 TipTap 인스턴스 1개 — 블록 전환 시 setContent만 갱신 */
export function NoteSingletonEditorHost() {
  const config = useSyncExternalStore(
    subscribeActiveEditorBridge,
    getActiveEditorBridgeSnapshot,
    () => null,
  );

  useEffect(() => {
    if (!config?.blockId) return;
    if (hasActiveMultiCrossSelect()) {
      reapplyActiveCrossSelectDecorations();
      return;
    }
    if (hasActiveMultiListCrossSelect()) {
      reapplyActiveListCrossDecorations();
      return;
    }
    clearAllDocumentPreviewCrossHighlights();
    clearAllCrossSelectState();
    clearActiveListCrossSelectState();
  }, [config?.blockId]);

  if (!config?.slotElement) return null;

  const props = config.getProps() as ComponentProps<typeof NoteEditor>;

  return createPortal(
    <NoteEditor {...props} editorBlockId={config.blockId} />,
    config.slotElement,
  );
}
