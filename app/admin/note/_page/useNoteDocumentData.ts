'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { devLogger } from '@/app/lib/logging/devLogger';
import { useDeferredNoteMeta } from '../_hooks/useDeferredNoteMeta';
import {
  buildDocumentBreadcrumb,
  deriveDocumentTreeState,
  filterDocumentsOutsideFeaturedAncestors,
  findDefaultNoteEntryDocument,
  resolveDocIcon,
} from '../_lib/noteDocumentUi';
import {
  prefetchNoteDocumentBlocks,
  primePrefetchedNoteBlocks,
} from '../_lib/noteDocumentBlocksPrefetch';
import type { NoteCollaborator, NoteDocument, NoteBlock, SortKey } from '../_lib/types';
import type { DocTab } from './NotePageContext';

type NoteBootstrapResponse = {
  documents: NoteDocument[];
  blocks?: NoteBlock[];
  documentId?: string;
};

const bootstrapRequestCache = new Map<string, Promise<NoteBootstrapResponse>>();

async function fetchNoteBootstrap(path: string): Promise<NoteBootstrapResponse> {
  const cached = bootstrapRequestCache.get(path);
  if (cached) return cached;
  const request = (async () => {
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || 'Failed to load note documents');
    }
    return res.json() as Promise<NoteBootstrapResponse>;
  })();
  bootstrapRequestCache.set(path, request);
  try {
    return await request;
  } finally {
    window.setTimeout(() => {
      if (bootstrapRequestCache.get(path) === request) {
        bootstrapRequestCache.delete(path);
      }
    }, 1500);
  }
}

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

  const activeDocument = useMemo(() => {
    const found = documents.find((d) => d.id === selectedId);
    if (found) return found;
    if (!selectedId || loadingDocuments) return null;
    const now = new Date().toISOString();
    return {
      id: selectedId,
      title: '?쒕ぉ ?놁쓬',
      is_archived: false,
      is_favorite: false,
      is_pinned: false,
      is_public: false,
      share_token: null,
      parent_id: null,
      slug: null,
      created_at: now,
      updated_at: now,
    } satisfies NoteDocument;
  }, [documents, selectedId, loadingDocuments]);
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
  const favoriteOrPinnedIds = useMemo(
    () => new Set(filteredDocuments.filter((d) => d.is_favorite || d.is_pinned).map((d) => d.id)),
    [filteredDocuments],
  );
  const otherDocuments = useMemo(
    () => (docTab === 'active'
      ? filterDocumentsOutsideFeaturedAncestors(
        filteredDocuments.filter((d) => !d.is_favorite && !d.is_pinned),
        favoriteOrPinnedIds,
        filteredDocuments,
      )
      : filteredDocuments),
    [docTab, favoriteOrPinnedIds, filteredDocuments],
  );
  const filteredTreeState = useMemo(
    () => deriveDocumentTreeState(filteredDocuments),
    [filteredDocuments],
  );
  const otherTreeState = useMemo(
    () => deriveDocumentTreeState(otherDocuments),
    [otherDocuments],
  );
  const childrenByParent = filteredTreeState.childrenByParent;
  const rootDocuments = otherTreeState.rootDocuments;

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
            throw new Error(j?.error || '臾몄꽌 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??');
          }
          const json = (await res.json()) as { documents: NoteDocument[] };
          if (!alive) return;
          setDocuments(json.documents ?? []);
          return;
        }

        const urlDocId = searchParams.get('id');
        const bootstrapPath = urlDocId
          ? `/api/admin/note/bootstrap?documentId=${encodeURIComponent(urlDocId)}`
          : '/api/admin/note/bootstrap';
        const json = await fetchNoteBootstrap(bootstrapPath);
        if (!alive) return;
        if (json.documentId && Array.isArray(json.blocks)) {
          primePrefetchedNoteBlocks(json.documentId, json.blocks);
        }
        const docs = json.documents ?? [];
        setDocuments(docs);

        let targetDocId = urlDocId;
        if (!targetDocId) {
          const defaultDoc = findDefaultNoteEntryDocument(docs);
          if (defaultDoc) targetDocId = defaultDoc.id;
        }

        const hasBootstrapBlocksForTarget =
          targetDocId
          && json.documentId === targetDocId
          && Array.isArray(json.blocks);

        if (targetDocId && docs.some((d) => d.id === targetDocId)) {
          if (!hasBootstrapBlocksForTarget) {
            prefetchNoteDocumentBlocks(targetDocId);
          }
          setSelectedId(targetDocId);
          setMobileTab('editor');
          if (targetDocId !== urlDocId) {
            router.replace(`/admin/note?id=${encodeURIComponent(targetDocId)}`);
          }
        }

        if (targetDocId && docs.some((d) => d.id === targetDocId)) {
          let blocks = json.documentId === targetDocId ? json.blocks : undefined;
          if (!Array.isArray(blocks)) {
            const blockJson = await fetchNoteBootstrap(
              `/api/admin/note/bootstrap?documentId=${encodeURIComponent(targetDocId)}`,
            ).catch(() => null);
            if (blockJson?.documentId === targetDocId && Array.isArray(blockJson.blocks)) {
              primePrefetchedNoteBlocks(targetDocId, blockJson.blocks);
              blocks = blockJson.blocks;
            }
          }
          if (Array.isArray(blocks)) {
            onBootstrapBlocks?.({ documentId: targetDocId, blocks });
          }
        }

      } catch (e) {
        devLogger.error('[Note] loadDocs', e);
        if (alive) setError(e instanceof Error ? e.message : '濡쒕뱶 ?ㅽ뙣');
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
      const json = await fetchNoteBootstrap('/api/admin/note/bootstrap');
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

