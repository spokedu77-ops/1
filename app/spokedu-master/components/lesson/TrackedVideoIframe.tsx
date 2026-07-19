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

function PosterStill({
  posterUrl,
  posterCandidates,
}: {
  posterUrl?: string;
  posterCandidates?: string[];
}) {
  const candidates = useMemo(() => {
    const list = [...(posterCandidates ?? []), ...(posterUrl ? [posterUrl] : [])];
    return Array.from(new Set(list.filter(Boolean)));
  }, [posterCandidates, posterUrl]);
  const [index, setIndex] = useState(0);
  const current = candidates[index];
  const candidatesKey = candidates.join('|');

  useEffect(() => {
    setIndex(0);
  }, [candidatesKey]);

  if (!current) {
    return <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />;
  }

  const advance = () => {
    setIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : prev));
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element -- poster before iframe; avoid optimizer cost on click path
    <img
      src={current}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={advance}
      onLoad={(event) => {
        // YouTube often returns HTTP 200 with a tiny grey stub when maxres is missing.
        const { naturalWidth, naturalHeight } = event.currentTarget;
        if (naturalWidth > 0 && naturalWidth <= 120 && naturalHeight <= 90) advance();
      }}
    />
  );
}

export function TrackedVideoIframe({
  src,
  title,
  className,
  onPlaybackStarted,
  posterUrl,
  posterCandidates,
  deferUntilPlay = false,
}: {
  src: string;
  title: string;
  className?: string;
  onPlaybackStarted?: () => void;
  /** Shown until the user taps play when deferUntilPlay is true. */
  posterUrl?: string;
  /** Prefer high-res first; falls back on load error (YouTube maxres gaps). */
  posterCandidates?: string[];
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
        <PosterStill posterUrl={posterUrl} posterCandidates={posterCandidates} />
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
