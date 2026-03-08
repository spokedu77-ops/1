'use client';

import { useCallback, useState } from 'react';

export type ViewId = 'screenplay' | 'roadmap' | 'library' | 'data-center' | 'ai' | 'tools';

/**
 * UI 상태: 현재 뷰, 드로어 열림, 토스트 등.
 */
export function useSpokeduProUI(initialView: ViewId = 'roadmap') {
  const [viewId, setViewId] = useState<ViewId>(initialView);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const switchView = useCallback((id: ViewId) => {
    setViewId(id);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  return {
    viewId,
    switchView,
    drawerOpen,
    openDrawer,
    closeDrawer,
    toastMessage,
    showToast,
  };
}
