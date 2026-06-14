'use client';

import { useCallback, useEffect, useId, useRef } from 'react';

export function TrackedVideoIframe({
  src,
  title,
  className,
  onPlaybackStarted,
}: {
  src: string;
  title: string;
  className?: string;
  onPlaybackStarted?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const reportedRef = useRef(false);
  const playerId = useId().replace(/:/g, '');

  const listenForPlayback = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      JSON.stringify({ event: 'listening', id: playerId }),
      'https://www.youtube.com',
    );
    frame.contentWindow.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'addEventListener',
        args: ['onStateChange'],
        id: playerId,
      }),
      'https://www.youtube.com',
    );
  }, [playerId]);

  useEffect(() => {
    reportedRef.current = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      let payload: unknown = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== 'object') return;

      const message = payload as { event?: string; info?: number };
      if (message.event !== 'onStateChange' || message.info !== 1 || reportedRef.current) return;
      reportedRef.current = true;
      onPlaybackStarted?.();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlaybackStarted, src]);

  return (
    <iframe
      ref={iframeRef}
      id={playerId}
      src={src}
      title={title}
      className={className}
      allow="accelerometer; autoplay; clipboard-write; compute-pressure; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      onLoad={listenForPlayback}
    />
  );
}
