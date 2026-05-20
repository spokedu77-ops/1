'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { HomeMediaItem } from '../../data/home-media';
import { GradientVisual } from './gradient-visual';

type MediaRendererProps = {
  media: HomeMediaItem;
  className?: string;
  showLabel?: boolean;
  intensity?: 'soft' | 'bold';
  priority?: boolean;
  sizes?: string;
};

export function MediaRenderer({
  media,
  className = '',
  showLabel = false,
  intensity = 'bold',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
}: MediaRendererProps) {
  const [useImage, setUseImage] = useState(Boolean(media.src));
  const [imgSrc, setImgSrc] = useState(media.src);

  useEffect(() => {
    setUseImage(Boolean(media.src));
    setImgSrc(media.src);
  }, [media.src]);

  if (!useImage || !imgSrc) {
    return <GradientVisual media={media} className={className} showLabel={showLabel} intensity={intensity} />;
  }

  if (media.type === 'video') {
    return (
      <div className={`relative h-full w-full overflow-hidden bg-slate-900 ${className}`}>
        <video
          className="h-full w-full object-cover"
          src={imgSrc}
          poster={media.poster ?? undefined}
          muted
          playsInline
          loop
          autoPlay
          aria-label={media.alt}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
      </div>
    );
  }

  return (
    <figure className={`relative h-full w-full overflow-hidden bg-slate-900 ${className}`}>
      <Image
        src={imgSrc}
        alt={media.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        onError={() => setUseImage(false)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
      {showLabel && media.label ? (
        <figcaption className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {media.label}
        </figcaption>
      ) : null}
    </figure>
  );
}
