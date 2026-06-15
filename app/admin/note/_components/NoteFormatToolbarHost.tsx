'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { BubbleToolbar } from './BubbleToolbar';

export type FormatToolbarState = {
  applyMark: (mark: InlineMark) => void;
  applyTextStyle: (style: 'paragraph' | 'heading1' | 'heading2' | 'heading3') => void;
  position: { top: number; left: number };
};

export type NoteFormatToolbarApi = {
  show: (
    applyMark: FormatToolbarState['applyMark'],
    applyTextStyle: FormatToolbarState['applyTextStyle'],
    position: FormatToolbarState['position'],
  ) => void;
  hide: () => void;
};

export function NoteFormatToolbarHost({ apiRef }: { apiRef: MutableRefObject<NoteFormatToolbarApi> }) {
  const [toolbar, setToolbar] = useState<FormatToolbarState | null>(null);
  const lastPositionRef = useRef<FormatToolbarState['position'] | null>(null);

  const show = useCallback((
    applyMark: FormatToolbarState['applyMark'],
    applyTextStyle: FormatToolbarState['applyTextStyle'],
    position: FormatToolbarState['position'],
  ) => {
    const prev = lastPositionRef.current;
    if (
      prev
      && prev.top === position.top
      && prev.left === position.left
    ) {
      setToolbar((current) => {
        if (!current) return { applyMark, applyTextStyle, position };
        return current;
      });
      return;
    }
    lastPositionRef.current = position;
    setToolbar({ applyMark, applyTextStyle, position });
  }, []);

  const hide = useCallback(() => {
    lastPositionRef.current = null;
    setToolbar(null);
  }, []);

  useEffect(() => {
    apiRef.current = { show, hide };
    return () => {
      apiRef.current = { show: () => {}, hide: () => {} };
    };
  }, [apiRef, hide, show]);

  useEffect(() => {
    const onHide = () => hide();
    document.addEventListener('note-hide-format-toolbar', onHide);
    return () => document.removeEventListener('note-hide-format-toolbar', onHide);
  }, [hide]);

  if (!toolbar) return null;

  return (
    <div
      data-note-format-toolbar
      className="pointer-events-auto fixed z-[10050] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur"
      style={{ left: toolbar.position.left, top: toolbar.position.top }}
    >
      <BubbleToolbar applyMark={toolbar.applyMark} applyTextStyle={toolbar.applyTextStyle} />
    </div>
  );
}
