'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react';
import type { FormatToolbarState } from '../_lib/types';
import {
  closeNoteLinkEditor,
  getNoteLinkEditorSession,
  subscribeNoteLinkEditor,
  type NoteLinkEditorSession,
} from '../_lib/noteEditorLink';
import { formatShortcutLabel } from './noteFormatShortcuts';
import { BubbleToolbar } from './BubbleToolbar';

export type NoteFormatToolbarApi = {
  show: (
    applyMark: FormatToolbarState['applyMark'],
    applyTextStyle: FormatToolbarState['applyTextStyle'],
    applyTextColor: FormatToolbarState['applyTextColor'],
    applyHighlight: FormatToolbarState['applyHighlight'],
    position: FormatToolbarState['position'],
    insertTable?: FormatToolbarState['insertTable'],
    editLink?: FormatToolbarState['editLink'],
  ) => void;
  hide: () => void;
};

function NoteLinkEditorPopover({ session }: { session: NoteLinkEditorSession }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(session.initialUrl);

  useEffect(() => {
    setValue(session.initialUrl);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [session]);

  const submit = () => session.applyUrl(value);

  return (
    <div
      data-note-format-toolbar
      data-note-overlay-menu
      className="pointer-events-auto fixed z-[10060] w-[min(360px,calc(100vw-24px))] -translate-y-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
      style={{ left: session.anchor.left, top: session.anchor.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-slate-400"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            session.cancel();
          }
        }}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {session.initialUrl.trim() ? (
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => session.applyUrl('')}
          >
            링크 제거
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50"
          onMouseDown={(e) => e.preventDefault()}
          onClick={session.cancel}
        >
          취소
        </button>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800"
          onMouseDown={(e) => e.preventDefault()}
          onClick={submit}
        >
          적용
        </button>
      </div>
      <p className="mt-1 px-1 text-[10px] text-slate-400">{formatShortcutLabel('Mod+K')}</p>
    </div>
  );
}

export function NoteFormatToolbarHost({ apiRef }: { apiRef: MutableRefObject<NoteFormatToolbarApi> }) {
  const [toolbar, setToolbar] = useState<FormatToolbarState | null>(null);
  const lastPositionRef = useRef<FormatToolbarState['position'] | null>(null);
  const linkSession = useSyncExternalStore(
    subscribeNoteLinkEditor,
    getNoteLinkEditorSession,
    () => null,
  );

  const show = useCallback((
    applyMark: FormatToolbarState['applyMark'],
    applyTextStyle: FormatToolbarState['applyTextStyle'],
    applyTextColor: FormatToolbarState['applyTextColor'],
    applyHighlight: FormatToolbarState['applyHighlight'],
    position: FormatToolbarState['position'],
    insertTable?: FormatToolbarState['insertTable'],
    editLink?: FormatToolbarState['editLink'],
  ) => {
    const prev = lastPositionRef.current;
    if (
      prev
      && prev.top === position.top
      && prev.left === position.left
    ) {
      setToolbar((current) => {
        if (!current) {
          return { applyMark, applyTextStyle, applyTextColor, applyHighlight, insertTable, editLink, position };
        }
        return current;
      });
      return;
    }
    lastPositionRef.current = position;
    setToolbar({ applyMark, applyTextStyle, applyTextColor, applyHighlight, insertTable, editLink, position });
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

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!linkSession) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-note-format-toolbar]')) return;
      closeNoteLinkEditor();
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [linkSession]);

  return (
    <>
      {toolbar ? (
        <div
          data-note-format-toolbar
          data-note-overlay-menu
          className="pointer-events-auto fixed z-[10050] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur"
          style={{ left: toolbar.position.left, top: toolbar.position.top }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <BubbleToolbar
            applyMark={toolbar.applyMark}
            applyTextStyle={toolbar.applyTextStyle}
            applyTextColor={toolbar.applyTextColor}
            applyHighlight={toolbar.applyHighlight}
            insertTable={toolbar.insertTable}
            editLink={toolbar.editLink}
          />
        </div>
      ) : null}
      {linkSession ? <NoteLinkEditorPopover session={linkSession} /> : null}
    </>
  );
}
