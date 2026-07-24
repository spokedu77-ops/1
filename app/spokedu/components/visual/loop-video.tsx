'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export type LoopVideoSource = {
  src: string;
  type: string;
};

type LoopVideoProps = {
  sources: readonly LoopVideoSource[];
  /** single src fallback when sources empty */
  src?: string | null;
  poster: string | null;
  alt: string;
  className?: string;
  objectPosition?: string;
  /** Hero LCP — poster Image에만 priority */
  posterPriority?: boolean;
  sizes?: string;
};

/**
 * 로컬 muted loop. 뷰포트 안에서만 play, reduced-motion이면 poster 고정.
 * YouTube/외부 스트림 없음.
 */
export function LoopVideo({
  sources,
  src,
  poster,
  alt,
  className = '',
  objectPosition,
  posterPriority = false,
  sizes = '100vw',
}: LoopVideoProps) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const hasSources = sources.length > 0 || Boolean(src);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reducedMotion || failed || !hasSources) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          void el.play().catch(() => {
            /* autoplay blocked — poster remains */
          });
        } else {
          el.pause();
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion, failed, hasSources]);

  const showVideo = hasSources && !failed && !reducedMotion;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-slate-900 ${className}`}>
      {poster ? (
        <Image
          src={poster}
          alt={alt}
          fill
          sizes={sizes}
          priority={posterPriority}
          quality={posterPriority ? 82 : 75}
          className="object-cover"
          style={objectPosition ? { objectPosition } : undefined}
        />
      ) : null}

      {showVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={objectPosition ? { objectPosition } : undefined}
          poster={poster ?? undefined}
          muted
          playsInline
          loop
          preload="none"
          aria-label={alt}
          onError={() => setFailed(true)}
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
          {src && sources.length === 0 ? <source src={src} /> : null}
        </video>
      ) : null}
    </div>
  );
}
