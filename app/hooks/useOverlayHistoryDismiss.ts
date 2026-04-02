'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * 모달/오버레이를 열 때 history에 항목을 쌓고,
 * 브라우저 뒤로가기·Esc에서 먼저 오버레이를 닫도록 맞춥니다.
 */
export function useOverlayHistoryDismiss(
  overlayActive: boolean,
  closeAll: () => void,
  historyKey = 'spokeduOverlay'
) {
  const prevActiveRef = useRef(false);

  useEffect(() => {
    if (overlayActive && !prevActiveRef.current) {
      window.history.pushState({ [historyKey]: true }, '');
    }
    prevActiveRef.current = overlayActive;
  }, [overlayActive, historyKey]);

  useEffect(() => {
    const onPop = () => {
      closeAll();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [closeAll]);

  const dismiss = useCallback(() => {
    const st = window.history.state as Record<string, unknown> | null;
    if (st?.[historyKey]) {
      window.history.back();
    } else {
      closeAll();
    }
  }, [closeAll, historyKey]);

  useEffect(() => {
    if (!overlayActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlayActive, dismiss]);

  return dismiss;
}

/** 저장 성공 등으로 닫을 때: 히스토리에 오버레이 항목이 있으면 뒤로가기로 맞춤 */
export function popOverlayHistoryIfPresent(historyKey: string) {
  if (typeof window === 'undefined') return;
  const st = window.history.state as Record<string, unknown> | null;
  if (st?.[historyKey]) window.history.back();
}
