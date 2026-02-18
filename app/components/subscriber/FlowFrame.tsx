'use client';

import { useEffect, useRef } from 'react';

/** autoStart 시 flow-ended 미수신 시 강제 onEnd 호출 (탭 종료/크래시 대비). 플레이 최대 ~5분 + 버퍼 */
const FLOW_FAILSAFE_MS = 6 * 60 * 1000;

/**
 * Flow Phase - Next.js Route
 * /flow-phase?weekKey=...
 */
export interface FlowFrameProps {
  weekKey: string;
  onEnd?: () => void;
  /** 구독자 전체 재생 시 30초 브릿지 후 자동 시작 */
  autoStart?: boolean;
  /** Flow 개별 실행 시 Admin처럼 좌측 상단 레벨 선택 UI 노출 */
  showLevelSelector?: boolean;
}

export function FlowFrame({ weekKey, onEnd, autoStart, showLevelSelector }: FlowFrameProps) {
  const params = new URLSearchParams({ weekKey });
  if (autoStart) params.set('autoStart', '1');
  if (showLevelSelector) params.set('showLevelSelector', '1');
  const src = `/flow-phase?${params.toString()}`;
  const onEndCalled = useRef(false);

  useEffect(() => {
    if (!onEnd) return;
    onEndCalled.current = false;
    const expectedOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const handler = (e: MessageEvent) => {
      if (e.origin !== expectedOrigin) return;
      if (e.data?.type === 'flow-ended' && !onEndCalled.current) {
        onEndCalled.current = true;
        onEnd();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onEnd]);

  useEffect(() => {
    if (!autoStart || !onEnd) return;
    onEndCalled.current = false;
    const t = setTimeout(() => {
      if (onEndCalled.current) return;
      onEndCalled.current = true;
      onEnd();
    }, FLOW_FAILSAFE_MS);
    return () => clearTimeout(t);
  }, [autoStart, onEnd, weekKey]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <iframe
        src={src}
        className="h-full w-full border-0"
        title="Flow Phase"
        sandbox="allow-scripts allow-same-origin"
      />
      {onEnd && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <button
            type="button"
            className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            onClick={onEnd}
          >
            Flow 종료
          </button>
        </div>
      )}
    </div>
  );
}
