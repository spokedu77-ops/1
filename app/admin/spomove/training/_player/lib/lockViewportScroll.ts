import { useEffect } from 'react';

let lockCount = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';

/** 화면 전환 사이에 스크롤이 잠깐 풀리지 않도록 ref-count로 잠근다. */
export function lockViewportScroll(): void {
  if (lockCount === 0) {
    savedHtmlOverflow = document.documentElement.style.overflow;
    savedBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

export function unlockViewportScroll(): void {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.documentElement.style.overflow = savedHtmlOverflow;
    document.body.style.overflow = savedBodyOverflow;
  }
}

/** 포털/플레이어 언마운트 시 ref-count 누수로 스크롤이 막힌 경우 강제 복원 */
export function forceUnlockViewportScroll(): void {
  lockCount = 0;
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

export function useViewportScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lockViewportScroll();
    return () => unlockViewportScroll();
  }, [active]);
}
