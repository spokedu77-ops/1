'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  LayoutDashboard,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MemoBlockRow, MemoBlockType, MemoPageRow } from '@/app/lib/admin/memo/types';
import {
  flattenPasteItems,
  normalizeMemoBlockContent,
  parseMemoPasteFromClipboard,
  type MemoPasteItem,
} from '@/app/lib/admin/memo/memoPaste';
import {
  getSiblingBlocks,
  parsePlainTextPasteLines,
  rangeSelectSiblingIds,
  shouldDeleteBlockOnBackspace,
  shouldDeleteSelectedText,
} from '@/app/lib/admin/memo/memoKeyboard';

const DEBOUNCE_MS = 400;

function adjustTextareaHeight(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

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
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      out.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function groupBlocks(blocks: MemoBlockRow[]) {
  const byParent = new Map<string | null, MemoBlockRow[]>();
  for (const block of blocks) {
    const key = block.parent_block_id;
    const list = byParent.get(key) ?? [];
    list.push(block);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order_index - b.order_index);
  }
  return byParent;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  const json = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) {
    throw new Error(typeof json?.error === 'string' ? json.error : '요청 실패');
  }
  return json;
}

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
  const [blocks, setBlocks] = useState<MemoBlockRow[]>([]);
  const [pageTitle, setPageTitle] = useState('');
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(() => new Set());

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSelectedBlockRef = useRef<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const pageTree = useMemo(() => buildPageTree(pages), [pages]);
  const blocksByParent = useMemo(() => groupBlocks(blocks), [blocks]);
  const rootBlocks = blocksByParent.get(null) ?? [];

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

  const loadBlocks = useCallback(async (memoId: string) => {
    setLoadingBlocks(true);
    try {
      const data = await apiJson<{
        ok: true;
        page: { id: string; title: string };
        blocks: MemoBlockRow[];
      }>(`/api/admin/memo/pages/${encodeURIComponent(memoId)}/blocks`);
      setPageTitle(data.page.title);
      const normalizedBlocks = data.blocks.map((block) => ({
        ...block,
        content: normalizeMemoBlockContent(block.content),
      }));
      setBlocks(normalizedBlocks);
      for (const block of normalizedBlocks) {
        const raw = data.blocks.find((b) => b.id === block.id)?.content;
        if (raw && raw !== block.content) {
          void apiJson(`/api/admin/memo/blocks/${encodeURIComponent(block.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: block.content }),
          });
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '블록을 불러오지 못했습니다.');
    } finally {
      setLoadingBlocks(false);
    }
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (!selectedId) {
      setBlocks([]);
      setPageTitle('');
      setSelectedBlockIds(new Set());
      return;
    }
    setSelectedBlockIds(new Set());
    void loadBlocks(selectedId);
  }, [selectedId, loadBlocks]);

  const focusBlock = (blockId: string) => {
    requestAnimationFrame(() => {
      textareaRefs.current.get(blockId)?.focus();
    });
  };

  const selectBlocks = (ids: string[], anchorId?: string) => {
    setSelectedBlockIds(new Set(ids));
    if (anchorId) lastSelectedBlockRef.current = anchorId;
    else if (ids.length === 1) lastSelectedBlockRef.current = ids[0] ?? null;
  };

  const handleRowSelect = (
    blockId: string,
    parentBlockId: string | null,
    shiftKey: boolean,
  ) => {
    if (shiftKey && lastSelectedBlockRef.current) {
      const rangeIds = rangeSelectSiblingIds(
        blocks,
        parentBlockId,
        lastSelectedBlockRef.current,
        blockId,
      );
      selectBlocks(rangeIds, blockId);
      return;
    }
    selectBlocks([blockId], blockId);
  };

  const clearBlockTimers = (blockIds: Iterable<string>) => {
    for (const id of blockIds) {
      const timer = blockTimers.current.get(id);
      if (timer) clearTimeout(timer);
      blockTimers.current.delete(id);
    }
  };

  const deleteBlocks = async (blockIds: string[]) => {
    if (blockIds.length === 0) return;
    const idSet = new Set(blockIds);
    clearBlockTimers(blockIds);
    try {
      await Promise.all(
        blockIds.map((id) =>
          apiJson(`/api/admin/memo/blocks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        ),
      );
      setBlocks((prev) =>
        prev.filter((b) => !idSet.has(b.id) && (!b.parent_block_id || !idSet.has(b.parent_block_id))),
      );
      setSelectedBlockIds((prev) => {
        const next = new Set(prev);
        for (const id of blockIds) next.delete(id);
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '블록 삭제 실패');
      if (selectedId) void loadBlocks(selectedId);
    }
  };

  const deleteBlock = async (blockId: string) => {
    await deleteBlocks([blockId]);
  };

  const insertBlockAfter = async (
    current: MemoBlockRow,
    type: MemoBlockType,
    content = '',
  ) => {
    if (!selectedId) return null;
    const parentBlockId = current.parent_block_id;
    const block = await addBlock(type, parentBlockId, { content });
    if (!block) return null;

    const siblings = getSiblingBlocks(blocks, parentBlockId);
    const ids = siblings.map((b) => b.id).filter((id) => id !== block.id);
    const idx = ids.indexOf(current.id);
    const insertAt = idx < 0 ? ids.length : idx + 1;
    const orderedIds = [...ids.slice(0, insertAt), block.id, ...ids.slice(insertAt)];
    await reorderSiblings(parentBlockId, orderedIds);
    selectBlocks([block.id], block.id);
    focusBlock(block.id);
    return block;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedBlockIds.size === 0) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement) {
        const start = active.selectionStart ?? 0;
        const end = active.selectionEnd ?? 0;
        if (shouldDeleteSelectedText(active.value, start, end)) return;
        if (e.key === 'Backspace' && !shouldDeleteBlockOnBackspace(active.value, start, end)) return;
        if (e.key === 'Delete' && active.value.length > 0 && end < active.value.length) return;
      }

      e.preventDefault();
      void deleteBlocks([...selectedBlockIds]);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBlockIds]);

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
    if (!window.confirm('이 페이지와 하위·블록을 모두 삭제할까요?')) return;
    try {
      await apiJson(`/api/admin/memo/pages/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadPages();
      if (selectedId === id) router.replace('/admin/memo');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '페이지 삭제 실패');
    }
  };

  const savePageTitle = (title: string) => {
    if (!selectedId) return;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      void apiJson(`/api/admin/memo/pages/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }).catch((e) => toast.error(e instanceof Error ? e.message : '제목 저장 실패'));
    }, DEBOUNCE_MS);
  };

  const patchBlock = (blockId: string, patch: Partial<Pick<MemoBlockRow, 'content' | 'checked' | 'collapsed'>>) => {
    const existing = blockTimers.current.get(blockId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      void apiJson(`/api/admin/memo/blocks/${encodeURIComponent(blockId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).catch((e) => toast.error(e instanceof Error ? e.message : '저장 실패'));
    }, DEBOUNCE_MS);
    blockTimers.current.set(blockId, timer);
  };

  const updateBlockLocal = (blockId: string, patch: Partial<MemoBlockRow>) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  };

  const addBlock = async (
    type: MemoBlockType,
    parentBlockId: string | null = null,
    opts?: { content?: string; checked?: boolean; collapsed?: boolean },
  ): Promise<MemoBlockRow | null> => {
    if (!selectedId) return null;
    try {
      const data = await apiJson<{ ok: true; block: MemoBlockRow }>(
        `/api/admin/memo/pages/${encodeURIComponent(selectedId)}/blocks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            parentBlockId,
            content: opts?.content ?? '',
          }),
        },
      );
      let block = data.block;
      if (opts?.checked || opts?.collapsed) {
        const patch: Partial<MemoBlockRow> = {};
        if (opts.checked) patch.checked = true;
        if (opts.collapsed) patch.collapsed = true;
        await apiJson(`/api/admin/memo/blocks/${encodeURIComponent(block.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        block = { ...block, ...patch };
      }
      setBlocks((prev) => [...prev, block]);
      return block;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '블록 추가 실패');
      return null;
    }
  };

  const insertPasteItems = async (
    parentBlockId: string | null,
    afterBlockId: string | null,
    items: MemoPasteItem[],
  ) => {
    if (!selectedId || items.length === 0) return;

    const flat = flattenPasteItems(items, parentBlockId);
    const createdIds: string[] = [];

    const createOne = async (
      type: MemoBlockType,
      parentId: string | null,
      opts?: { content?: string; checked?: boolean; collapsed?: boolean },
    ): Promise<MemoBlockRow | null> => {
      try {
        const data = await apiJson<{ ok: true; block: MemoBlockRow }>(
          `/api/admin/memo/pages/${encodeURIComponent(selectedId)}/blocks`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, parentBlockId: parentId, content: opts?.content ?? '' }),
          },
        );
        let block = data.block;
        if (opts?.checked || opts?.collapsed) {
          const patch: Partial<MemoBlockRow> = {};
          if (opts.checked) patch.checked = true;
          if (opts.collapsed) patch.collapsed = true;
          await apiJson(`/api/admin/memo/blocks/${encodeURIComponent(block.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          block = { ...block, ...patch };
        }
        return block;
      } catch {
        return null;
      }
    };

    for (const item of flat) {
      const block = await createOne(item.type, item.parentBlockId, {
        content: item.content,
        checked: item.checked,
        collapsed: item.collapsed,
      });
      if (!block) continue;
      createdIds.push(block.id);
      if (item.type === 'toggle' && item.childItems?.length) {
        for (const child of item.childItems) {
          const childBlock = await createOne(child.type, block.id, {
            content: child.content,
            checked: child.checked,
          });
          if (childBlock) createdIds.push(childBlock.id);
        }
      }
    }

    if (createdIds.length === 0) {
      toast.error('붙여넣기할 내용을 읽지 못했습니다.');
      return;
    }

    const siblings = blocks.filter((b) =>
      parentBlockId ? b.parent_block_id === parentBlockId : b.parent_block_id === null,
    );
    const existingIds = siblings.map((b) => b.id);
    const anchorIndex = afterBlockId ? existingIds.indexOf(afterBlockId) : existingIds.length - 1;
    const insertAt = anchorIndex < 0 ? existingIds.length : anchorIndex + 1;
    const orderedIds = [
      ...existingIds.slice(0, insertAt),
      ...createdIds,
      ...existingIds.slice(insertAt),
    ];

    try {
      await apiJson(`/api/admin/memo/pages/${encodeURIComponent(selectedId)}/blocks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentBlockId, orderedIds }),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '순서 저장 실패');
    }

    await loadBlocks(selectedId);
    toast.success('붙여넣었습니다.');
  };

  const handleBlockPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    block: MemoBlockRow,
    parentBlockId: string | null,
  ) => {
    const noteItems = parseMemoPasteFromClipboard(e.clipboardData);
    if (noteItems) {
      e.preventDefault();
      void insertPasteItems(parentBlockId, block.id, noteItems);
      return;
    }

    const plain = e.clipboardData.getData('text/plain');
    const lines = parsePlainTextPasteLines(plain);
    if (lines.length > 1) {
      e.preventDefault();
      const items: MemoPasteItem[] = lines.map((line) => ({
        type: block.type === 'toggle' ? 'text' : block.type === 'checklist' ? 'checklist' : 'text',
        content: line,
      }));
      void insertPasteItems(parentBlockId, block.id, items);
    }
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: MemoBlockRow,
  ) => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'checklist' || block.type === 'text') {
        e.preventDefault();
        void insertBlockAfter(block, block.type);
      }
      return;
    }

    if (e.key === 'Backspace' && shouldDeleteBlockOnBackspace(block.content, start, end)) {
      e.preventDefault();
      const siblings = getSiblingBlocks(blocks, block.parent_block_id);
      const idx = siblings.findIndex((b) => b.id === block.id);
      const prev = idx > 0 ? siblings[idx - 1] : null;
      void deleteBlock(block.id).then(() => {
        if (prev) focusBlock(prev.id);
      });
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockIds.has(block.id) && selectedBlockIds.size > 1) {
      if (!shouldDeleteSelectedText(block.content, start, end)) {
        e.preventDefault();
        void deleteBlocks([...selectedBlockIds]);
      }
    }
  };

  const reorderSiblings = async (parentBlockId: string | null, orderedIds: string[]) => {
    if (!selectedId) return;
    const siblings = (parentBlockId ? blocksByParent.get(parentBlockId) : rootBlocks) ?? [];
    const byId = new Map(siblings.map((b) => [b.id, b]));
    const reordered = orderedIds.map((id, index) => ({ ...byId.get(id)!, order_index: index }));
    setBlocks((prev) => {
      const others = prev.filter((b) =>
        parentBlockId ? b.parent_block_id !== parentBlockId : b.parent_block_id !== null,
      );
      return [...others, ...reordered];
    });
    try {
      await apiJson(`/api/admin/memo/pages/${encodeURIComponent(selectedId)}/blocks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentBlockId, orderedIds }),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '순서 저장 실패');
      if (selectedId) void loadBlocks(selectedId);
    }
  };

  const handleDrop = (parentBlockId: string | null, targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const siblings = (parentBlockId ? blocksByParent.get(parentBlockId) : rootBlocks) ?? [];
    const ids = siblings.map((b) => b.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    void reorderSiblings(parentBlockId, next);
    setDraggingId(null);
  };

  const renderBlockList = (parentBlockId: string | null, indent = 0) => {
    const siblings = (parentBlockId ? blocksByParent.get(parentBlockId) : rootBlocks) ?? [];
    return siblings.map((block) => (
      <div key={block.id} className="space-y-1">
        <div
          className={`group flex items-center gap-2 rounded-lg border px-2 py-1 ${
            selectedBlockIds.has(block.id)
              ? 'border-blue-200 bg-blue-50'
              : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
          } ${draggingId === block.id ? 'opacity-50' : ''}`}
          style={{ marginLeft: indent * 16 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(parentBlockId, block.id)}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('textarea')) return;
            if (target.closest('button[aria-label="순서 변경"]')) return;
            e.preventDefault();
            handleRowSelect(block.id, parentBlockId, e.shiftKey);
          }}
        >
          <button
            type="button"
            draggable
            className="shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
            aria-label="순서 변경"
            onDragStart={() => setDraggingId(block.id)}
            onDragEnd={() => setDraggingId(null)}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {block.type === 'toggle' ? (
            <button
              type="button"
              className="shrink-0 text-slate-500"
              onClick={() => {
                const collapsed = !block.collapsed;
                updateBlockLocal(block.id, { collapsed });
                patchBlock(block.id, { collapsed });
              }}
            >
              {block.collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          ) : block.type === 'checklist' ? (
            <input
              type="checkbox"
              className="h-[1.125rem] w-[1.125rem] shrink-0 rounded border-slate-300"
              checked={block.checked}
              onChange={(e) => {
                updateBlockLocal(block.id, { checked: e.target.checked });
                patchBlock(block.id, { checked: e.target.checked });
              }}
            />
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <textarea
            className="min-h-[1.5rem] flex-1 resize-none overflow-hidden border-0 bg-transparent text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400"
            rows={1}
            placeholder={
              block.type === 'toggle' ? '토글 제목' : block.type === 'checklist' ? '체크 항목' : '텍스트'
            }
            value={block.content}
            onFocus={() => selectBlocks([block.id], block.id)}
            onKeyDown={(e) => handleTextareaKeyDown(e, block)}
            onChange={(e) => {
              updateBlockLocal(block.id, { content: e.target.value });
              patchBlock(block.id, { content: e.target.value });
              adjustTextareaHeight(e.target);
            }}
            onPaste={(e) => handleBlockPaste(e, block, parentBlockId)}
            ref={(el) => {
              if (el) textareaRefs.current.set(block.id, el);
              else textareaRefs.current.delete(block.id);
              adjustTextareaHeight(el);
            }}
          />

          <button
            type="button"
            className={`shrink-0 text-slate-400 hover:text-rose-500 ${
              selectedBlockIds.has(block.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={() => void deleteBlock(block.id)}
            aria-label="삭제"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {block.type === 'toggle' && !block.collapsed ? (
          <div className="space-y-2">
            {renderBlockList(block.id, indent + 1)}
            <div style={{ marginLeft: (indent + 1) * 16 + 24 }} className="flex gap-2">
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={() => void addBlock('text', block.id)}
              >
                + 텍스트
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800"
                onClick={() => void addBlock('checklist', block.id)}
              >
                + 체크
              </button>
            </div>
          </div>
        ) : null}
      </div>
    ));
  };

  const selectedPage = pages.find((p) => p.id === selectedId);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
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
        <p className="text-xs text-slate-400">어드민 공유 · DB 저장</p>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
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
                className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700"
                onClick={() => void createPage(null)}
              >
                첫 페이지 만들기
              </button>
            ) : (
              pageTree.map((page) => (
                <div
                  key={page.id}
                  className={`group mb-0.5 flex items-center rounded-md ${
                    selectedId === page.id ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                  }`}
                  style={{ paddingLeft: 8 + page.depth * 12 }}
                >
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

        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {!selectedId ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              왼쪽에서 페이지를 선택하거나 새로 만드세요.
            </div>
          ) : loadingBlocks ? (
            <p className="text-sm text-slate-400">불러오는 중…</p>
          ) : (
            <div className="mx-auto max-w-2xl space-y-6">
              <div>
                <input
                  className="w-full border-0 bg-transparent text-2xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
                  placeholder="페이지 제목"
                  value={pageTitle}
                  onChange={(e) => {
                    setPageTitle(e.target.value);
                    savePageTitle(e.target.value);
                  }}
                />
                {selectedPage?.updated_by_name ? (
                  <p className="mt-1 text-xs text-slate-400">
                    마지막 수정 · {selectedPage.updated_by_name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1" onMouseDown={(e) => {
                if (e.target === e.currentTarget) setSelectedBlockIds(new Set());
              }}>{renderBlockList(null)}</div>

              {selectedBlockIds.size > 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-slate-600">
                  <span>{selectedBlockIds.size}개 선택</span>
                  <button
                    type="button"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => void deleteBlocks([...selectedBlockIds])}
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => setSelectedBlockIds(new Set())}
                  >
                    선택 해제
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => void addBlock('text')}
                >
                  + 텍스트
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => void addBlock('checklist')}
                >
                  + 체크리스트
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => void addBlock('toggle')}
                >
                  + 토글
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
