'use client';

import { PAD_COLORS } from '@/app/lib/admin/constants/padGrid';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';
import type { StageCLayout } from '@/app/lib/admin/engines/think150/types';

interface StageCMultiPanelProps {
  slotCount: 1 | 2 | 3;
  slotColors: PADColor[];
  images: string[];
  frame: 'cue' | 'blank' | 'hold';
  layout?: StageCLayout;
  /** 같은 색이 여러 슬롯일 때 구분선 표시 (Week 1) */
  sameColor?: boolean;
  /** 3·4주차: 분할/전체 화면 이미지 칸에 꽉 채움(object-cover) */
  week?: 1 | 2 | 3 | 4;
}

export function StageCMultiPanel({ slotCount, slotColors, images, frame, layout = 'fullscreen', sameColor = false, week }: StageCMultiPanelProps) {
  const isBlank = frame === 'blank' || frame === 'hold';
  const imageFill: 'cover' | 'contain' = 'cover';

  if (isBlank) {
    if (layout === 'vertical' && (slotCount === 2 || slotCount === 3)) {
      const gridClass = slotCount === 2 ? 'grid-rows-2 grid-cols-1' : 'grid-rows-3 grid-cols-1';
      return (
        <div className={`grid h-full min-h-[200px] w-full ${gridClass} gap-2 p-1`}>
          {Array.from({ length: slotCount }, (_, i) => (
            <div key={i} className="rounded-lg border border-neutral-500/50" />
          ))}
        </div>
      );
    }
    if (layout === 'horizontal' && (slotCount === 2 || slotCount === 3)) {
      const gridClass = slotCount === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-3 grid-rows-1';
      return (
        <div className={`grid h-full min-h-[200px] w-full ${gridClass} gap-2 p-1`}>
          {Array.from({ length: slotCount }, (_, i) => (
            <div key={i} className="rounded-lg border border-neutral-500/50" />
          ))}
        </div>
      );
    }
    return <div className="h-full w-full rounded-lg border border-neutral-500/50" />;
  }

  if (layout === 'fullscreen') {
    const color = slotColors[0];
    const img = images[0];
    const hex = color ? PAD_COLORS[color] : '#1a1a1a';
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: hex }}>
        {img ? <img src={img} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: imageFill }} /> : null}
      </div>
    );
  }

  const isVertical = layout === 'vertical';
  const gridClass = isVertical
    ? (slotCount === 2 ? 'grid-rows-2 grid-cols-1' : 'grid-rows-3 grid-cols-1')
    : (slotCount === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-3 grid-rows-1');

  return (
    <div className={`grid h-full min-h-[200px] w-full overflow-hidden rounded-xl ${gridClass} gap-2 p-1`} data-same-color={sameColor}>
      {Array.from({ length: slotCount }).map((_, i) => {
        const color = slotColors[i];
        const img = images[i];
        const hex = color ? PAD_COLORS[color] : '#1a1a1a';

        return (
          <div
            key={i}
            className="relative flex min-h-[100px] items-center justify-center overflow-hidden rounded-lg border border-neutral-500/50"
            style={{ backgroundColor: hex }}
          >
            {img ? (
              <img src={img} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: imageFill }} />
            ) : (
              <div className="h-full w-full" style={{ backgroundColor: hex }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
