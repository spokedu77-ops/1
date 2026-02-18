'use client';

import { PAD_COLORS } from '@/app/lib/admin/constants/padGrid';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';

interface StageBFullProps {
  color: PADColor | null;
  imageUrl?: string;
  frame: 'cue' | 'blank' | 'hold';
  /** 3·4주차: 이미지 칸에 꽉 채움(object-cover) */
  week?: 1 | 2 | 3 | 4;
}

export function StageBFull({ color, imageUrl, frame, week }: StageBFullProps) {
  const isBlank = frame === 'blank' || frame === 'hold';

  if (isBlank) {
    return <div className="h-full w-full border border-neutral-500/50" />;
  }

  if (!color) return null;

  const hex = PAD_COLORS[color];
  const hasImage = !!imageUrl;
  const objectFit: 'cover' | 'contain' = 'cover';
  return (
    <div
      className={`relative h-full min-h-[200px] w-full overflow-hidden ${hasImage ? 'bg-white' : ''}`}
      style={hasImage ? undefined : { backgroundColor: hex }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit }} />
      ) : (
        <div className="h-full w-full" style={{ backgroundColor: hex }} />
      )}
    </div>
  );
}
