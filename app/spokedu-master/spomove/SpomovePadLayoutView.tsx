import Image from 'next/image';

import type { SpomovePadLayoutVariant } from './spomovePadLayout';

type SpomovePadLayoutViewProps = {
  variant: SpomovePadLayoutVariant;
  compact?: boolean;
  dark?: boolean;
};

export function SpomovePadLayoutView({
  variant,
  compact = false,
  dark = false,
  flush = false,
}: SpomovePadLayoutViewProps & { flush?: boolean }) {
  const borderClass = dark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50';
  const titleClass = dark ? 'text-white' : 'text-slate-950';
  const mutedClass = dark ? 'text-white/55' : 'text-slate-500';
  const frameClass = flush ? '' : `rounded-2xl border p-4 ${borderClass}`;

  const boardClass = compact
    ? 'w-[148px] [@media(max-height:950px)]:w-[112px]'
    : 'w-[200px] [@media(max-height:950px)]:w-[144px]';
  const isCompass = variant === 'compass';

  return (
    <div className={frameClass ? `${frameClass} ${compact ? 'p-3 [@media(max-height:950px)]:py-2.5' : ''}` : undefined}>
      {flush ? null : (
        <>
          <p className={`text-sm font-semibold ${titleClass}`}>매트 배치</p>
        </>
      )}
      <p className={`text-center text-[11px] font-medium ${mutedClass} ${flush ? '' : 'mt-3 [@media(max-height:950px)]:mt-2'}`}>화면 ↑</p>
      <div className="mt-3 flex justify-center [@media(max-height:950px)]:mt-2">
        <div
          className={`relative aspect-square ${boardClass}`}
          aria-label={isCompass
            ? 'SPOMAT 네 장 다이아몬드 배치: 빨강 위, 초록 왼쪽, 노랑 오른쪽, 파랑 아래'
            : 'SPOMAT 네 장 정사각형 배치: 위 빨강과 노랑, 아래 초록과 파랑'}
        >
          <Image
            src={isCompass
              ? '/images/spokedu/brand/spomat-diamond-cutout.png'
              : '/images/spokedu/brand/spomat-layout.png'}
            alt={isCompass
              ? '다이아몬드 형태로 놓인 빨강, 초록, 노랑, 파랑 매트 네 장'
              : '정사각형 2×2 형태로 놓인 빨강, 노랑, 초록, 파랑 매트 네 장'}
            fill
            sizes={compact ? '148px' : '200px'}
            loading="eager"
            className={isCompass ? 'object-contain' : 'object-cover'}
          />
        </div>
      </div>
    </div>
  );
}
