'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  canClientPersistSnapshot,
  isNoteLiteBlockType,
  sortLiteBlocksForDisplay,
  type NoteLiteBlock,
  type NoteLiteBlockType,
} from '@/app/lib/note/noteLiteInvariants';
import {
  createEmptyLiteBlock,
  detectMarkdownType,
  indentBlock,
  insertBlockAfter,
  mergeIntoPrevious,
  moveBlockAfter,
  moveBlockBefore,
  outdentBlock,
  removeBlock,
  setBlockType,
  toggleTodoChecked,
  updateBlockText,
} from './noteLiteTree';

type LiteDoc = {
  id: string;
  title: string;
  updated_at: string;
};

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const CONVERT_TYPES: { type: NoteLiteBlockType; label: string }[] = [
  { type: 'text', label: '본문' },
  { type: 'heading', label: '제목 1' },
  { type: 'heading2', label: '제목 2' },
  { type: 'heading3', label: '제목 3' },
  { type: 'bulletList', label: '목록' },
  { type: 'numberedList', label: '번호' },
  { type: 'todo', label: '체크' },
];

function depthOf(id: string, blocks: NoteLiteBlock[]): number {
  let d = 0;
  let cur = blocks.find((b) => b.id === id);
  const guard = new Set<string>();
  while (cur?.parent_block_id && !guard.has(cur.id)) {
    guard.add(cur.id);
    d += 1;
    cur = blocks.find((b) => b.id === cur!.parent_block_id);
  }
  return d;
}

