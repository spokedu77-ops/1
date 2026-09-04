import Image from 'next/image';

import { SPOMOVE_PAD_GRID_HEX } from './spomovePadDisplay';
import type { SpomovePadLayoutVariant } from './spomovePadLayout';

type SpomovePadLayoutViewProps = {
  variant: SpomovePadLayoutVariant;
  compact?: boolean;
  dark?: boolean;
  /** 진행 방식·매트 장수 등 — 배치 카드에 붙여 고아 메타 블록을 만들지 않음 */
  meta?: string | null;
};

export function SpomovePadLayoutView({
  variant,
  compact = false,
  dark = false,
  meta = null,
  flush = false,
}: SpomovePadLayoutViewProps & { flush?: boolean }) {
  const [red, yellow, green, blue] = SPOMOVE_PAD_GRID_HEX;
  const borderClass = dark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50';
  const titleClass = dark ? 'text-white' : 'text-slate-950';
  const mutedClass = dark ? 'text-white/55' : 'text-slate-500';
  const metaLine = meta?.trim() || null;
  const frameClass = flush ? '' : `rounded-2xl border p-4 ${borderClass}`;

  if (variant === 'compass') {
    const size = compact ? 'h-32 w-32' : 'h-40 w-40';
    const padClass = compact ? 'h-14 w-14 text-xs' : 'h-16 w-16 text-sm';

    return (
      <div className={frameClass || undefined}>
        {flush ? null : (
          <>
            <p className={`text-sm font-semibold ${titleClass}`}>매트 배치</p>
            <p className={`mt-1 text-xs font-medium ${mutedClass}`}>학생이 화면을 바라보는 기준입니다.</p>
          </>
        )}
        <p className={`text-center text-[11px] font-medium ${mutedClass} ${flush ? '' : 'mt-3'}`}>화면 ↑</p>
        <div className="mt-4 flex justify-center">
          <div
            className={`relative ${size}`}
            aria-label="다이아몬드 패드 배치: 빨강 위, 노랑 왼쪽, 초록 오른쪽, 파랑 아래"
          >
            <div className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: red }}>빨</div>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: yellow }}>노</div>
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: green }}>초</div>
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-xl font-black text-white shadow-sm ${padClass} grid place-items-center`} style={{ background: blue }}>파</div>
          </div>
        </div>
        <p className={`mt-2 text-center text-xs font-medium ${mutedClass}`}>빨강 앞 · 노랑 왼쪽 · 초록 오른쪽 · 파랑 뒤</p>
        <p className={`mt-1 text-center text-[11px] font-medium ${mutedClass}`}>학생 위치</p>
        {metaLine ? <p className={`mt-3 text-xs font-semibold ${mutedClass}`}>{metaLine}</p> : null}
      </div>
    );
  }

  const boardClass = compact
    ? 'w-[148px] [@media(max-height:950px)]:w-[112px]'
    : 'w-[200px] [@media(max-height:950px)]:w-[144px]';

  return (
    <div className={frameClass ? `${frameClass} ${compact ? 'p-3 [@media(max-height:950px)]:py-2.5' : ''}` : undefined}>
      {flush ? null : (
        <>
          <p className={`text-sm font-semibold ${titleClass}`}>매트 배치</p>
          <p className={`mt-1 text-xs font-medium ${mutedClass}`}>학생이 화면을 바라보는 기준입니다.</p>
        </>
      )}
      <p className={`text-center text-[11px] font-medium ${mutedClass} ${flush ? '' : 'mt-3 [@media(max-height:950px)]:mt-2'}`}>화면 ↑</p>
      <div className="mt-3 flex justify-center [@media(max-height:950px)]:mt-2">
        <div
          className={`relative aspect-square overflow-hidden rounded-xl shadow-sm ${boardClass}`}
          aria-label="패드 배치: 빨강, 노랑, 초록, 파랑"
        >
          <Image
            src="/images/spokedu/brand/spomat-layout.png"
            alt="빨강, 노랑, 초록, 파랑 순서로 배치된 스포매트"
            fill
            sizes={compact ? '148px' : '200px'}
            className="object-cover"
          />
        </div>
      </div>
      <p className={`mt-2 text-center text-[11px] font-medium [@media(max-height:950px)]:mt-1.5 ${mutedClass}`}>학생 위치</p>
      {metaLine ? <p className={`mt-3 text-xs font-semibold ${mutedClass}`}>{metaLine}</p> : null}
    </div>
  );
}
