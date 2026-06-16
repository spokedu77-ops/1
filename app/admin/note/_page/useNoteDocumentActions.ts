'use client';

import { startTransition, useCallback } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { devLogger } from '@/app/lib/logging/devLogger';
import { BOARD_DEFAULT_GROUP } from '../_components/BoardView';
import { resolveDocIcon } from '../_lib/noteDocumentUi';
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
  } = options;

  const handleGoToDashboard = useCallback(() => {
    setDesktopOpen(true);
    setMobileOpen(false);
    router.push('/admin');
  }, [router, setDesktopOpen, setMobileOpen]);

  const handleSelectDocument = (doc: NoteDocument) => {
    setSelectedId(doc.id);
    setFocusedToggleId(null);
    setFocusedEditorBlockId(null);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
    setMobileTab('editor');
    closeAll();
    router.replace(`/admin/note?id=${encodeURIComponent(doc.id)}`);
  };

  const handleNavigateToWorkspace = useCallback(() => {
    setSelectedId(null);
    setBlocks([]);
    setMobileTab('editor');
    closeAll();
    router.replace('/admin/note');
  }, [closeAll, router]);

  const handleUpdateDocProperties = useCallback(async (
    docId: string,
    properties: NoteDocument['properties'],
  ) => {
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, properties } : d)));
    try {
      await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: docId, properties }),
      });
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
        body: JSON.stringify({ title: '?쒕ぉ ?놁쓬' }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '?앹꽦 ?ㅽ뙣'); }
      const json = (await res.json()) as { document: NoteDocument };
      const newDoc = { ...json.document, properties };
      if (properties) {
        await fetch('/api/admin/note/documents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: newDoc.id, properties }),
        });
      }
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedId(newDoc.id);
      setMobileTab('editor');
      setViewMode('list');
      closeAll();
      router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
    } catch (e) {
      devLogger.error('[Note] createDocInGroup', e);
      setError(e instanceof Error ? e.message : '?앹꽦 ?ㅽ뙣');
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

  const handleOpenDocumentById = useCallback((documentId: string) => {
    setSelectedId(documentId);
    setFocusedToggleId(null);
    setFocusedEditorBlockId(null);
    setShowDocIconPicker(false);
    setSidebarIconPicker(null);
    setMobileTab('editor');
    closeAll();
    router.replace(`/admin/note?id=${encodeURIComponent(documentId)}`);
  }, [router, closeAll]);


  /** ?몄뀡 諛⑹떇: 臾몄꽌(parent_id) + 遺紐?蹂몃Ц page 釉붾줉????긽 ?④퍡 ?앹꽦 */
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
      title = '?쒕ぉ ?놁쓬',
    } = options ?? {};

    try {
      setLoadingState('saving');
      setError(null);

      const createDocRes = await fetch('/api/admin/note/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, parent_id: parentDocumentId }),
      });
      if (!createDocRes.ok) {
        const j = await createDocRes.json().catch(() => null);
        throw new Error(j?.error || '?섏쐞 ?섏씠吏 ?앹꽦 ?ㅽ뙣');
      }
      const created = (await createDocRes.json()) as { document: NoteDocument };
      const newDoc = created.document;
      setDocuments((prev) => [newDoc, ...prev]);

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
        if (!blocksRes.ok) throw new Error('遺紐?臾몄꽌 釉붾줉 議고쉶 ?ㅽ뙣');
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

      const pageBlockContent = { page_document_id: newDoc.id, title: newDoc.title };
      const blockRes = await fetch('/api/admin/note/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: parentDocumentId,
          type: 'page',
          content: pageBlockContent,
          order_index: insertIndex,
          parent_block_id: parentBlockId,
        }),
      });
      if (!blockRes.ok) {
        const j = await blockRes.json().catch(() => null);
        throw new Error(j?.error || '?섏쐞 ?섏씠吏 釉붾줉 異붽? ?ㅽ뙣');
      }
      const blockJson = (await blockRes.json()) as { block: NoteBlock };
      const newBlock = blockJson.block;

      if (parentDocumentId === selectedId) {
        const nextSiblings = [
          ...siblingBlocks.slice(0, insertIndex),
          newBlock,
          ...siblingBlocks.slice(insertIndex),
        ].map((block, index) => ({ ...block, order_index: index }));
        const siblingIds = new Set(nextSiblings.map((b) => b.id));
        setBlocks((prev) => {
          const others = prev.filter((b) => !siblingIds.has(b.id));
          return [...others, ...nextSiblings];
        });
        noteUndo.pushUndoCreate(newBlock.id);
        void fetch('/api/admin/note/blocks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            orders: nextSiblings.map((b) => ({ id: b.id, order_index: b.order_index })),
          }),
        }).then(() => triggerSave()).catch((e) => devLogger.error('[Note] subPageBlockOrder', e));
      } else {
        triggerSave();
      }

      if (navigateToChild) {
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
      setError(e instanceof Error ? e.message : '?섏쐞 ?섏씠吏 ?앹꽦 ?ㅽ뙣');
    } finally {
      setLoadingState('idle');
    }
  }, [selectedId, triggerSave, closeAll, router, noteUndo]);

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
        body: JSON.stringify({ title: '?쒕ぉ ?놁쓬', parent_id: null }),
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error || '臾몄꽌 ?앹꽦 ?ㅽ뙣'); }
      const json = (await res.json()) as { document: NoteDocument };
      const newDoc = json.document;
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedId(newDoc.id);
      setFocusedToggleId(null);
      setFocusedEditorBlockId(null);
      setMobileTab('editor');
      closeAll();
      router.replace(`/admin/note?id=${encodeURIComponent(newDoc.id)}`);
    } catch (e) { devLogger.error('[Note] createDoc', e); setError(e instanceof Error ? e.message : '?앹꽦 ?ㅽ뙣'); }
    finally { setLoadingState('idle'); }
  };

  const handleTogglePublic = useCallback(async (doc: NoteDocument) => {
    const next = !doc.is_public;
    setTogglingPublic(true);
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_public: next } : d)));
    try {
      const res = await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: doc.id, is_public: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '怨듦컻 ?ㅼ젙 蹂寃??ㅽ뙣');
      }
      const json = (await res.json()) as { document: NoteDocument };
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? json.document : d)));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] togglePublic', e);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_public: doc.is_public } : d)));
      setError(e instanceof Error ? e.message : '怨듦컻 ?ㅼ젙 蹂寃??ㅽ뙣');
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
      setError('留곹겕 蹂듭궗???ㅽ뙣?덉뒿?덈떎.');
    }
  }, []);

  const persistDocumentTitle = useCallback(async (docId: string, safeTitle: string, saveSeq: number) => {
    try {
      const res = await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: docId, title: safeTitle }),
      });
      if (!res.ok) return;
      if (docTitleSaveSeqRef.current[docId] !== saveSeq) return;

      const json = (await res.json()) as { document?: NoteDocument };
      // ??댄븨 以??쒕쾭 ?묐떟??濡쒖뺄 ?쒕ぉ????뼱?곗? ?딆쓬 ???ㅻ옒??????덉씠??諛⑹?
      if (json.document?.updated_at) {
        setDocuments((prev) =>
          prev.map((d) => (
            d.id === docId ? { ...d, updated_at: json.document!.updated_at } : d
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
  }, [triggerSave]);

  const handleRenameDocument = useCallback((docId: string, title: string, options?: { immediate?: boolean }) => {
    // ?낅젰 以묒뿉??trim ?섏? ?딆쓬 ???꾩뼱?곌린媛 利됱떆 ?щ씪吏??踰꾧렇 諛⑹?
    startTransition(() => {
      setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, title } : d)));
    });
    const timers = saveTimersRef.current;
    const timerKey = `doc_${docId}`;
    if (timers[timerKey]) clearTimeout(timers[timerKey]);
    const runSave = () => {
      const latestRaw = titleInputRef.current?.value ?? title;
      const normalized = latestRaw.trim() || '?쒕ぉ ?놁쓬';
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
    try {
      await fetch('/api/admin/note/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: doc.id, is_pinned: next }),
      });
    } catch (err) { devLogger.error('[Note] togglePin', err); }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    const next = !doc.is_favorite;
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_favorite: next } : d)));
    try { await fetch('/api/admin/note/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id: doc.id, is_favorite: next }) }); }
    catch (err) { devLogger.error('[Note] toggleFavorite', err); }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, doc: NoteDocument) => {
    e.stopPropagation();
    if (!window.confirm(`"${doc.title}" 臾몄꽌瑜??댁??듭쑝濡??대룞?좉퉴??\n遺紐??섏씠吏??留곹겕???④퍡 ?쒓굅?⑸땲??`)) return;
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
      if (!res.ok) throw new Error('??젣 ?ㅽ뙣');
    } catch (err) {
      devLogger.error('[Note] deleteDoc', err);
      setDocuments(prevDocs);
      setBlocks(prevBlocks);
      setError('臾몄꽌 ??젣 ?ㅽ뙣');
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
        throw new Error(j?.error || '蹂듦뎄 ?ㅽ뙣');
      }
      // ?댁???紐⑸줉?먯꽌 ?쒓굅
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] restoreDoc', e);
      setError(e instanceof Error ? e.message : '蹂듦뎄 ?ㅽ뙣');
    } finally {
      setLoadingState('idle');
    }
  }, [triggerSave]);

  const handlePurgeDocument = useCallback(async (doc: NoteDocument) => {
    const deletedAt = doc.deleted_at ? new Date(doc.deleted_at).getTime() : null;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const eligible = deletedAt ? (Date.now() - deletedAt >= sevenDaysMs) : false;
    if (!eligible) {
      setError('??젣 ??7?쇱씠 吏??臾몄꽌留??곴뎄??젣?????덉뒿?덈떎.');
      return;
    }
    if (!window.confirm(`"${doc.title}" 臾몄꽌瑜??곴뎄??젣?좉퉴?? (蹂듦뎄 遺덇?)`)) return;
    try {
      setLoadingState('saving');
      const res = await fetch(`/api/admin/note/trash/purge?id=${encodeURIComponent(doc.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || '?곴뎄??젣 ?ㅽ뙣');
      }
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      triggerSave();
    } catch (e) {
      devLogger.error('[Note] purgeDoc', e);
      setError(e instanceof Error ? e.message : '?곴뎄??젣 ?ㅽ뙣');
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
