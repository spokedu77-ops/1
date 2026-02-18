'use client';

import { PAD_POSITIONS, PAD_COLORS } from '@/app/lib/admin/constants/padGrid';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';

interface StageAQuadProps {
  activeColor: PADColor | null;
  imageUrl?: string;
  frame: 'cue' | 'blank' | 'hold';
  /** 3·4주차: blank 시 검은 화면+테두리, cue 시 이미지 칸에 꽉 채움(object-cover) */
  week?: 1 | 2 | 3 | 4;
}

export function StageAQuad({ activeColor, imageUrl, frame, week }: StageAQuadProps) {
  const isBlank = frame === 'blank' || frame === 'hold';
  const isImageWeek = week === 3 || week === 4;
  const blankBg = isBlank && isImageWeek ? '#0a0a0a' : isBlank ? 'transparent' : undefined;
  const objectFit: 'cover' | 'contain' = 'cover';

  return (
    <div className="grid h-full min-h-[200px] w-full grid-cols-2 grid-rows-[1fr_1fr] gap-2 p-1">
      {PAD_POSITIONS.map((row, ri) =>
        row.map((color, ci) => {
          const isActive = !isBlank && activeColor === color;
          const hex = PAD_COLORS[color];
          const cellBg = isActive ? hex : isBlank ? blankBg : 'rgba(255,255,255,0.15)';
          return (
            <div
              key={`${ri}-${ci}`}
              className={`relative flex min-h-[100px] items-center justify-center overflow-hidden rounded-lg border border-neutral-400/60 ${isActive ? 'ring-4 ring-green-500 ring-inset' : ''}`}
              style={{ backgroundColor: cellBg }}
            >
              {isActive &&
                (imageUrl ? (
                  <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit }} />
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
