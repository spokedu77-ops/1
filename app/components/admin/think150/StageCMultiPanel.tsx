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
}

export function StageCMultiPanel({ slotCount, slotColors, images, frame, layout = 'fullscreen', sameColor = false }: StageCMultiPanelProps) {
  const isBlank = frame === 'blank' || frame === 'hold';

  if (isBlank) {
    return <div className="h-full w-full bg-white" />;
  }

  if (layout === 'fullscreen') {
    const color = slotColors[0];
    const img = images[0];
    const hex = color ? PAD_COLORS[color] : '#1a1a1a';
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: hex }}>
        {img ? <img src={img} alt="" className="absolute inset-0 h-full w-full object-contain" /> : null}
      </div>
    );
  }

  const isVertical = layout === 'vertical';
  const gridClass = isVertical
    ? (slotCount === 2 ? 'grid-rows-2 grid-cols-1' : 'grid-rows-3 grid-cols-1')
    : (slotCount === 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-3 grid-rows-1');

  return (
    <div className={`grid h-full min-h-[200px] w-full overflow-hidden rounded-xl ${gridClass} gap-2 p-1`}>
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
              <img src={img} alt="" className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full" style={{ backgroundColor: hex }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
