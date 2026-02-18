'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useRouter } from 'next/navigation';

const EDGE_PX = 24;
const TRIGGER_PX = 70;
const SLOPE = 1.5;

export type UseEdgeSwipeBackOptions = {
  enabled: boolean;
  /** SPA 방식(목록/채팅 뷰 전환)일 때 호출. 없으면 router.back() + fallback 사용 */
  onBack?: () => void;
  /** router.back() 실패/딥링크 시 이동할 경로 (onBack 없을 때만 사용) */
  listPath?: string;
  /** 터치 리스너를 붙일 엘리먼트. 없으면 document */
  containerRef?: RefObject<HTMLElement | null>;
};

/**
 * 왼쪽 엣지(20~24px)에서 시작하는 스와이프만 뒤로가기로 인식.
 * 스크롤/가로 스크롤과 충돌 방지. passive:false 로 preventDefault 적용.
 */
export function useEdgeSwipeBack(options: UseEdgeSwipeBackOptions) {
  const { enabled, onBack, listPath, containerRef } = options;
  const router = useRouter();
  const state = useRef({
    tracking: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    fromEdge: false,
  });

  useEffect(() => {
    if (!enabled) return;

    const el = (containerRef?.current ?? document) as Document | HTMLElement;
    if (!el) return;

    const onTouchStart = (e: Event) => {
      const ev = e as TouchEvent;
      if (ev.touches.length !== 1) return;
      const t = ev.touches[0];
      state.current.tracking = true;
      state.current.startX = t.clientX;
      state.current.startY = t.clientY;
      state.current.lastX = t.clientX;
      state.current.lastY = t.clientY;
      state.current.fromEdge = t.clientX <= EDGE_PX;
    };

    const onTouchMove = (e: Event) => {
      const ev = e as TouchEvent;
      if (!state.current.tracking || !state.current.fromEdge) return;
      const t = ev.touches[0];
      const dx = t.clientX - state.current.startX;
      const dy = t.clientY - state.current.startY;
      if (dx > 10 && Math.abs(dx) > Math.abs(dy) * SLOPE) {
        ev.preventDefault();
      }
      state.current.lastX = t.clientX;
      state.current.lastY = t.clientY;
    };

    const onTouchEnd = () => {
      if (!state.current.tracking || !state.current.fromEdge) {
        state.current.tracking = false;
        return;
      }
      const dx = state.current.lastX - state.current.startX;
      const dy = state.current.lastY - state.current.startY;
      const isHorizontal = dx > 0 && Math.abs(dx) > Math.abs(dy) * SLOPE;
      if (isHorizontal && dx >= TRIGGER_PX) {
        if (onBack) {
          onBack();
        } else {
          try {
            router.back();
          } catch {
            if (listPath) router.push(listPath);
          }
        }
      }
      state.current.tracking = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, onBack, listPath, router, containerRef]);
}
