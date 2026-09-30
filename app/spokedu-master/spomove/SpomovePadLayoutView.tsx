import Image from 'next/image';

import type { SpomovePadLayoutVariant } from './spomovePadLayout';

type SpomovePadLayoutViewProps = {
  variant: SpomovePadLayoutVariant;
  compact?: boolean;
  dark?: boolean;
};

export function SpomovePadLayoutView({
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
          aria-label="SPOMAT 실물 매트 배치: 빨강 위, 초록 왼쪽, 노랑 오른쪽, 파랑 아래"
        >
          <Image
            src="/images/spokedu/brand/spomat-diamond-cutout.png"
            alt="배경이 제거된 빨강, 초록, 노랑, 파랑 SPOMAT 실물 매트"
            fill
            sizes={compact ? '148px' : '200px'}
            loading="eager"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
