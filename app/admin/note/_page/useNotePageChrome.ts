'use client';

import { useEffect, useRef, useState } from 'react';

/** 문서 아이콘·페이지 메뉴·사이드바 아이콘 피커 등 UI chrome 상태 */
export function useNotePageChrome() {
  const [showDocIconPicker, setShowDocIconPicker] = useState(false);
  const [docIconDraft, setDocIconDraft] = useState('');
  const docIconInputRef = useRef<HTMLInputElement>(null);
  const [sidebarIconPicker, setSidebarIconPicker] = useState<{
    docId: string;
    top: number;
    left: number;
  } | null>(null);
  const [sidebarIconDraft, setSidebarIconDraft] = useState('');
  const sidebarIconInputRef = useRef<HTMLInputElement>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [showPageMenu, setShowPageMenu] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDocIconPicker) return;
    const t = window.setTimeout(() => {
      docIconInputRef.current?.focus();
      docIconInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [showDocIconPicker]);

  useEffect(() => {
    if (!showPageMenu) return;
    const onDown = (e: MouseEvent) => {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) {
        setShowPageMenu(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showPageMenu]);

  useEffect(() => {
    if (!sidebarIconPicker) return;
    const t = window.setTimeout(() => {
      sidebarIconInputRef.current?.focus();
      sidebarIconInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [sidebarIconPicker]);

  return {
    showDocIconPicker,
    setShowDocIconPicker,
    docIconDraft,
    setDocIconDraft,
    docIconInputRef,
    sidebarIconPicker,
    setSidebarIconPicker,
    sidebarIconDraft,
    setSidebarIconDraft,
    sidebarIconInputRef,
    shareLinkCopied,
    setShareLinkCopied,
    togglingPublic,
    setTogglingPublic,
    showPageMenu,
    setShowPageMenu,
    pageMenuRef,
  };
}
