'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Plus, RotateCw, AlertTriangle, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { NoteV2Document } from '@/app/lib/note-v2/contract';
import { getTreeAncestors, projectNoteV2Tree, type NoteV2TreeRow } from '@/app/lib/note-v2/tree-core';
import NoteStage4Editor, { type Stage4EditorHandle } from '../note-v2-stage4/NoteStage4Editor';
import NoteStage5Sidebar from './NoteStage5Sidebar';
import NoteStage5Search from './NoteStage5Search';
import { getVisibleBreadcrumbs } from '@/app/lib/note-v2/search-core';

const ROOT_URL = '/admin/note-v2-stage5';
const EXPANSION_KEY = 'spokedu.note-v2.stage5.expanded';
const LAST_SELECTION_KEY = 'spokedu.note-v2.stage5.last-id';

type ApiError = { error?: string };
async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & ApiError;
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}
async function getTree(): Promise<NoteV2TreeRow[]> {
  const response = await fetch('/api/admin/note-v2/tree', { credentials: 'same-origin', cache: 'no-store' });
  const payload = await parseResponse<{ documents?: NoteV2TreeRow[] }>(response);
  if (!Array.isArray(payload.documents)) throw new Error('INVALID_TREE_RESPONSE');
  return payload.documents;
}
async function getDocument(id: string): Promise<NoteV2Document> {
  const response = await fetch(`/api/admin/note-v2/documents/${id}`, { credentials: 'same-origin', cache: 'no-store' });
  const payload = await parseResponse<{ document?: NoteV2Document }>(response);
  if (!payload.document || !Array.isArray(payload.document.content)) throw new Error('INVALID_DOCUMENT_RESPONSE');
  return payload.document;
}
async function mutateTree(id: string, body: Record<string, unknown>): Promise<void> {
  await parseResponse<unknown>(await fetch(`/api/admin/note-v2/tree/${id}`, {
    method: 'PATCH', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
}

export default function NoteStage5Workspace() {
  const router = useRouter();
  const [records, setRecords] = useState<NoteV2TreeRow[]>([]);
  const [document, setDocument] = useState<NoteV2Document | null>(null);
  const documentRef = useRef<NoteV2Document | null>(null);
  const editorRef = useRef<Stage4EditorHandle>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTrash, setShowTrash] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const projection = useMemo(() => projectNoteV2Tree(records), [records]);
  const breadcrumbs = useMemo(() => document ? getVisibleBreadcrumbs(document.id, records, projection.visibleIds) : [], [document, records, projection.visibleIds]);
  const navigateRef = useRef<(id: string) => Promise<void>>(async () => {});

  const setCurrent = (next: NoteV2Document | null) => {
    documentRef.current = next;
    setDocument(next);
  };

  const expandAncestors = useCallback((id: string, rows: NoteV2TreeRow[]) => {
    const ancestorIds = getTreeAncestors(id, rows);
    setExpanded((previous) => new Set([...previous, ...ancestorIds]));
  }, []);

  const enterTask = (): boolean => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    return true;
  };
  const leaveTask = () => { busyRef.current = false; setBusy(false); };
  const flushBeforeNavigation = async (): Promise<boolean> => {
    if (!documentRef.current || !editorRef.current) return true;
    const ok = await editorRef.current.flushPending();
    if (!ok) setError('저장이 완료되지 않았습니다. 화면의 글을 내보내거나 저장 문제를 해결한 뒤 페이지를 이동하세요.');
    return ok;
  };

  useEffect(() => {
    let alive = true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(EXPANSION_KEY) || '[]') as unknown;
      if (Array.isArray(stored)) setExpanded(new Set(stored.filter((value): value is string => typeof value === 'string')));
    } catch { /* Stale UI state must not block note content. */ }
    void (async () => {
      try {
        const rows = await getTree();
        if (!alive) return;
        setRecords(rows);
        const projected = projectNoteV2Tree(rows);
        const fromUrl = new URLSearchParams(window.location.search).get('id');
        const fromStorage = window.localStorage.getItem(LAST_SELECTION_KEY);
        const candidate = [fromUrl, fromStorage, projected.roots[0]?.id].find((id) => id && projected.visibleIds.has(id));
        if (candidate) {
          const initial = await getDocument(candidate);
          if (!alive) return;
          setCurrent(initial);
          expandAncestors(candidate, rows);
          window.localStorage.setItem(LAST_SELECTION_KEY, candidate);
          // URL is authoritative for refresh/back navigation; retain only one id.
          window.history.replaceState(null, '', `${ROOT_URL}?id=${encodeURIComponent(candidate)}`);
        }
        setReady(true);
      } catch (e) { if (alive) { setError(e instanceof Error ? e.message : '노트 로드 실패'); setReady(true); } }
    })();
    return () => { alive = false; };
  }, [expandAncestors]);

  useEffect(() => {
    window.localStorage.setItem(EXPANSION_KEY, JSON.stringify(Array.from(expanded)));
  }, [expanded]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.isComposing || event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey) || event.altKey) return;
      event.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  const navigateTo = async (id: string, historyMode: 'push' | 'none' = 'push') => {
    if (id === documentRef.current?.id) { setMobileOpen(false); return; }
    if (!enterTask()) return;
    try {
      if (!(await flushBeforeNavigation())) return;
      const next = await getDocument(id);
      setCurrent(next);
      expandAncestors(id, records);
      window.localStorage.setItem(LAST_SELECTION_KEY, id);
      if (historyMode === 'push') router.push(`${ROOT_URL}?id=${encodeURIComponent(id)}`, { scroll: false });
      setMobileOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : '페이지를 열 수 없습니다.'); }
    finally { leaveTask(); }
  };
  navigateRef.current = (id: string) => navigateTo(id, 'none');

  useEffect(() => {
    const onPopState = () => {
      const id = new URLSearchParams(window.location.search).get('id');
      if (id && id !== documentRef.current?.id) {
        void navigateRef.current(id).then(() => {
          // Failed navigation cannot leave URL pointing at a different editable document.
          if (documentRef.current?.id !== id && documentRef.current) {
            window.history.replaceState(null, '', `${ROOT_URL}?id=${encodeURIComponent(documentRef.current.id)}`);
          }
        });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refresh = async () => {
    const latest = await getTree();
    setRecords(latest);
    return latest;
  };

  const create = async (parentId: string | null) => {
    if (!enterTask()) return;
    try {
      if (!(await flushBeforeNavigation())) return;
      const response = await fetch('/api/admin/note-v2/tree', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '새 페이지', parent_id: parentId }),
      });
      const payload = await parseResponse<{ document?: NoteV2TreeRow }>(response);
      if (!payload.document) throw new Error('INVALID_CREATE_RESPONSE');
      const rows = await refresh();
      const created = await getDocument(payload.document.id);
      setCurrent(created);
      if (parentId) setExpanded((previous) => new Set([...previous, parentId]));
      expandAncestors(created.id, rows);
      window.localStorage.setItem(LAST_SELECTION_KEY, created.id);
      router.push(`${ROOT_URL}?id=${encodeURIComponent(created.id)}`, { scroll: false });
      setMobileOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : '페이지 생성 실패'); }
    finally { leaveTask(); }
  };

  const rename = async (id: string, title: string, expectedTitle: string): Promise<boolean> => {
    if (!enterTask()) return false;
    try {
      await mutateTree(id, { action: 'rename', title, expectedTitle });
      await refresh();
      if (documentRef.current?.id === id) setCurrent({ ...documentRef.current, title });
      return true;
    } catch (e) {
      setError(e instanceof Error ? `제목 변경 실패: ${e.message}` : '제목 변경 실패');
      try { await refresh(); } catch { /* Preserve error. */ }
      return false;
    } finally { leaveTask(); }
  };

  const reorder = async (id: string, direction: 'up' | 'down') => {
    if (!enterTask()) return;
    try { await mutateTree(id, { action: 'reorder', direction }); await refresh(); }
    catch (e) { setError(e instanceof Error ? `순서 변경 실패: ${e.message}` : '순서 변경 실패'); }
    finally { leaveTask(); }
  };

  const trashPage = async (id: string) => {
    const name = records.find((row) => row.id === id)?.title || '선택한 페이지';
    if (!window.confirm(`‘${name}’ 페이지를 휴지통으로 이동할까요? 하위 페이지는 함께 숨겨지며 복구할 수 있습니다.`)) return;
    if (!enterTask()) return;
    try {
      if (!(await flushBeforeNavigation())) return;
      await mutateTree(id, { action: 'trash' });
      const rows = await refresh();
      const tree = projectNoteV2Tree(rows);
      const selected = documentRef.current;
      if (selected && !tree.visibleIds.has(selected.id)) {
        const nextId = tree.roots[0]?.id;
        if (nextId) {
          const next = await getDocument(nextId);
          setCurrent(next);
          window.localStorage.setItem(LAST_SELECTION_KEY, nextId);
          router.replace(`${ROOT_URL}?id=${encodeURIComponent(nextId)}`, { scroll: false });
        } else {
          setCurrent(null);
          window.localStorage.removeItem(LAST_SELECTION_KEY);
          router.replace(ROOT_URL, { scroll: false });
        }
      }
    } catch (e) { setError(e instanceof Error ? `휴지통 이동 실패: ${e.message}` : '휴지통 이동 실패'); }
    finally { leaveTask(); }
  };

  const restore = async (id: string) => {
    if (!enterTask()) return;
    try {
      await mutateTree(id, { action: 'restore' });
      const rows = await refresh();
      expandAncestors(id, rows);
    } catch (e) { setError(e instanceof Error ? `복구 실패: ${e.message}` : '복구 실패'); }
    finally { leaveTask(); }
  };

  const toggle = (id: string) => setExpanded((old) => {
    const next = new Set(old);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="flex h-[100dvh] min-h-0 w-full min-w-0 overflow-hidden bg-white" data-testid="note-v2-stage5-workspace">
      <NoteStage5Sidebar
        roots={projection.roots} trash={projection.trash} selectedId={document?.id || null}
        expanded={expanded} showTrash={showTrash} onToggleTrash={() => setShowTrash(!showTrash)}
        mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} busy={busy}
        onOpenSearch={() => { setMobileOpen(false); setSearchOpen(true); }}
        onToggle={toggle} onSelect={(id) => void navigateTo(id)} onCreate={(parentId) => void create(parentId)}
        onRename={rename} onReorder={(id, direction) => void reorder(id, direction)}
        onTrash={(id) => void trashPage(id)} onRestore={(id) => void restore(id)}
      />
      <section className="min-w-0 flex-1 overflow-y-auto" aria-label="노트 편집 화면">
        <div className="flex min-h-12 items-center gap-2 border-b border-neutral-100 px-4 md:hidden">
          <button type="button" aria-label="페이지 목록 열기" className="rounded p-2 hover:bg-neutral-100" onClick={() => setMobileOpen(true)}><Menu size={20}/></button>
          <span className="truncate text-sm font-semibold text-neutral-600">{document?.title || 'SPOKEDU 노트'}</span>
        </div>
        {error && <div role="alert" className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle size={17} className="mt-0.5 shrink-0"/><span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" aria-label="오류 알림 닫기" onClick={() => setError('')} className="rounded px-2">닫기</button>
        </div>}
        {projection.corruptIds.size > 0 && <p role="alert" className="mx-4 mt-3 text-xs text-red-700">계층 구조가 불완전한 페이지가 {projection.corruptIds.size}개 있습니다. 임의로 이동하거나 삭제하지 않았습니다.</p>}
        {!ready && <div role="status" className="grid min-h-[60vh] place-items-center text-sm text-neutral-500">페이지 불러오는 중…</div>}
        {ready && !document && <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold">SPOKEDU 노트 V2</h1>
          <p className="text-sm leading-7 text-neutral-500">왼쪽 사이드바에서 페이지를 만들고 문서와 하위 페이지를 정리하세요.</p>
          <button type="button" disabled={busy} onClick={() => void create(null)} className="flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"><Plus size={17}/> 첫 페이지 만들기</button>
          <button type="button" disabled={busy} onClick={() => void refresh().catch((e) => setError(String(e)))} className="flex items-center gap-1 text-xs text-neutral-500"><RotateCw size={14}/> 목록 새로고침</button>
        </div>}
        {document && <>
          <nav aria-label="현재 페이지 경로" className="flex flex-wrap items-center gap-1 border-b border-neutral-100 px-4 py-2 text-xs text-neutral-500 sm:px-8">
            <span className="mr-1 font-medium text-neutral-400">내 페이지</span>
            {breadcrumbs.map((item, index) => <span key={item.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight size={13} className="shrink-0 text-neutral-300"/>
              {index === breadcrumbs.length - 1 ?
                <span aria-current="page" className="max-w-44 truncate font-semibold text-neutral-700" title={item.title}>{item.title}</span> :
                <button type="button" disabled={busy} onClick={() => void navigateTo(item.id)} title={item.title}
                  className="max-w-44 truncate rounded px-1 py-1 hover:bg-neutral-100 disabled:opacity-50">{item.title}</button>}
            </span>)}
          </nav>
          <NoteStage4Editor key={document.id} ref={editorRef} initial={document} locked={busy}/>
        </>}
        {searchOpen && <NoteStage5Search rows={records} visibleIds={projection.visibleIds} selectedId={document?.id || null} busy={busy}
          onClose={() => setSearchOpen(false)} onSelect={async (id) => {
            await navigateTo(id);
            if (documentRef.current?.id === id) setSearchOpen(false);
          }}/>}
      </section>
    </div>
  );
}
