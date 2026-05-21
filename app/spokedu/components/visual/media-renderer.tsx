'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { HomeMediaItem } from '../../data/home-media';
import { BrandOverlay } from './brand-overlay';
import { GradientVisual } from './gradient-visual';

type MediaRendererProps = {
  media: HomeMediaItem;
  className?: string;
  showLabel?: boolean;
  /** clear: 실사 그대로(히어로·게이트), soft/bold: 브랜드 오버레이 */
  photoTone?: 'clear' | 'soft' | 'bold';
  intensity?: 'soft' | 'bold';
  priority?: boolean;
  sizes?: string;
  animateZoom?: boolean;
};

function isRemotePhoto(src: string) {
  return src.startsWith('https://');
}

export function MediaRenderer({
  media,
  className = '',
  showLabel = false,
  photoTone,
  intensity = 'bold',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  animateZoom = false,
}: MediaRendererProps) {
  const tone = photoTone ?? (intensity === 'soft' ? 'soft' : 'bold');
  const reducedMotion = useReducedMotion();
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
        <BrandOverlay tone={media.tone} intensity={intensity} />
      </div>
    );
  }

  const remote = isRemotePhoto(imgSrc);
  const imageClass =
    tone === 'clear'
      ? 'object-cover brightness-[1.04] contrast-[1.03] saturate-[1.06]'
      : 'object-cover';

  const imageNode = (
    <Image
      src={imgSrc}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={remote ? 82 : 85}
      unoptimized={remote}
      className={imageClass}
      onError={() => setUseImage(false)}
    />
  );

  return (
    <figure className={`relative h-full w-full overflow-hidden bg-slate-100 ${className}`}>
      {animateZoom && !reducedMotion && tone !== 'clear' ? (
        <motion.div
          className="absolute inset-0"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        >
          {imageNode}
        </motion.div>
      ) : (
        imageNode
      )}
      {tone === 'clear' ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-slate-950/25 to-transparent"
          aria-hidden
        />
      ) : (
        <BrandOverlay tone={media.tone} intensity={tone === 'soft' ? 'soft' : 'bold'} />
      )}
      {showLabel && media.label ? (
        <figcaption className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {media.label}
        </figcaption>
      ) : null}
    </figure>
  );
}
