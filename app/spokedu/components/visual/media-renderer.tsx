'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { HomeMediaItem } from '../../data/home-media';
import { SPOKEDU_FALLBACK_FIELD } from '../../data/images';
import { homePhotoGrade } from '../../lib/ui-classes';
import { BrandOverlay } from './brand-overlay';
import { GradientVisual } from './gradient-visual';

type MediaRendererProps = {
  media: HomeMediaItem;
  className?: string;
  showLabel?: boolean;
  intensity?: 'soft' | 'bold' | 'photo';
  priority?: boolean;
  sizes?: string;
  animateZoom?: boolean;
  /** Home 등: 로드 실패 시 gradient/SVG placeholder 대신 빈 실사 영역 */
  strictPhoto?: boolean;
  objectFit?: 'cover' | 'contain';
};

function resolveFallback(media: HomeMediaItem): string {
  return media.fallbackSrc ?? SPOKEDU_FALLBACK_FIELD;
}

export function MediaRenderer({
  media,
  className = '',
  showLabel = false,
  intensity = 'bold',
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  animateZoom = false,
  strictPhoto = false,
  objectFit = 'cover',
}: MediaRendererProps) {
  const reducedMotion = useReducedMotion();
  const primarySrc = media.src;
  const fallbackSrc = resolveFallback(media);
  const [useImage, setUseImage] = useState(Boolean(primarySrc));
  const [imgSrc, setImgSrc] = useState(primarySrc ?? '');

  useEffect(() => {
    setUseImage(Boolean(primarySrc));
    setImgSrc(primarySrc ?? '');
  }, [primarySrc]);

  const handleError = () => {
    if (imgSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      return;
    }
    if (!strictPhoto) {
      setUseImage(false);
    }
  };

  if (!useImage || !imgSrc) {
    if (strictPhoto) {
      return null;
    }
    return (
      <GradientVisual
        media={media}
        className={className}
        showLabel={showLabel}
        intensity={intensity === 'photo' ? 'soft' : intensity}
      />
    );
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

  const isLocalSpokedu = imgSrc.startsWith('/images/spokedu/');
  const fitClass = objectFit === 'contain' ? 'object-contain' : homePhotoGrade;

  const imageNode = (
    <Image
      src={imgSrc}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isLocalSpokedu}
      className={intensity === 'photo' ? fitClass : 'object-cover'}
      style={objectFit === 'cover' && media.objectPosition ? { objectPosition: media.objectPosition } : undefined}
      onError={handleError}
    />
  );

  return (
    <div className={`relative h-full w-full overflow-hidden bg-slate-200 ${className}`}>
      {animateZoom && !reducedMotion ? (
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
      <BrandOverlay tone={media.tone} intensity={intensity} />
      {showLabel && media.label ? (
        <figcaption className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {media.label}
        </figcaption>
      ) : null}
    </div>
  );
}
