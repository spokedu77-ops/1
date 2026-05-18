'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type ImagePlaceholderProps = {
  slot: string;
  alt: string;
  title?: string;
  caption?: string;
  src?: string;
  className?: string;
};

export function ImagePlaceholder({ slot, alt, title, caption, src, className }: ImagePlaceholderProps) {
  const fallbackSrc = '/spokedu/placeholders/photo-placeholder.svg';
  const initialSrc = useMemo(() => src ?? fallbackSrc, [src]);
  const [resolvedSrc, setResolvedSrc] = useState(initialSrc);

  useEffect(() => {
    setResolvedSrc(initialSrc);
  }, [initialSrc]);

  return (
    <figure className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${className ?? ''}`}>
      <Image
        src={resolvedSrc}
        alt={alt}
        width={1200}
        height={800}
        className="h-full w-full object-cover"
        onError={() => {
          if (resolvedSrc !== fallbackSrc) {
            setResolvedSrc(fallbackSrc);
          }
        }}
      />
      <figcaption className="absolute inset-x-3 bottom-3 rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-[11px] leading-4 text-slate-700 backdrop-blur">
        <strong className="block text-slate-900">{title ?? '이미지 교체 슬롯'}</strong>
        <span className="block">{caption ?? '실제 사진으로 교체하세요.'}</span>
        <span className="mt-1 block font-mono text-[10px] text-slate-500">slot: {slot}</span>
      </figcaption>
    </figure>
  );
}
