'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SportsArenaSessionConfig = {
  stageDuration: number;
  side: boolean;
  jump: boolean;
  duck: boolean;
  bonus: boolean;
};

type Props = { config: SportsArenaSessionConfig; durationSec: number; onComplete: () => void; onExit: () => void };
const UNITY_SESSION_URL = '/spomove/dive/unity/theme2/index.html';

export default function UnityDiveThemeClient({ config, durationSec, onComplete, onExit }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const startedRef = useRef(false);
  const [active, setActive] = useState(true);

  const postToUnity = useCallback((type: 'SPOMOVE_SESSION_CONFIG' | 'SPOMOVE_SESSION_START' | 'SPOMOVE_SESSION_STOP', extra?: object) => {
    iframeRef.current?.contentWindow?.postMessage({ type, ...extra }, window.location.origin);
  }, []);

  const finish = useCallback((kind: 'complete' | 'exit') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    postToUnity('SPOMOVE_SESSION_STOP');
    setActive(false);
    if (kind === 'complete') onComplete(); else onExit();
  }, [onComplete, onExit, postToUnity]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow || event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== 'SPOMOVE_UNITY_READY' || finishedRef.current || startedRef.current) return;
      startedRef.current = true;
      postToUnity('SPOMOVE_SESSION_CONFIG', { config });
      postToUnity('SPOMOVE_SESSION_START');
      timerRef.current = window.setTimeout(() => finish('complete'), Math.max(1, durationSec) * 1000);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (!finishedRef.current) postToUnity('SPOMOVE_SESSION_STOP');
    };
  }, [config, durationSec, finish, postToUnity]);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {active ? <iframe ref={iframeRef} src={UNITY_SESSION_URL} title="SPORTS ARENA" allowFullScreen style={{ width: '100%', height: '100%', border: 0, background: '#000', display: 'block' }} /> : null}
      {active ? <button type="button" onClick={() => finish('exit')} style={{ position: 'absolute', top: 10, right: 14, zIndex: 40, minWidth: 82, padding: '0.5rem 0.75rem', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '0.7rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}>✕ 나가기</button> : null}
    </div>
  );
}
