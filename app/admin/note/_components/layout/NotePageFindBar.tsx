'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { mergeBlocksWithStoreContent } from '../../_lib/noteBlockStateMerge';
import { searchNoteBlocks } from '../../_lib/noteBlockSearch';
import { useNoteBlockStore } from '../../_store/noteBlockStore';
import { useNotePage } from '../../_page/NotePageContext';
import type { NoteBlock } from '../../_lib/types';

function NotePageFindBarPanel({
  blocks,
  focusBlockEditor,
  onClose,
}: {
  blocks: NoteBlock[];
  focusBlockEditor: ReturnType<typeof useNotePage>['focusBlockEditor'];
  onClose: () => void;
}) {
  const storeById = useNoteBlockStore((state) => state.byId);
  const [query, setQuery] = useState('');
  const [hitIndex, setHitIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(
    () => searchNoteBlocks(mergeBlocksWithStoreContent(blocks), query),
    [blocks, storeById, query],
  );

  const goToHit = useCallback((index: number) => {
    if (hits.length === 0) return;
    const next = ((index % hits.length) + hits.length) % hits.length;
    setHitIndex(next);
    const hit = hits[next];
    const row = document.querySelector(`[data-note-block-row][data-block-id="${hit.blockId}"]`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.classList.add('note-find-flash');
    window.setTimeout(() => row?.classList.remove('note-find-flash'), 1200);
    focusBlockEditor(hit.blockId, 'editor', undefined, { preventScroll: true });
  }, [focusBlockEditor, hits]);

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    setHitIndex(0);
  }, [query]);

  useEffect(() => {
    document.body.classList.add('note-find-active');
    return () => {
      document.body.classList.remove('note-find-active');
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Enter' && hits.length > 0) {
        e.preventDefault();
        goToHit(e.shiftKey ? hitIndex - 1 : hitIndex + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToHit, hitIndex, hits.length, onClose]);

  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-[720px] items-center gap-2">
        <Search className="h-4 w-4 shrink-0 text-neutral-400" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="페이지에서 찾기…"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-neutral-800 outline-none placeholder:text-neutral-400"
        />
        <span className="shrink-0 text-[12px] text-neutral-400 tabular-nums">
          {hits.length > 0 ? `${hitIndex + 1} / ${hits.length}` : query.trim() ? '0건' : ''}
        </span>
        <button
          type="button"
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="이전"
          disabled={hits.length === 0}
          onClick={() => goToHit(hitIndex - 1)}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="다음"
          disabled={hits.length === 0}
          onClick={() => goToHit(hitIndex + 1)}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="닫기"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function NotePageFindBar() {
  const { blocks, focusBlockEditor, activeDocument } = useNotePage();
  const [open, setOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    setPanelKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!activeDocument || !open) return null;

  return (
    <NotePageFindBarPanel
      key={panelKey}
      blocks={blocks}
      focusBlockEditor={focusBlockEditor}
      onClose={close}
    />
  );
}
