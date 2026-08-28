'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Download,
  GripVertical,
  LayoutDashboard,
  ListChecks,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MemoPageRow } from '@/app/lib/admin/memo/types';
import { filterPagesByQuery, insertAtCursor } from '@/app/lib/admin/memo/memoChecklist';
import { readRecentPageIds, rememberRecentPage } from '@/app/lib/admin/memo/memoRecent';

const SAVE_DEBOUNCE_MS = 300;

function buildPageTree(pages: MemoPageRow[]): Array<MemoPageRow & { depth: number }> {
  const byParent = new Map<string | null, MemoPageRow[]>();
  for (const page of pages) {
    const key = page.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(page);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order_index - b.order_index);
  }

  const out: Array<MemoPageRow & { depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const child of byParent.get(parentId) ?? []) {
      out.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function getSiblings(pages: MemoPageRow[], parentId: string | null): MemoPageRow[] {
  return pages
    .filter((p) => p.parent_id === parentId)
    .sort((a, b) => a.order_index - b.order_index);
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  const json = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) {
    throw new Error(typeof json?.error === 'string' ? json.error : '요청 실패');
  }
  return json;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatSavedTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export default function AdminMemoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center text-sm text-slate-400">
          불러오는 중…
        </div>
      }
    >
      <AdminMemoPageContent />
    </Suspense>
  );
}

function AdminMemoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  const [pages, setPages] = useState<MemoPageRow[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraft = useRef({ title: '', body: '' });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const saveStateRef = useRef<SaveState>('idle');
  const prevPageIdRef = useRef<string | null>(null);

  saveStateRef.current = saveState;

  const getEditorBody = useCallback(() => bodyRef.current?.value ?? body, [body]);

  const filteredPages = useMemo(
    () => filterPagesByQuery(pages, searchQuery),
    [pages, searchQuery],
  );

  const pageTree = useMemo(() => {
    if (searchQuery.trim()) {
      return filteredPages.map((page) => ({ ...page, depth: 0 }));
    }
    return buildPageTree(pages);
  }, [pages, filteredPages, searchQuery]);

  const recentPages = useMemo(
    () =>
      recentIds
        .map((id) => pages.find((p) => p.id === id))
        .filter((p): p is MemoPageRow => Boolean(p)),
    [recentIds, pages],
  );

  const loadPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const data = await apiJson<{ ok: true; pages: MemoPageRow[] }>('/api/admin/memo/pages');
      setPages(data.pages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '페이지 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingPages(false);
    }
  }, []);

  const flushSave = useCallback(async (pageId: string) => {
    if (!online) {
      setSaveState('error');
      toast.error('오프라인 상태입니다. 연결 후 다시 저장해 주세요.');
      return;
    }
    if (bodyRef.current) {
      latestDraft.current.body = bodyRef.current.value;
    }
    const draft = latestDraft.current;
    setSaveState('saving');
    try {
      await apiJson(`/api/admin/memo/pages/${encodeURIComponent(pageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: draft.title, body: draft.body }),
      });
      setSaveState('saved');
      setLastSavedAt(Date.now());
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, title: draft.title, body: draft.body, updated_at: new Date().toISOString() } : p,
        ),
      );
    } catch (e) {
      setSaveState('error');
      toast.error(e instanceof Error ? e.message : '저장 실패');
    }
  }, [online]);

  const scheduleSave = useCallback(
    (pageId: string) => {
      if (!online) {
        setSaveState('dirty');
        return;
      }
      setSaveState('dirty');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave(pageId);
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave, online],
  );

  const loadPage = useCallback(
    async (pageId: string) => {
      setLoadingPage(true);
      setSaveState('idle');
      try {
        const data = await apiJson<{ ok: true; page: MemoPageRow }>(
          `/api/admin/memo/pages/${encodeURIComponent(pageId)}`,
        );
        setTitle(data.page.title);
        const loadedBody = data.page.body ?? '';
        setBody(loadedBody);
        latestDraft.current = { title: data.page.title, body: loadedBody };
        setUpdatedByName(data.page.updated_by_name ?? null);
        setRecentIds(rememberRecentPage(pageId));
        setEditorKey((k) => k + 1);
        requestAnimationFrame(() => bodyRef.current?.focus());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '페이지를 불러오지 못했습니다.');
      } finally {
        setLoadingPage(false);
      }
    },
    [],
  );

  const updateTitle = (value: string) => {
    setTitle(value);
    latestDraft.current = { ...latestDraft.current, title: value };
    if (selectedId) scheduleSave(selectedId);
  };

  const syncFromTextarea = (schedule = true) => {
    const el = bodyRef.current;
    if (!el) return;
    latestDraft.current.body = el.value;
    if (schedule && selectedId) scheduleSave(selectedId);
  };

  const insertChecklistLine = () => {
    const el = bodyRef.current;
    if (!el) return;
    insertAtCursor(el, '- [ ] \n');
    syncFromTextarea();
  };

  const insertSectionLine = () => {
    const el = bodyRef.current;
    if (!el) return;
    const pos = insertAtCursor(el, '## \n');
    el.setSelectionRange(pos - 1, pos - 1);
    syncFromTextarea();
  };

  useEffect(() => {
    setRecentIds(readRecentPageIds());
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    const prevId = prevPageIdRef.current;
    prevPageIdRef.current = selectedId;
    if (prevId && prevId !== selectedId) {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (saveStateRef.current === 'dirty') {
        void flushSave(prevId);
      }
    }
  }, [selectedId, flushSave]);

  useEffect(() => {
    if (!selectedId) {
      setTitle('');
      setBody('');
      setSaveState('idle');
      return;
    }
    void loadPage(selectedId);
  }, [selectedId, loadPage]);

  useEffect(() => {
    const syncOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    syncOnline();
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  useEffect(() => {
    if (online && selectedId && saveStateRef.current === 'dirty') {
      scheduleSave(selectedId);
    }
  }, [online, selectedId, scheduleSave]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedId) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          void flushSave(selectedId);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStateRef.current === 'dirty') {
        e.preventDefault();
      }
    };
    const onVisibility = () => {
      if (
        document.visibilityState === 'hidden' &&
        selectedId &&
        saveStateRef.current === 'dirty'
      ) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        void flushSave(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [selectedId, flushSave]);

  const selectPage = (id: string) => {
    router.replace(`/admin/memo?id=${encodeURIComponent(id)}`);
  };

  const createPage = async (parentId: string | null) => {
    try {
      const data = await apiJson<{ ok: true; page: MemoPageRow }>('/api/admin/memo/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, title: parentId ? '하위 페이지' : '새 페이지' }),
      });
      await loadPages();
      selectPage(data.page.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '페이지 생성 실패');
    }
  };

  const deletePage = async (id: string) => {
    if (!window.confirm('이 페이지와 하위를 모두 삭제할까요?')) return;
    try {
      await apiJson(`/api/admin/memo/pages/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadPages();
      if (selectedId === id) router.replace('/admin/memo');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '페이지 삭제 실패');
    }
  };

  const reorderPages = async (parentId: string | null, orderedIds: string[]) => {
    try {
      await apiJson('/api/admin/memo/pages/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, orderedIds }),
      });
      await loadPages();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '순서 저장 실패');
      await loadPages();
    }
  };

  const handlePageDrop = (parentId: string | null, targetId: string) => {
    if (!draggingPageId || draggingPageId === targetId) return;
    const siblings = getSiblings(pages, parentId);
    const ids = siblings.map((p) => p.id);
    const from = ids.indexOf(draggingPageId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, draggingPageId);
    void reorderPages(parentId, next);
    setDraggingPageId(null);
  };

  const saveLabel = !online
    ? '오프라인'
    : saveState === 'saving'
      ? '저장 중…'
      : saveState === 'saved'
        ? lastSavedAt
          ? `저장됨 ${formatSavedTime(lastSavedAt)}`
          : '저장됨'
        : saveState === 'dirty'
          ? '수정됨 (자동 저장 대기)'
          : saveState === 'error'
            ? '저장 실패'
            : '';

  const safeFilename = (title || 'memo').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);

  return (
    <>
      <style jsx global>{`
        @media print {
          .memo-no-print {
            display: none !important;
          }
          .memo-print-root {
            height: auto !important;
            overflow: visible !important;
          }
          .memo-print-area textarea {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
          }
        }
      `}</style>

      <div className="memo-print-root flex h-[100dvh] min-h-0 flex-col bg-white">
        <header className="memo-no-print flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            >
              <LayoutDashboard className="h-4 w-4" />
              관리 홈
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-sm font-semibold text-slate-900">메모장</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {saveLabel ? (
              <span className={!online || saveState === 'error' ? 'text-amber-600' : ''}>{saveLabel}</span>
            ) : null}
            <span>어드민 공유</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="memo-no-print flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-sm outline-none focus:border-slate-400"
                  placeholder="페이지 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {recentPages.length > 0 && !searchQuery.trim() ? (
              <div className="border-b border-slate-200 px-2 py-2">
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  최근
                </p>
                {recentPages.map((page) => (
                  <button
                    key={`recent-${page.id}`}
                    type="button"
                    className={`mb-0.5 w-full truncate rounded px-2 py-1.5 text-left text-sm ${
                      selectedId === page.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/70'
                    }`}
                    onClick={() => selectPage(page.id)}
                  >
                    {page.title || '제목 없음'}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">페이지</span>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-800"
                onClick={() => void createPage(null)}
                title="페이지 추가"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loadingPages ? (
                <p className="px-2 py-4 text-xs text-slate-400">불러오는 중…</p>
              ) : pageTree.length === 0 ? (
                <button
                  type="button"
                  className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-slate-400"
                  onClick={() => void createPage(null)}
                >
                  {searchQuery.trim() ? '검색 결과 없음' : '첫 페이지 만들기'}
                </button>
              ) : (
                pageTree.map((page) => (
                  <div
                    key={page.id}
                    className={`group mb-0.5 flex items-center rounded-md ${
                      selectedId === page.id ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                    } ${draggingPageId === page.id ? 'opacity-50' : ''}`}
                    style={{ paddingLeft: searchQuery.trim() ? 8 : 8 + page.depth * 12 }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (!searchQuery.trim()) handlePageDrop(page.parent_id, page.id);
                    }}
                  >
                    {!searchQuery.trim() ? (
                      <button
                        type="button"
                        draggable
                        className="shrink-0 cursor-grab p-0.5 text-slate-300 hover:text-slate-500"
                        aria-label="순서 변경"
                        onDragStart={() => setDraggingPageId(page.id)}
                        onDragEnd={() => setDraggingPageId(null)}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate py-2 pr-1 text-left text-sm text-slate-700"
                      onClick={() => selectPage(page.id)}
                    >
                      {page.title || '제목 없음'}
                    </button>
                    <button
                      type="button"
                      className="hidden rounded p-1 text-slate-400 hover:text-slate-700 group-hover:block"
                      onClick={() => void createPage(page.id)}
                      title="하위 페이지"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="hidden rounded p-1 text-slate-400 hover:text-rose-500 group-hover:block"
                      onClick={() => void deletePage(page.id)}
                      title="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <main className="memo-print-area flex min-h-0 min-w-0 flex-1 flex-col">
            {!selectedId ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                왼쪽에서 페이지를 선택하세요.
              </div>
            ) : loadingPage ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                불러오는 중…
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-slate-100 px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <input
                        className="w-full border-0 bg-transparent text-xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
                        placeholder="제목"
                        value={title}
                        onChange={(e) => updateTitle(e.target.value)}
                      />
                      {updatedByName ? (
                        <p className="mt-1 text-xs text-slate-400">마지막 수정 · {updatedByName}</p>
                      ) : null}
                    </div>
                    <div className="memo-no-print flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="rounded p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        title="TXT 다운로드"
                        onClick={() => downloadText(`${safeFilename}.txt`, `${title}\n\n${getEditorBody()}`)}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-2 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        title="MD 다운로드"
                        onClick={() => downloadText(`${safeFilename}.md`, `# ${title}\n\n${getEditorBody()}`)}
                      >
                        MD
                      </button>
                      <button
                        type="button"
                        className="rounded p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        title="인쇄 (Ctrl+P)"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="memo-no-print flex shrink-0 items-center gap-2 border-b border-slate-100 px-6 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertChecklistLine()}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                    체크
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertSectionLine()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    섹션
                  </button>
                  <span className="text-xs text-slate-400">
                    체크 <code className="text-slate-500">- [ ]</code> · 섹션 <code className="text-slate-500">##</code>
                  </span>
                </div>

                <textarea
                  key={`${selectedId}-${editorKey}`}
                  ref={bodyRef}
                  className="min-h-0 flex-1 resize-none border-0 px-6 py-4 text-[15px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-300"
                  defaultValue={body}
                  onInput={() => syncFromTextarea()}
                  placeholder="여기에 자유롭게 작성하세요."
                  spellCheck
                />

                <div className="memo-no-print shrink-0 border-t border-slate-100 px-6 py-2 text-xs text-slate-400">
                  <button
                    type="button"
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => setShowShortcuts((v) => !v)}
                  >
                    {showShortcuts ? '단축키 숨기기' : '단축키 보기'}
                  </button>
                  {showShortcuts ? (
                    <p className="mt-1 leading-relaxed">Ctrl+S 저장 · Ctrl+P 인쇄</p>
                  ) : null}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
