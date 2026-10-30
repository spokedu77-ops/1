import Image from 'next/image';
import {
  SPOMOVE_PUBLIC_COLOR_REACTION,
  SPOMOVE_PUBLIC_SPOMAT_PRODUCT,
} from '../data/sponsorship-public-assets';

const TARGET_CELLS = [
  { n: '1', className: 'bg-rose-500' },
  { n: '2', className: 'bg-amber-400' },
  { n: '3', className: 'bg-emerald-500' },
  { n: '4', className: 'bg-blue-600' },
] as const;

/** 4색 타깃 UI — Tailwind 고채도 + 흰색 숫자 (hex 인라인 박스 대체) */
export function SpomoveTargetChips({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 rounded-2xl bg-slate-900/80 p-3 ${className}`.trim()}
      aria-hidden
    >
      {TARGET_CELLS.map(({ n, className: cellBg }) => (
        <div
          key={n}
          className={`flex items-center justify-center rounded-xl shadow-sm ${cellBg} ${
            compact ? 'aspect-square min-h-[3.25rem]' : 'aspect-[1.45] min-h-[4rem]'
          }`}
        >
          <span className="text-2xl font-bold text-white">{n}</span>
        </div>
      ))}
    </div>
  );
}

/** 실제 SPOMAT·색상반응 현장/제품 컷 */
export function SpomoveMatVisual({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-2'} ${className}`.trim()}>
      <div className={`relative overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/10 ${compact ? 'aspect-[4/3]' : 'aspect-[4/3] min-h-[140px]'}`}>
        <Image
          src={SPOMOVE_PUBLIC_SPOMAT_PRODUCT.src}
          alt={SPOMOVE_PUBLIC_SPOMAT_PRODUCT.alt}
          fill
          className="object-contain p-2"
          sizes={compact ? '280px' : '(max-width: 1024px) 45vw, 240px'}
        />
      </div>
      {!compact ? (
        <div className="relative aspect-[4/3] min-h-[140px] overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/10">
          <Image
            src={SPOMOVE_PUBLIC_COLOR_REACTION.src}
            alt={SPOMOVE_PUBLIC_COLOR_REACTION.alt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 45vw, 240px"
          />
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated 이름 호환 — product=실사, targets=4색 칩, both=히어로용 스택 */
export function SpomoveSignalGrid({
  compact = false,
  className = '',
  variant = 'targets',
}: {
  compact?: boolean;
  className?: string;
  variant?: 'targets' | 'product' | 'both';
}) {
  if (variant === 'product') {
    return <SpomoveMatVisual compact={compact} className={className} />;
  }
  if (variant === 'both') {
    return (
      <div className={`space-y-3 ${className}`.trim()}>
        <SpomoveMatVisual compact={compact} />
        <SpomoveTargetChips compact />
      </div>
    );
  }
  return <SpomoveTargetChips compact={compact} className={className} />;
}
