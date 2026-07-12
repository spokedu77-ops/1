'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { devLogger } from '@/app/lib/logging/devLogger';
import { useDeferredNoteMeta } from '../_hooks/useDeferredNoteMeta';
import { buildDocumentBreadcrumb, findDefaultNoteEntryDocument, resolveDocIcon } from '../_lib/noteDocumentUi';
import type { NoteCollaborator, NoteDocument, NoteBlock, SortKey } from '../_lib/types';
import type { DocTab } from './NotePageContext';

export function useNoteDocumentData(options: {
  closeAll: () => void;
  setMobileTab: (tab: 'list' | 'editor') => void;
  docTab: DocTab;
  viewMode: 'list' | 'board';
  setError: (error: string | null) => void;
  onBootstrapBlocks?: (payload: { documentId: string; blocks: NoteBlock[] } | null) => void;
}) {
  const { closeAll, setMobileTab, docTab, viewMode, setError, onBootstrapBlocks } = options;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [documents, setDocuments] = useState<NoteDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('id'));
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expandedSidebarDocs, setExpandedSidebarDocs] = useState<Set<string>>(() => new Set());
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([]);
  const [backlinks, setBacklinks] = useState<NoteDocument[]>([]);
  const [backlinksExpanded, setBacklinksExpanded] = useState(false);
  const [backlinksLoading, setBacklinksLoading] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);

  const activeDocument = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId],
  );
  const allDocumentsMap = useMemo(
    () => new Map(documents.map((doc) => [doc.id, doc])),
    [documents],
  );
  const documentBreadcrumb = useMemo(
    () => buildDocumentBreadcrumb(activeDocument, allDocumentsMap),
    [activeDocument, allDocumentsMap],
  );
  const parentDocument = useMemo(() => {
    if (!activeDocument?.parent_id) return null;
    return allDocumentsMap.get(activeDocument.parent_id) ?? null;
  }, [activeDocument, allDocumentsMap]);
  const resolvePageIcon = useCallback(
    (documentId: string) => resolveDocIcon(allDocumentsMap.get(documentId)?.properties),
    [allDocumentsMap],
  );

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q ? documents.filter((d) => d.title.toLowerCase().includes(q)) : documents;
    if (sortKey === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    if (docTab === 'trash') {
      return [...list].sort((a, b) => new Date(b.deleted_at ?? b.updated_at).getTime() - new Date(a.deleted_at ?? a.updated_at).getTime());
    }
    return [...list].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [documents, searchQuery, sortKey, docTab]);

  const boardDocuments = useMemo(
    () => filteredDocuments.filter((d) => !d.deleted_at),
    [filteredDocuments],
  );

  const pinnedDocuments = useMemo(() => {
    if (docTab !== 'active') return [];
    const pinned = filteredDocuments.filter((d) => d.is_pinned);
    return [...pinned].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [docTab, filteredDocuments]);
  const favoriteDocuments = useMemo(() => {
    if (docTab !== 'active') return [];
    return filteredDocuments.filter((d) => d.is_favorite && !d.is_pinned);
  }, [docTab, filteredDocuments]);
  const otherDocuments = useMemo(
    () => (docTab === 'active' ? filteredDocuments.filter((d) => !d.is_favorite && !d.is_pinned) : filteredDocuments),
    [docTab, filteredDocuments],
  );
  const docMap = useMemo(() => new Map(filteredDocuments.map((d) => [d.id, d])), [filteredDocuments]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, NoteDocument[]>();
    for (const doc of filteredDocuments) {
      if (!doc.parent_id) continue;
      const list = map.get(doc.parent_id) ?? [];
      list.push(doc);
      map.set(doc.parent_id, list);
    }
    for (const [key, list] of map.entries()) {
      map.set(
        key,
        [...list].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
      );
    }
    return map;
  }, [filteredDocuments]);
  const rootDocuments = useMemo(
    () => otherDocuments.filter((d) => !d.parent_id || !docMap.has(d.parent_id)),
    [otherDocuments, docMap],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    const initialId = searchParams.get('id');
    if (initialId && initialId !== selectedId) {
      setSelectedId(initialId);
      setMobileTab('editor');
      closeAll();
    }
  }, [searchParams, selectedId, closeAll, setMobileTab]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoadingDocuments(true);
        setError(null);
        onBootstrapBlocks?.(null);
        if (docTab === 'trash') {
          const res = await fetch('/api/admin/note/trash', { credentials: 'include' });
          if (!res.ok) {
            const j = await res.json().catch(() => null);
            throw new Error(j?.error || '문서 목록을 불러오지 못했습니다.');
          }
          const json = (await res.json()) as { documents: NoteDocument[] };
          if (!alive) return;
          setDocuments(json.documents ?? []);
          return;
        }

        const urlDocId = searchParams.get('id');
        const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || '문서 목록을 불러오지 못했습니다.');
        }
        const json = (await res.json()) as {
          documents: NoteDocument[];
          blocks?: NoteBlock[];
          documentId?: string;
        };
        if (!alive) return;
        const docs = json.documents ?? [];
        setDocuments(docs);

        let targetDocId = urlDocId;
        if (!targetDocId) {
          const defaultDoc = findDefaultNoteEntryDocument(docs);
          if (defaultDoc) targetDocId = defaultDoc.id;
        }

        if (targetDocId && docs.some((d) => d.id === targetDocId)) {
          setSelectedId(targetDocId);
          setMobileTab('editor');
          if (targetDocId !== urlDocId) {
            router.replace(`/admin/note?id=${encodeURIComponent(targetDocId)}`);
          }
        }

        if (targetDocId && docs.some((d) => d.id === targetDocId)) {
          let blocks = json.documentId === targetDocId ? json.blocks : undefined;
          if (!Array.isArray(blocks)) {
            const blockRes = await fetch(
              `/api/admin/note/bootstrap?documentId=${encodeURIComponent(targetDocId)}`,
              { credentials: 'include' },
            );
            if (blockRes.ok) {
              const blockJson = (await blockRes.json()) as {
                blocks?: NoteBlock[];
                documentId?: string;
              };
              if (blockJson.documentId === targetDocId && Array.isArray(blockJson.blocks)) {
                blocks = blockJson.blocks;
              }
            }
          }
          if (Array.isArray(blocks)) {
            onBootstrapBlocks?.({ documentId: targetDocId, blocks });
          }
        }
      } catch (e) {
        devLogger.error('[Note] loadDocs', e);
        if (alive) setError(e instanceof Error ? e.message : '로드 실패');
      } finally {
        if (alive) setLoadingDocuments(false);
      }
    };
    void load();

    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docTab]);

  useEffect(() => {
    setBacklinks([]);
    setBacklinksExpanded(false);
    setBacklinksLoading(false);
  }, [selectedId]);

  useDeferredNoteMeta(
    selectedId,
    backlinksExpanded,
    setCollaborators,
    setBacklinks,
    setBacklinksLoading,
  );

  const reloadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/note/bootstrap', { credentials: 'include' });
      if (!res.ok) return;
      const json = (await res.json()) as { documents?: NoteDocument[] };
      setDocuments(json.documents ?? []);
    } catch (e) {
      devLogger.error('[Note] reloadDocuments', e);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'board') void reloadDocuments();
  }, [viewMode, reloadDocuments]);

  useEffect(() => {
    if (!selectedId) return;
    const doc = documents.find((d) => d.id === selectedId);
    if (!doc?.parent_id) return;
    const ancestorIds: string[] = [];
    let parentId: string | null = doc.parent_id;
    const localDocMap = new Map(documents.map((d) => [d.id, d]));
    while (parentId) {
      ancestorIds.push(parentId);
      parentId = localDocMap.get(parentId)?.parent_id ?? null;
    }
    if (ancestorIds.length === 0) return;
    setExpandedSidebarDocs((prev) => {
      const next = new Set(prev);
      for (const id of ancestorIds) next.add(id);
      return next;
    });
  }, [selectedId, documents]);

  const toggleSidebarDocExpanded = useCallback((docId: string) => {
    setExpandedSidebarDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  return {
    documents,
    setDocuments,
    selectedId,
    setSelectedId,
    loadingDocuments,
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    showSortMenu,
    setShowSortMenu,
    sortMenuRef,
    expandedSidebarDocs,
    toggleSidebarDocExpanded,
    collaborators,
    backlinks,
    backlinksExpanded,
    setBacklinksExpanded,
    backlinksLoading,
    activeDocument,
    allDocumentsMap,
    documentBreadcrumb,
    parentDocument,
    resolvePageIcon,
    filteredDocuments,
    boardDocuments,
    pinnedDocuments,
    favoriteDocuments,
    otherDocuments,
    childrenByParent,
    rootDocuments,
    reloadDocuments,
  };
}
