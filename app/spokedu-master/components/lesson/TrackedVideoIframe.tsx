'use client';

import { Play } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

function withAutoplay(src: string): string {
  try {
    const url = new URL(src);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('mute', '1');
    return url.toString();
  } catch {
    return src
      .replace(/([?&])autoplay=0/, '$1autoplay=1')
      .replace(/([?&])mute=0/, '$1mute=1');
  }
}

export function TrackedVideoIframe({
  src,
  title,
  className,
  onPlaybackStarted,
  posterUrl,
  deferUntilPlay = false,
}: {
  src: string;
  title: string;
  className?: string;
  onPlaybackStarted?: () => void;
  /** Shown until the user taps play when deferUntilPlay is true. */
  posterUrl?: string;
  /** Do not mount the YouTube iframe until the user taps play (low-end friendly). */
  deferUntilPlay?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const reportedRef = useRef(false);
  const playerId = useId().replace(/:/g, '');
  const [active, setActive] = useState(!deferUntilPlay);

  const playSrc = useMemo(() => (deferUntilPlay ? withAutoplay(src) : src), [deferUntilPlay, src]);

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
  }, [onPlaybackStarted, playSrc]);

  useEffect(() => {
    setActive(!deferUntilPlay);
  }, [deferUntilPlay, src]);

  if (!active) {
    return (
      <button
        type="button"
        className={`relative grid place-items-center overflow-hidden bg-slate-950 ${className ?? ''}`.trim()}
        onClick={() => setActive(true)}
        aria-label={`${title} 재생`}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- poster before iframe; avoid optimizer cost on click path
          <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
        )}
        <span className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-white/95 text-[var(--spm-acc)] shadow-lg ring-4 ring-white/30">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
      </button>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      id={playerId}
      src={playSrc}
      title={title}
      className={className}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      onLoad={listenForPlayback}
    />
  );
}
