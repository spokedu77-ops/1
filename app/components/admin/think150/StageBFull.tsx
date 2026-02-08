'use client';

import { PAD_COLORS } from '@/app/lib/admin/constants/padGrid';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';

interface StageBFullProps {
  color: PADColor | null;
  imageUrl?: string;
  frame: 'cue' | 'blank' | 'hold';
}

export function StageBFull({ color, imageUrl, frame }: StageBFullProps) {
  const isBlank = frame === 'blank' || frame === 'hold';

  if (isBlank) {
    return <div className="h-full w-full bg-white" />;
  }

  if (!color) return null;

  const hex = PAD_COLORS[color];
  return (
    <div className="relative h-full min-h-[200px] w-full overflow-hidden" style={{ backgroundColor: hex }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
      ) : null}
    </div>
  );
}
