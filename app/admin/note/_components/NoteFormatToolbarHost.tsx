'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import type { FormatToolbarState } from '../_lib/types';
import { BubbleToolbar } from './BubbleToolbar';

export type NoteFormatToolbarApi = {
  show: (
    applyMark: FormatToolbarState['applyMark'],
    applyTextStyle: FormatToolbarState['applyTextStyle'],
    applyTextColor: FormatToolbarState['applyTextColor'],
    applyHighlight: FormatToolbarState['applyHighlight'],
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
    applyTextColor: FormatToolbarState['applyTextColor'],
    applyHighlight: FormatToolbarState['applyHighlight'],
    position: FormatToolbarState['position'],
  ) => {
    const prev = lastPositionRef.current;
    if (
      prev
      && prev.top === position.top
      && prev.left === position.left
    ) {
      setToolbar((current) => {
        if (!current) {
          return { applyMark, applyTextStyle, applyTextColor, applyHighlight, position };
        }
        return current;
      });
      return;
    }
    lastPositionRef.current = position;
    setToolbar({ applyMark, applyTextStyle, applyTextColor, applyHighlight, position });
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
      <BubbleToolbar
        applyMark={toolbar.applyMark}
        applyTextStyle={toolbar.applyTextStyle}
        applyTextColor={toolbar.applyTextColor}
        applyHighlight={toolbar.applyHighlight}
      />
    </div>
  );
}
