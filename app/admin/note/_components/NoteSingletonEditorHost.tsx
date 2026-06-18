'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentProps } from 'react';
import type { NoteEditor } from './NoteEditor';
import {
  getActiveEditorBridgeSnapshot,
  subscribeActiveEditorBridge,
} from '../_lib/noteActiveEditorBridge';

const NoteEditorLazy = dynamic(
  () => import('./NoteEditor').then((mod) => mod.NoteEditor),
  { ssr: false },
);

/** 문서당 TipTap 인스턴스 1개 — 블록 전환 시 setContent만 갱신 */
export function NoteSingletonEditorHost() {
  const config = useSyncExternalStore(
    subscribeActiveEditorBridge,
    getActiveEditorBridgeSnapshot,
    () => null,
  );

  if (!config?.slotElement) return null;

  const props = config.getProps() as ComponentProps<typeof NoteEditor>;

  return createPortal(
    <NoteEditorLazy {...props} editorBlockId={config.blockId} />,
    config.slotElement,
  );
}
