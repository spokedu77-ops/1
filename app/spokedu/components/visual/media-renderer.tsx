'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { HomeMediaItem } from '../../data/home-media';
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
  const [useImage, setUseImage] = useState(Boolean(primarySrc));
  const [imgSrc, setImgSrc] = useState(primarySrc ?? '');

  useEffect(() => {
    setUseImage(Boolean(primarySrc));
    setImgSrc(primarySrc ?? '');
  }, [primarySrc]);

  const handleError = () => {
    // A generic field fallback is intentionally not used for marketing cards:
    // it is too pale and reads as an empty panel when a photo URL is stale.
    // Fall back directly to the branded visual so a failed asset can never
    // leave a blank white card behind.
    setUseImage(false);
  };

  if (!useImage || !imgSrc) {
    return (
      <GradientVisual
        media={media}
        className={className}
        showLabel={showLabel}
        intensity={intensity === 'photo' ? 'soft' : intensity}
      />
    );
  }

  const fitClass = objectFit === 'contain' ? 'object-contain' : homePhotoGrade;

  const imageNode = (
    <Image
      src={imgSrc}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={priority ? 92 : 88}
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
