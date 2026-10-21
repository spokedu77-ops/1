'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import type { NoteV2TreeRow } from '@/app/lib/note-v2/tree-core';
import { searchVisibleNoteTitles } from '@/app/lib/note-v2/search-core';

type Props = {
  rows: readonly NoteV2TreeRow[];
  visibleIds: ReadonlySet<string>;
  selectedId: string | null;
  busy: boolean;
  onSelect: (id: string) => Promise<void>;
  onClose: () => void;
};

export default function NoteStage5Search({ rows, visibleIds, selectedId, busy, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const results = useMemo(() => searchVisibleNoteTitles(rows, visibleIds, query), [rows, visibleIds, query]);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = Math.min(activeIndex, Math.max(0, results.length - 1));

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => { previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const choose = async (id: string) => {
    if (busy || loadingId) return;
    setLoadingId(id);
    try {
      await onSelect(id);
      // Navigation is allowed to fail if the previous document cannot be saved.
      // The caller closes the dialog only after confirming the selected page changed.
    } finally { setLoadingId(null); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center bg-black/40 px-3 pt-[min(15vh,125px)]" onMouseDown={(event) => { if (event.target === event.currentTarget && !loadingId) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="노트 페이지 빠른 검색" onKeyDown={(event) => { if (!event.nativeEvent.isComposing && !event.defaultPrevented && event.key === 'Escape') onClose(); }} className="h-fit w-full max-w-xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl" data-testid="note-v2-stage5-search">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <Search size={18} className="shrink-0 text-neutral-400"/>
          <input ref={inputRef} value={query} autoComplete="off" spellCheck={false}
            aria-label="페이지 제목 검색" placeholder="페이지 제목 검색…" className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none"
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Escape') { event.preventDefault(); onClose(); }
              if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1))); }
              if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
              if (event.key === 'Enter' && results[active]) { event.preventDefault(); void choose(results[active].id); }
            }}/>
          <button type="button" aria-label="검색 닫기" className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100" onClick={onClose}><X size={17}/></button>
        </div>
        <div className="max-h-[min(52vh,430px)] overflow-y-auto px-2 py-2" role="listbox" aria-label="검색 결과">
          {!query.trim() && <p className="px-3 py-5 text-center text-sm text-neutral-500">검색어를 입력하세요. 제목에 포함된 단어로 검색합니다.</p>}
          {query.trim() && results.length === 0 && <p className="px-3 py-5 text-center text-sm text-neutral-500">일치하는 페이지가 없습니다.</p>}
          {results.map((result, index) => (
            <button type="button" key={result.id} role="option" aria-selected={active === index} disabled={busy || Boolean(loadingId)}
              onMouseEnter={() => setActiveIndex(index)} onClick={() => void choose(result.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm disabled:opacity-50 ${index === active ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}>
              <FileText size={17} className="shrink-0 text-neutral-400"/>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium text-neutral-800">{result.title}</span>
                <span className="block truncate text-xs text-neutral-500">{result.path.join(' / ')}</span></span>
              {selectedId === result.id && <span className="shrink-0 text-[11px] text-neutral-400">현재 페이지</span>}
              {loadingId === result.id && <span className="shrink-0 text-xs text-neutral-500">열기 중…</span>}
            </button>
          ))}
        </div>
        <div className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">↑ ↓ 선택 · Enter 열기 · Esc 닫기 · 제목만 검색</div>
      </section>
    </div>
  );
}
