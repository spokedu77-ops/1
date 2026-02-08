'use client';

import { PAD_POSITIONS, PAD_COLORS } from '@/app/lib/admin/constants/padGrid';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';

interface StageAQuadProps {
  activeColor: PADColor | null;
  imageUrl?: string;
  frame: 'cue' | 'blank' | 'hold';
}

export function StageAQuad({ activeColor, imageUrl, frame }: StageAQuadProps) {
  const isBlank = frame === 'blank' || frame === 'hold';

  if (isBlank) {
    return <div className="h-full w-full bg-white" />;
  }

  return (
    <div className="grid h-full min-h-[200px] w-full grid-cols-2 grid-rows-[1fr_1fr] gap-2 p-1">
      {PAD_POSITIONS.map((row, ri) =>
        row.map((color, ci) => {
          const isActive = activeColor === color;
          const hex = PAD_COLORS[color];
          return (
            <div
              key={`${ri}-${ci}`}
              className={`relative flex min-h-[100px] items-center justify-center overflow-hidden rounded-lg border border-neutral-400/60 ${isActive ? 'ring-4 ring-green-500 ring-inset' : ''}`}
              style={{ backgroundColor: isActive ? hex : '#FFFFFF' }}
            >
              {isActive &&
                (imageUrl ? (
                  <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full" style={{ backgroundColor: hex }} />
                ))}
            </div>
          );
        })
      )}
    </div>
  );
}
