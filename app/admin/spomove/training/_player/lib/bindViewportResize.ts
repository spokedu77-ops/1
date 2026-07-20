/**
 * play 영역·전체화면·iOS visualViewport 변화에 맞춰 onResize를 호출한다.
 * window.resize만 들으면 fullscreen / 부모 레이아웃 / 주소창 토글에서 캔버스가 어긋날 수 있다.
 */
export function bindViewportResize(
  target: Element | null,
  onResize: () => void,
): () => void {
  const run = () => {
    onResize();
  };

  window.addEventListener('resize', run);
  window.visualViewport?.addEventListener('resize', run);
  document.addEventListener('fullscreenchange', run);

  let ro: ResizeObserver | null = null;
  if (target && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(run);
    ro.observe(target);
  }

  const raf = requestAnimationFrame(run);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', run);
    window.visualViewport?.removeEventListener('resize', run);
    document.removeEventListener('fullscreenchange', run);
    ro?.disconnect();
  };
}