export function NoteLiteApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get('id');

  const [docs, setDocs] = useState<LiteDoc[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteLiteBlock[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null);
  const [dropAtEnd, setDropAtEnd] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);

  const blocksRef = useRef(blocks);
  const openIdRef = useRef(openId);
  const hydratedRef = useRef(hydrated);
  const dirtyRef = useRef(dirty);
  const saveTimer = useRef<number | null>(null);
  blocksRef.current = blocks;
  openIdRef.current = openId;
  hydratedRef.current = hydrated;
  dirtyRef.current = dirty;

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch('/api/admin/note/documents?skipReconcile=true&limit=200', {
        credentials: 'include',
      });
      const json = (await res.json().catch(() => ({}))) as { documents?: LiteDoc[] };
      const list = Array.isArray(json.documents) ? json.documents : [];
      setDocs(list);
      return list;
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const persistSnapshot = useCallback(async (documentId: string, nextBlocks: NoteLiteBlock[]) => {
    if (
      !canClientPersistSnapshot({
        hydrated: hydratedRef.current,
        openDocumentId: documentId,
        snapshotDocumentId: documentId,
      })
    ) {
      return false;
    }
    setSaveState('saving');
    const res = await fetch(`/api/admin/note/lite/documents/${documentId}/snapshot`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: nextBlocks }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setSaveState('error');
      setError(body.error === 'EMPTY_SNAPSHOT_REJECTED' ? '빈 저장으로 기존 글을 덮을 수 없습니다.' : (body.error || '저장 실패'));
      return false;
    }
    setDirty(false);
    setSaveState('saved');
    setError(null);
    return true;
  }, []);

  const flushOpen = useCallback(async () => {
    const id = openIdRef.current;
    if (!id || !dirtyRef.current) return;
    await persistSnapshot(id, blocksRef.current);
  }, [persistSnapshot]);

  const openDocument = useCallback(async (id: string, listOverride?: LiteDoc[]) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await flushOpen();
    hydratedRef.current = false;
    setHydrated(false);
    setDirty(false);
    setSaveState('loading');
    setOpenId(id);
    router.replace(`/admin/note?id=${encodeURIComponent(id)}`);
    const catalog = listOverride ?? docs;
    const doc = catalog.find((d) => d.id === id);
    setTitle(doc?.title ?? '');
    const res = await fetch(`/api/admin/note/lite/documents/${id}/snapshot`, { credentials: 'include' });
    if (!res.ok) {
      setError('문서를 열 수 없습니다.');
      setBlocks([]);
      setHydrated(true);
      setSaveState('error');
      return;
    }
    const json = (await res.json()) as { blocks?: NoteLiteBlock[] };
    const loaded = Array.isArray(json.blocks) ? json.blocks.filter((b) => isNoteLiteBlockType(b.type)) : [];
    const withSeed =
      loaded.length > 0 ? sortLiteBlocksForDisplay(loaded) : [createEmptyLiteBlock(id, 'text', null)];
    setBlocks(withSeed);
    hydratedRef.current = true;
    setHydrated(true);
    setSaveState(loaded.length === 0 ? 'saving' : 'saved');
    setError(null);
    if (loaded.length === 0) {
      setDirty(true);
      await persistSnapshot(id, withSeed);
    }
  }, [docs, flushOpen, persistSnapshot, router]);

  const scheduleSave = useCallback(() => {
    const id = openIdRef.current;
    if (!id || !hydratedRef.current) return;
    setDirty(true);
    setSaveState('idle');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persistSnapshot(id, blocksRef.current);
    }, 700);
  }, [persistSnapshot]);

  const mutate = useCallback((fn: (prev: NoteLiteBlock[]) => NoteLiteBlock[]) => {
    setBlocks((prev) => fn(prev));
    queueMicrotask(() => scheduleSave());
  }, [scheduleSave]);

  useEffect(() => {
    void (async () => {
      const list = await loadDocs();
      const target = urlId && list.some((d) => d.id === urlId) ? urlId : list[0]?.id;
      if (target) await openDocument(target, list);
      else {
        setHydrated(true);
        setSaveState('idle');
      }
    })();
    // initial only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onLeave = () => {
      const id = openIdRef.current;
      if (!id || !dirtyRef.current || !hydratedRef.current) return;
      void fetch(`/api/admin/note/lite/documents/${id}/snapshot`, {
        method: 'PUT',
        credentials: 'include',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksRef.current }),
      });
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

  const createDoc = async () => {
    await flushOpen();
    const res = await fetch('/api/admin/note/documents', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '새 메모' }),
    });
    const json = (await res.json().catch(() => ({}))) as { document?: LiteDoc };
    if (!json.document) {
      setError('문서를 만들지 못했습니다.');
      return;
    }
    setDocs((prev) => [json.document!, ...prev]);
    await openDocument(json.document.id, [json.document!, ...docs]);
  };

  const renameDoc = async (nextTitle: string) => {
    setTitle(nextTitle);
    const id = openId;
    if (!id) return;
    await fetch('/api/admin/note/documents', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: nextTitle }),
    });
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, title: nextTitle } : d)));
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('이 메모를 삭제할까요?')) return;
    await fetch(`/api/admin/note/documents?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const next = docs.filter((d) => d.id !== id);
    setDocs(next);
    if (openId === id) {
      setOpenId(null);
      setBlocks([]);
      setHydrated(false);
      if (next[0]) await openDocument(next[0].id);
      else router.replace('/admin/note');
    }
  };

  const visual = useMemo(() => sortLiteBlocksForDisplay(blocks), [blocks]);

  const saveLabel =
    saveState === 'saving'
      ? '저장 중'
      : saveState === 'saved' && !dirty
        ? '저장됨'
        : saveState === 'error'
          ? '저장 실패'
          : dirty
            ? '저장 대기'
            : '';

  return (
    <div className="flex h-[var(--viewport-height-px,100dvh)] bg-[#f7f7f5] text-neutral-900">
      <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center justify-between px-3 py-3">
          <p className="text-sm font-semibold">메모</p>
          <button
            type="button"
            onClick={() => void createDoc()}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
            aria-label="새 메모"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {docsLoading ? (
            <div className="flex justify-center py-8 text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <p className="px-2 py-6 text-xs text-neutral-400">메모가 없습니다.</p>
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className={`group mb-0.5 flex items-center rounded-md ${
                  d.id === openId ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate px-2 py-2 text-left text-sm"
                  onClick={() => void openDocument(d.id)}
                >
                  {d.title || '제목 없음'}
                </button>
                <button
                  type="button"
                  className="hidden p-2 text-neutral-400 hover:text-rose-600 group-hover:block"
                  onClick={() => void deleteDoc(d.id)}
                  aria-label="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-6 py-3">
          <input
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
            value={title}
            placeholder="제목"
            disabled={!openId}
            onChange={(e) => void renameDoc(e.target.value)}
          />
          <span className={`text-xs ${saveState === 'error' ? 'text-rose-600' : 'text-neutral-400'}`}>
            {saveLabel}
          </span>
        </header>
        {error ? <p className="px-6 pt-2 text-xs text-rose-600">{error}</p> : null}
        {!openId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
            왼쪽에서 메모를 만들거나 고르세요.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-2xl">
              {visual.map((block) => (
                <LiteBlockRow
                  key={block.id}
                  block={block}
                  depth={depthOf(block.id, blocks)}
                  numberLabel={numberedMarker(block, visual)}
                  disabled={!hydrated}
                  isDragging={draggingId === block.id}
                  dropBefore={dropBeforeId === block.id}
                  requestFocus={focusBlockId === block.id}
                  onFocused={() => setFocusBlockId(null)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', block.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingId(block.id);
                    setDropAtEnd(false);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropBeforeId(null);
                    setDropAtEnd(false);
                  }}
                  onDragOver={() => {
                    if (draggingId && draggingId !== block.id) {
                      setDropBeforeId(block.id);
                      setDropAtEnd(false);
                    }
                  }}
                  onDropBefore={(dragId) => {
                    mutate((prev) => moveBlockBefore(prev, dragId, block.id));
                    setDraggingId(null);
                    setDropBeforeId(null);
                    setDropAtEnd(false);
                  }}
                  onChangeText={(text) => {
                    const md = detectMarkdownType(text);
                    if (md && md.type !== block.type) {
                      mutate((prev) =>
                        updateBlockText(setBlockType(prev, block.id, md.type), block.id, md.text),
                      );
                      return;
                    }
                    mutate((prev) => updateBlockText(prev, block.id, text));
                  }}
                  onEnter={() => {
                    const created = createEmptyLiteBlock(
                      block.document_id,
                      continueType(block.type),
                      block.parent_block_id,
                    );
                    mutate((prev) => insertBlockAfter(prev, block.id, created));
                    setFocusBlockId(created.id);
                  }}
                  onBackspaceEmpty={() =>
                    mutate((prev) => {
                      if (prev.length <= 1) return prev;
                      return mergeIntoPrevious(prev, block.id);
                    })
                  }
                  onIndent={() => mutate((prev) => indentBlock(prev, block.id))}
                  onOutdent={() => mutate((prev) => outdentBlock(prev, block.id))}
                  onToggle={() => mutate((prev) => toggleTodoChecked(prev, block.id))}
                  onInsert={() => {
                    const created = createEmptyLiteBlock(block.document_id, 'text', block.parent_block_id);
                    mutate((prev) => insertBlockAfter(prev, block.id, created));
                    setFocusBlockId(created.id);
                  }}
                  onConvert={(t) => mutate((prev) => setBlockType(prev, block.id, t))}
                  onRemove={() =>
                    mutate((prev) => {
                      if (prev.length <= 1) {
                        const keep = prev[0];
                        if (!keep) return prev;
                        return [
                          {
                            ...keep,
                            type: 'text',
                            parent_block_id: null,
                            content: { text: '', checked: false },
                          },
                        ];
                      }
                      return removeBlock(prev, block.id);
                    })
                  }
                />
              ))}
              <div
                className={`mx-8 h-8 ${dropAtEnd ? 'border-t-2 border-sky-500' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingId) {
                    setDropBeforeId(null);
                    setDropAtEnd(true);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragId = e.dataTransfer.getData('text/plain');
                  const last = visual[visual.length - 1];
                  if (dragId && last && dragId !== last.id) {
                    mutate((prev) => moveBlockAfter(prev, dragId, last.id));
                  }
                  setDraggingId(null);
                  setDropBeforeId(null);
                  setDropAtEnd(false);
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function continueType(type: NoteLiteBlockType): NoteLiteBlockType {
  if (type === 'bulletList' || type === 'numberedList' || type === 'todo') return type;
  return 'text';
}

function numberedMarker(block: NoteLiteBlock, visual: NoteLiteBlock[]): string | null {
  if (block.type !== 'numberedList') return null;
  const siblings = visual.filter((b) => b.parent_block_id === block.parent_block_id);
  const idx = siblings.findIndex((b) => b.id === block.id);
  let n = 0;
  for (let i = 0; i <= idx; i++) {
    if (siblings[i]?.type === 'numberedList') n += 1;
    else n = 0;
  }
  return `${n}.`;
}

function LiteBlockRow({
  block,
  depth,
  numberLabel,
  disabled,
  isDragging,
  dropBefore,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDropBefore,
  onChangeText,
  onEnter,
  onBackspaceEmpty,
  onIndent,
  onOutdent,
  onToggle,
  onInsert,
  onConvert,
  onRemove,
  requestFocus,
  onFocused,
}: {
  block: NoteLiteBlock;
  depth: number;
  numberLabel: string | null;
  disabled: boolean;
  isDragging: boolean;
  dropBefore: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDropBefore: (dragId: string) => void;
  onChangeText: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onToggle: () => void;
  onInsert: () => void;
  onConvert: (type: NoteLiteBlockType) => void;
  onRemove: () => void;
  requestFocus: boolean;
  onFocused: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skipDotsClickRef = useRef(false);
  const onFocusedRef = useRef(onFocused);
  useEffect(() => {
    onFocusedRef.current = onFocused;
  }, [onFocused]);
  const text = typeof block.content.text === 'string' ? block.content.text : '';
  const size =
    block.type === 'heading'
      ? 'text-2xl font-bold leading-tight'
      : block.type === 'heading2'
        ? 'text-xl font-semibold leading-tight'
        : block.type === 'heading3'
          ? 'text-lg font-semibold leading-snug'
          : 'text-[16px] leading-relaxed';

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!requestFocus) return;
    const el = textareaRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
      onFocusedRef.current();
    });
    return () => window.cancelAnimationFrame(id);
  }, [requestFocus]);

  const showChrome = menuOpen;

  return (
    <div
      className={`group relative ${isDragging ? 'opacity-40' : ''}`}
      style={{ paddingLeft: depth * 22 }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) onDropBefore(id);
      }}
    >
      {dropBefore ? (
        <div className="absolute left-12 right-0 top-0 z-10 h-0.5 rounded-full bg-sky-500" />
      ) : null}
      <div className="flex items-start">
        <div
          className={`mt-0.5 flex w-11 shrink-0 items-center justify-end gap-px ${
            showChrome ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                skipDotsClickRef.current = true;
                onDragStart(e);
              }}
              onDragEnd={onDragEnd}
              onClick={() => {
                if (skipDotsClickRef.current) {
                  skipDotsClickRef.current = false;
                  return;
                }
                setMenuOpen((open) => !open);
              }}
              className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-neutral-400 hover:bg-neutral-200/80 active:cursor-grabbing"
              aria-label="전환 또는 삭제"
              disabled={disabled}
            >
              <DragDots />
            </button>
            {menuOpen ? (
              <div className="absolute left-0 top-7 z-20 w-36 rounded-lg border border-neutral-200 bg-white py-1 shadow-md">
                <p className="px-3 py-1 text-[10px] font-medium tracking-wide text-neutral-400">전환</p>
                {CONVERT_TYPES.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={`block w-full px-3 py-1.5 text-left text-[13px] hover:bg-neutral-50 ${
                      block.type === item.type ? 'font-medium text-neutral-900' : 'text-neutral-600'
                    }`}
                    onClick={() => {
                      onConvert(item.type);
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="my-1 border-t border-neutral-100" />
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-[13px] text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    onRemove();
                    setMenuOpen(false);
                  }}
                >
                  삭제
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-6 w-5 items-center justify-center rounded text-neutral-400 hover:bg-neutral-200/80"
            aria-label="아래에 줄 추가"
            disabled={disabled}
            onClick={onInsert}
          >
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
        {block.type === 'todo' ? (
          <button
            type="button"
            className={`mt-1.5 ml-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
              block.content.checked
                ? 'border-neutral-800 bg-neutral-800 text-white'
                : 'border-neutral-400 bg-white'
            }`}
            onClick={onToggle}
            disabled={disabled}
            aria-label="완료"
          >
            {block.content.checked ? <Check size={12} /> : null}
          </button>
        ) : block.type === 'bulletList' ? (
          <span className="mt-1.5 ml-1 w-5 shrink-0 text-center text-[15px] leading-6 text-neutral-400">•</span>
        ) : block.type === 'numberedList' ? (
          <span className="mt-1.5 ml-1 w-6 shrink-0 text-right text-[13px] tabular-nums leading-6 text-neutral-400">
            {numberLabel}
          </span>
        ) : null}
        <textarea
          ref={textareaRef}
          disabled={disabled}
          value={text}
          rows={1}
          className={`ml-1.5 min-h-[28px] w-full resize-none bg-transparent py-0.5 outline-none ${size} ${
            block.content.checked ? 'text-neutral-400 line-through' : ''
          }`}
          placeholder=""
          onChange={(e) => {
            onChangeText(e.target.value);
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onEnter();
            }
            if (e.key === 'Backspace' && text.length === 0) {
              e.preventDefault();
              onBackspaceEmpty();
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              if (e.shiftKey) onOutdent();
              else onIndent();
            }
          }}
        />
      </div>
    </div>
  );
}

function DragDots() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" aria-hidden="true" fill="currentColor">
      <circle cx="2" cy="1.6" r="1" />
      <circle cx="6" cy="1.6" r="1" />
      <circle cx="2" cy="6.5" r="1" />
      <circle cx="6" cy="6.5" r="1" />
      <circle cx="2" cy="11.4" r="1" />
      <circle cx="6" cy="11.4" r="1" />
    </svg>
  );
}
