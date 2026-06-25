'use client';

import { startTransition, useCallback } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { devLogger } from '@/app/lib/logging/devLogger';
import { BOARD_DEFAULT_GROUP } from '../_components/BoardView';
import { resolveDocIcon } from '../_lib/noteDocumentUi';
import { commitAndResetNoteDocumentBeforeSwitch } from '../_lib/noteBlockStateMerge';
import { buildInsertBlockCommand } from '../_lib/noteBlockCommands';
import { createSubPageTree } from '../_lib/noteDocumentTreeApi';
import { enqueueDocumentPatch } from '../_lib/noteDocumentMetaOpQueue';
import type { NoteDocumentEngineApi } from '../_hooks/useNoteDocumentEngine';
import type { LoadingState, NoteBlock, NoteDocument } from '../_lib/types';
import type { useNoteBlockUndo } from '../_hooks/useNoteBlockUndo';

type NoteUndo = ReturnType<typeof useNoteBlockUndo>;

export function useNoteDocumentActions(options: {
  router: AppRouterInstance;
  closeAll: () => void;
  setDesktopOpen: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  documents: NoteDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<NoteDocument[]>>;
  setBlocks: React.Dispatch<React.SetStateAction<NoteBlock[]>>;
  blocksRef: React.MutableRefObject<NoteBlock[]>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setLoadingState: (state: LoadingState) => void;
  setError: (error: string | null) => void;
  setMobileTab: (tab: 'list' | 'editor') => void;
  setViewMode: (mode: 'list' | 'board') => void;
  setFocusedToggleId: (id: string | null) => void;
  setFocusedEditorBlockId: (id: string | null) => void;
  setShowDocIconPicker: (show: boolean) => void;
  setSidebarIconPicker: (picker: { docId: string; top: number; left: number } | null) => void;
  setSidebarIconDraft: (draft: string) => void;
  setShareLinkCopied: (copied: boolean) => void;
  setTogglingPublic: (toggling: boolean) => void;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  pendingFocusDocTitleRef: React.MutableRefObject<string | null>;
  saveTimersRef: React.MutableRefObject<Record<string, number | undefined>>;
  docTitleSaveSeqRef: React.MutableRefObject<Record<string, number>>;
  triggerSave: () => void;
  noteUndo: NoteUndo;
  documentEngine: NoteDocumentEngineApi;
}) {
  const {
    router,
    closeAll,
    setDesktopOpen,
    setMobileOpen,
    documents,
    setDocuments,
    setBlocks,
    blocksRef,
    selectedId,
    setSelectedId,
    setLoadingState,
    setError,
    setMobileTab,
    setViewMode,
    setFocusedToggleId,
    setFocusedEditorBlockId,
    setShowDocIconPicker,
    setSidebarIconPicker,
    setSidebarIconDraft,
    setShareLinkCopied,
    setTogglingPublic,
    titleInputRef,
    pendingFocusDocTitleRef,
    saveTimersRef,
    docTitleSaveSeqRef,
    triggerSave,
    noteUndo,
    documentEngine,
  } = options;

  const handleGoToDashboard = useCallback(() => {
    setDesktopOpen(true);
    setMobileOpen(false);
    router.push('/admin');
  }, [router, setDesktopOpen, setMobileOpen]);

  const handleSelectDocument = useCallback(async (doc: NoteDocument) => {
    if (doc.id === selectedId) return;
    await commitAndResetNoteDocumentBeforeSwitch();
    setSelectedId(doc.id);
    setFocusedToggleId(null);
    setFocusedEditorBlockId(null);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
    setMobileTab('editor');
    closeAll();
    router.replace(`/admin/note?id=${encodeURIComponent(doc.id)}`);
  }, [selectedId, closeAll, router]);

  const handleNavigateToWorkspace = useCallback(async () => {
    await commitAndResetNoteDocumentBeforeSwitch();
    setSelectedId(null);
    setBlocks([]);
    setMobileTab('editor');
    closeAll();
    router.replace('/admin/note');
  }, [closeAll, router, setBlocks]);

  const handleUpdateDocProperties = useCallback(async (
    docId: string,
    properties: NoteDocument['properties'],
  ) => {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, properties } : d)));
    try {
      await enqueueDocumentPatch({ id: docId, properties });
      triggerSave();
    } catch (e) { devLogger.error('[Note] updateDocProperties', e); }
  }, [triggerSave]);

  const handleSetDocumentCover = useCallback(async (docId: string, cover: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const base = { ...(doc.properties ?? {}) };
    const trimmed = cover.trim();
    if (trimmed) base.cover = trimmed;
    else delete base.cover;
    const nextProperties = Object.keys(base).length > 0 ? base : null;
    await handleUpdateDocProperties(docId, nextProperties);
  }, [documents, handleUpdateDocProperties]);

  const handleSetDocumentIcon = useCallback(async (docId: string, icon: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const trimmed = icon.trim().slice(0, 4);
    const base = { ...(doc.properties ?? {}) };
    if (trimmed) {
      base.icon = trimmed;
    } else {
      delete base.icon;
    }
    const nextProperties = Object.keys(base).length > 0 ? base : null;
    await handleUpdateDocProperties(docId, nextProperties);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
  }, [documents, handleUpdateDocProperties]);

  const openSidebarIconPicker = useCallback((doc: NoteDocument, e: React.MouseEvent<Element>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSidebarIconPicker({ docId: doc.id, top: rect.bottom + 4, left: rect.left });
    setSidebarIconDraft(resolveDocIcon(doc.properties) ?? '');
  }, []);

  const handleCreateDocumentInGroup = useCallback(async (group: string) => {
    const trimmedGroup = group.trim();
    const properties = trimmedGroup ? { group: trimmedGroup } : null;
    try {
      setLoadingState('loading');
      const res = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '제목 없음' }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '생성 실패'); }
      const json = (await res.json()) as { document: NoteDocument };
      const newDoc = { ...json.document, properties };
      if (properties) {
        await enqueueDocumentPatch({ id: newDoc.id, properties });
      }
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedId(newDoc.id);
      setMobileTab('editor');
      setViewMode('list');
      closeAll();
      router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
    } catch (e) {
      devLogger.error('[Note] createDocInGroup', e);
      setError(e instanceof Error ? e.message : '생성 실패');
    } finally { setLoadingState('idle'); }
  }, [closeAll, router]);

  const handleMoveDocumentToGroup = useCallback(async (docId: string, group: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const base = { ...(doc.properties ?? {}) };
    if (group === BOARD_DEFAULT_GROUP) {
      delete base.group;
    } else {
      base.group = group;
    }
    const nextProperties = Object.keys(base).length > 0 ? base : null;
    await handleUpdateDocProperties(docId, nextProperties);
  }, [documents, handleUpdateDocProperties]);

  const handleRenameBoardGroup = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed || oldName === BOARD_DEFAULT_GROUP) return;
    const targets = documents.filter((d) => (d.properties?.group ?? BOARD_DEFAULT_GROUP) === oldName);
    for (const doc of targets) {
      await handleUpdateDocProperties(doc.id, { ...(doc.properties ?? {}), group: trimmed });
    }
  }, [documents, handleUpdateDocProperties]);

  const handleDeleteBoardGroup = useCallback(async (group: string) => {
    if (group === BOARD_DEFAULT_GROUP) return;
    const targets = documents.filter((d) => d.properties?.group === group);
    for (const doc of targets) {
      await handleMoveDocumentToGroup(doc.id, BOARD_DEFAULT_GROUP);
    }
  }, [documents, handleMoveDocumentToGroup]);

  const handleReorderBoardGroup = useCallback(async (group: string, orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const doc = documents.find((d) => d.id === orderedIds[i]);
      if (!doc) continue;
      const base = { ...(doc.properties ?? {}) };
      if (group === BOARD_DEFAULT_GROUP) {
        delete base.group;
      } else {
        base.group = group;
      }
      base.board_order = i;
      await handleUpdateDocProperties(orderedIds[i], base);
    }
  }, [documents, handleUpdateDocProperties]);

  const handleOpenDocumentById = useCallback(async (documentId: string) => {
    if (documentId === selectedId) return;
    await commitAndResetNoteDocumentBeforeSwitch();
    setSelectedId(documentId);
    setFocusedToggleId(null);
    setFocusedEditorBlockId(null);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
    setMobileTab('editor');
    closeAll();
    router.replace(`/admin/note?id=${encodeURIComponent(documentId)}`);
  }, [selectedId, router, closeAll]);


  /** 세션 방식: 문서(parent_id) + 부모 본문 page 블록을 항상 함께 생성 */
  const handleCreateSubPage = useCallback(async (
    parentDocumentId: string,
    options?: {
      insertAfterBlockId?: string;
      insertIndex?: number;
      parentBlockId?: string | null;
      navigateToChild?: boolean;
      title?: string;
    },
  ) => {
    const {
      insertAfterBlockId,
      insertIndex: explicitInsertIndex,
      parentBlockId = null,
      navigateToChild = false,
      title = '제목 없음',
    } = options ?? {};

    try {
      setLoadingState('saving');
      setError(null);

      let siblingBlocks: NoteBlock[];
      if (parentDocumentId === selectedId) {
        siblingBlocks = blocksRef.current
          .filter((b) => (b.parent_block_id ?? null) === parentBlockId)
          .sort((a, b) => a.order_index - b.order_index);
      } else {
        const blocksRes = await fetch(
          `/api/admin/note/blocks?documentId=${encodeURIComponent(parentDocumentId)}`,
          { credentials: 'include' },
        );
        if (!blocksRes.ok) throw new Error('부모 문서 블록 조회 실패');
        const blocksJson = (await blocksRes.json()) as { blocks?: NoteBlock[] };
        siblingBlocks = (blocksJson.blocks ?? [])
          .filter((b) => (b.parent_block_id ?? null) === parentBlockId)
          .sort((a, b) => a.order_index - b.order_index);
      }

      let insertIndex = siblingBlocks.length;
      if (typeof explicitInsertIndex === 'number') {
        insertIndex = Math.max(0, Math.min(explicitInsertIndex, siblingBlocks.length));
      } else if (insertAfterBlockId) {
        const afterIdx = siblingBlocks.findIndex((b) => b.id === insertAfterBlockId);
        insertIndex = afterIdx >= 0 ? afterIdx + 1 : siblingBlocks.length;
      }

      const {
        document: newDoc,
        pageBlock: newBlock,
      } = await createSubPageTree({
        parentDocumentId,
        parentBlockId,
        orderIndex: insertIndex,
        title,
      });
      setDocuments((prev) => [newDoc, ...prev]);

      if (parentDocumentId === selectedId) {
        const previousBlocks = blocksRef.current;
        const command = buildInsertBlockCommand(
          previousBlocks,
          newBlock,
          parentBlockId,
          insertIndex,
        );
        setBlocks(command.nextBlocks);
        noteUndo.pushBlockTransactionUndo(
          previousBlocks,
          command.nextBlocks,
          command.affectedIds,
        );
      } else {
        triggerSave();
      }

      if (navigateToChild) {
        await commitAndResetNoteDocumentBeforeSwitch();
        pendingFocusDocTitleRef.current = newDoc.id;
        setSelectedId(newDoc.id);
        setFocusedToggleId(null);
        setFocusedEditorBlockId(null);
        setMobileTab('editor');
        closeAll();
        router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
      }
    } catch (e) {
      devLogger.error('[Note] createSubPage', e);
      setError(e instanceof Error ? e.message : '하위 페이지 생성 실패');
    } finally {
      setLoadingState('idle');
    }
  }, [selectedId, triggerSave, closeAll, router, noteUndo, documentEngine, blocksRef, setBlocks, setDocuments, setError, setLoadingState, setFocusedEditorBlockId, setFocusedToggleId, setMobileTab]);

  const handleCreateDocument = async (
    parentId: string | null = null,
    options?: { navigateToChild?: boolean },
  ) => {
    if (parentId) {
      await handleCreateSubPage(parentId, {
        navigateToChild: options?.navigateToChild ?? true,
      });
      return;
    }
    try {
      setLoadingState('loading'); setError(null);
      const res = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '제목 없음', parent_id: null }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '문서 생성 실패'); }
      const json = (await res.json()) as { document: NoteDocument };
      const newDoc = json.document;
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedId(newDoc.id);
      setFocusedToggleId(null);
      setFocusedEditorBlockId(null);
      setMobileTab('editor');
      closeAll();
      router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
    } catch (e) { devLogger.error('[Note] createDoc', e); setError(e instanceof Error ? e.message : '생성 실패'); }
    finally { setLoadingState('idle'); }
  };

  const handleTogglePublic = useCallback(async (doc: NoteDocument) => {
    const next = !doc.is_public;
    setTogglingPublic(true);
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_public: next } : d)));
    try {
      const document = await enqueueDocumentPatch({ id: doc.id, is_public: next });
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? document : d)));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] togglePublic', e);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_public: doc.is_public } : d)));
      setError(e instanceof Error ? e.message : '공개 설정 변경 실패');
    } finally {
      setTogglingPublic(false);
    }
  }, [triggerSave]);

  const handleCopyPublicLink = useCallback(async (doc: NoteDocument) => {
    if (!doc.share_token) return;
    const url = `${window.location.origin}/note/p/${doc.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareLinkCopied(true);
      window.setTimeout(() => setShareLinkCopied(false), 2000);
    } catch {
      setError('링크 복사에 실패했습니다.');
    }
  }, []);

  const persistDocumentTitle = useCallback(async (docId: string, safeTitle: string, saveSeq: number) => {
    try {
      if (docId === selectedId) {
        await documentEngine.flushPersistQueue();
      }
      const document = await enqueueDocumentPatch({ id: docId, title: safeTitle });
      if (docTitleSaveSeqRef.current[docId] !== saveSeq) return;

      // 타이핑 중 서버 응답이 로컬 제목을 덮어쓰지 않음 — 오래된 응답 레이스 방지
      if (document.updated_at) {
        setDocuments((prev) =>
          prev.map((d) => (
            d.id === docId ? { ...d, updated_at: document.updated_at } : d
          )),
        );
      }
      const linkedPageBlocks = blocksRef.current.filter(
        (b) => b.type === 'page' && b.content?.page_document_id === docId,
      );
      if (linkedPageBlocks.length > 0) {
        setBlocks((prev) =>
          prev.map((b) => (
            b.type === 'page' && b.content?.page_document_id === docId
              ? { ...b, content: { ...b.content, title: safeTitle } }
              : b
          )),
        );
      }
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] renameDoc', e);
    }
  }, [documentEngine, selectedId, triggerSave]);

  const handleRenameDocument = useCallback((docId: string, title: string, options?: { immediate?: boolean }) => {
    const timers = saveTimersRef.current;
    const timerKey = `doc_${docId}`;
    if (timers[timerKey]) clearTimeout(timers[timerKey]);
    const runSave = () => {
      const latestRaw = titleInputRef.current?.value ?? title;
      const normalized = latestRaw.trim() || '제목 없음';
      const saveSeq = (docTitleSaveSeqRef.current[docId] ?? 0) + 1;
      docTitleSaveSeqRef.current[docId] = saveSeq;
      startTransition(() => {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, title: normalized } : d)),
        );
      });
      void persistDocumentTitle(docId, normalized, saveSeq);
    };
    if (options?.immediate) {
      runSave();
      return;
    }
    timers[timerKey] = window.setTimeout(runSave, 600);
  }, [persistDocumentTitle]);

  const handleTogglePin = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    const next = !doc.is_pinned;
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_pinned: next } : d)));
    void enqueueDocumentPatch({ id: doc.id, is_pinned: next }).catch((err) => {
      devLogger.error('[Note] togglePin', err);
    });
  };

  const handleToggleFavorite = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    const next = !doc.is_favorite;
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_favorite: next } : d)));
    void enqueueDocumentPatch({ id: doc.id, is_favorite: next }).catch((err) => {
      devLogger.error('[Note] toggleFavorite', err);
    });
  };

  const handleDeleteDocument = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    if (!window.confirm(`"${doc.title}" 문서를 휴지통으로 이동할까요?\n부모 페이지의 링크도 함께 제거됩니다.`)) return;
    const prevDocs = documents;
    const prevBlocks = blocksRef.current;
    setDocuments((p) => p.filter((d) => d.id !== doc.id));
    setBlocks((p) => p.filter((b) => !(b.type === 'page' && b.content?.page_document_id === doc.id)));
    if (selectedId === doc.id) { setSelectedId(null); router.replace('/admin/note'); }
    try {
      if (doc.parent_id) {
        const parentBlocksRes = await fetch(
          `/api/admin/note/blocks?documentId=${encodeURIComponent(doc.parent_id)}`,
          { credentials: 'include' },
        );
        if (parentBlocksRes.ok) {
          const parentJson = (await parentBlocksRes.json()) as { blocks?: NoteBlock[] };
          const linkedBlocks = (parentJson.blocks ?? []).filter(
            (b) => b.type === 'page' && b.content?.page_document_id === doc.id,
          );
          await Promise.all(
            linkedBlocks.map((b) =>
              fetch(`/api/admin/note/blocks?id=${encodeURIComponent(b.id)}`, {
                method: 'DELETE',
                credentials: 'include',
              }),
            ),
          );
        }
      }
      const res = await fetch(`/api/admin/note/documents?id=${encodeURIComponent(doc.id)}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('삭제 실패');
    } catch (err) {
      devLogger.error('[Note] deleteDoc', err);
      setDocuments(prevDocs);
      setBlocks(prevBlocks);
      setError('문서 삭제 실패');
    }
  };

  const handleRestoreDocument = useCallback(async (doc: NoteDocument) => {
    try {
      setLoadingState('saving');
      const res = await fetch('/api/admin/note/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: doc.id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '복구 실패');
      }
      // 휴지통 목록에서 제거
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] restoreDoc', e);
      setError(e instanceof Error ? e.message : '복구 실패');
    } finally {
      setLoadingState('idle');
    }
  }, [triggerSave]);

  const handlePurgeDocument = useCallback(async (doc: NoteDocument) => {
    const deletedAt = doc.deleted_at ? new Date(doc.deleted_at).getTime() : null;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const eligible = deletedAt ? (Date.now() - deletedAt >= sevenDaysMs) : false;
    if (!eligible) {
      setError('삭제 후 7일이 지난 문서만 영구 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm(`"${doc.title}" 문서를 영구 삭제할까요? (복구 불가)`)) return;
    try {
      setLoadingState('saving');
      const res = await fetch(`/api/admin/note/trash/purge?id=${encodeURIComponent(doc.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '영구 삭제 실패');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeDoc', e);
      setError(e instanceof Error ? e.message : '영구 삭제 실패');
    } finally {
      setLoadingState('idle');
    }
  }, [triggerSave]);

  return {
    handleGoToDashboard,
    handleSelectDocument,
    handleNavigateToWorkspace,
    handleUpdateDocProperties,
    handleSetDocumentCover,
    handleSetDocumentIcon,
    openSidebarIconPicker,
    handleCreateDocumentInGroup,
    handleMoveDocumentToGroup,
    handleRenameBoardGroup,
    handleDeleteBoardGroup,
    handleReorderBoardGroup,
    handleOpenDocumentById,
    handleCreateSubPage,
    handleCreateDocument,
    handleTogglePublic,
    handleCopyPublicLink,
    persistDocumentTitle,
    handleRenameDocument,
    handleTogglePin,
    handleToggleFavorite,
    handleDeleteDocument,
    handleRestoreDocument,
    handlePurgeDocument,
  };
}
